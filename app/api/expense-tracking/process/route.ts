import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";

export const maxDuration = 300;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type ProcessedFile = {
  fileId: string;
  fileName: string;
  transactions: RawTransaction[];
  dateFrom: string;
  dateTo: string;
  rowCount: number;
  accountInfo: string;
};

export type RawTransaction = {
  date: string;
  description: string;
  rawDescription: string;
  amount: number;
  category: string;
  isTransfer: boolean;
};

const PARSE_PROMPT = `You are a bank statement parser for a personal finance app.

Parse this bank statement and extract every transaction. Return valid JSON ONLY — no markdown, no commentary.

CATEGORIES (pick the single best fit):
- mortgage: Home loan repayments
- rent: Rent to a landlord
- utilities: Power, gas, water, internet, phone plans
- groceries: Supermarkets (Countdown, New World, Pak'nSave, Woolworths, Costco, Four Square)
- dining: Restaurants, cafes, takeaways, Uber Eats, DoorDash, Menulog
- transport: Fuel, parking, public transport (Snapper/Orca), Uber/Bolt, tolls, WoF/rego, vehicle costs
- shopping: Retail stores, online shopping (Amazon, Trade Me, TheMarket), clothing, electronics
- entertainment: Streaming (Netflix, Spotify, Disney+), movies, events, gaming, sport memberships
- healthcare: Doctor, dentist, pharmacy, hospital, gym membership, health insurance
- insurance: Vehicle, house, contents, life insurance (not health)
- education: School/childcare fees, courses, books, stationery
- tax: IRD, ACC levies, GST payments
- savings: Transfers to savings accounts or term deposits (own accounts)
- investments: Shares (Sharesies, Hatch), managed funds, extra KiwiSaver contributions
- income: Salary, wages, benefits, dividends, interest earned, tax refunds — always a POSITIVE credit
- transfer: Account-to-account between the SAME PERSON's own accounts
- other: Anything that doesn't fit above

TRANSFER DETECTION (set isTransfer: true for any of these):
1. Description contains: "transfer", "trf", "acc to acc", "a/c to a/c", "internal", "move to", "own account"
2. References own account numbers (e.g. "To ASB Savings 0012345678", "From Cheque 12-3456-7890123-00")
3. Round-number movements to/from accounts with "savings", "invest", "term" in the description
4. Matching debit/credit pairs on the same day for the same amount — likely same-person transfers

AMOUNT CONVENTION:
- Expenses / money leaving the account = negative (e.g. -45.00)
- Income / money entering the account = positive (e.g. +2800.00)
- Infer sign from column headers (Debit/Credit, Withdrawal/Deposit) or the CSV format

For each transaction return exactly:
{
  "date": "YYYY-MM-DD",
  "description": "Clean merchant or payee name (strip reference numbers, card suffixes, excess whitespace)",
  "rawDescription": "Exact original description from the file",
  "amount": -45.00,
  "category": "groceries",
  "isTransfer": false
}

Full response format (JSON only):
{
  "transactions": [...],
  "dateRange": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" },
  "accountInfo": "Brief account description, e.g. 'ASB Streamline ending 1234' or leave empty string"
}`;

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  const send = (data: object) =>
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

  // Process async — the SSE stream keeps the connection alive
  (async () => {
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    try {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        await send({ error: "No file provided" });
        return;
      }

      await send({ stage: "Reading file…" });

      const fileName = file.name;
      const isXlsx = /\.xlsx?$/i.test(fileName);
      let csvContent: string;

      if (isXlsx) {
        const XLSX = await import("xlsx");
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
        const sheetName = workbook.SheetNames[0];
        csvContent = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
      } else {
        csvContent = await file.text();
      }

      // Split CSV into chunks of 200 data rows so output never exceeds token limits
      const CHUNK_SIZE = 200;
      const csvLines = csvContent.split("\n");
      const header = csvLines[0] ?? "";
      const dataLines = csvLines.slice(1).filter((l) => l.trim() !== "");
      const chunks =
        dataLines.length === 0
          ? [csvContent]
          : Array.from(
              { length: Math.ceil(dataLines.length / CHUNK_SIZE) },
              (_, i) =>
                [header, ...dataLines.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)].join("\n")
            );

      await send({
        stage:
          chunks.length === 1
            ? "Analysing transactions…"
            : `Processing ${chunks.length} batches…`,
      });

      // Heartbeat every 5s to keep the SSE connection alive during Claude calls
      heartbeat = setInterval(() => send({ heartbeat: true }), 5000);

      const allTransactions: RawTransaction[] = [];
      let dateFrom = "";
      let dateTo = "";
      let accountInfo = "";

      for (let i = 0; i < chunks.length; i++) {
        if (chunks.length > 1) {
          await send({ stage: `Batch ${i + 1} of ${chunks.length}…` });
        }

        const response = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 16000,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: PARSE_PROMPT },
                { type: "text", text: `\n\nBank statement CSV:\n\n${chunks[i]}` },
              ],
            },
          ],
        });

        if (response.stop_reason === "max_tokens") {
          throw new Error(
            `Batch ${i + 1} still exceeded the token limit — the file may have unusually wide rows.`
          );
        }

        const textBlock = response.content.find((c) => c.type === "text");
        if (!textBlock || textBlock.type !== "text") {
          throw new Error(`No response from Claude for batch ${i + 1}`);
        }

        const raw = textBlock.text
          .trim()
          .replace(/^```json\s*/i, "")
          .replace(/\s*```$/i, "");

        const parsed = JSON.parse(raw) as {
          transactions: RawTransaction[];
          dateRange: { from: string; to: string };
          accountInfo: string;
        };

        allTransactions.push(...(parsed.transactions ?? []));

        const from = parsed.dateRange?.from ?? "";
        const to = parsed.dateRange?.to ?? "";
        if (from && (!dateFrom || from < dateFrom)) dateFrom = from;
        if (to && (!dateTo || to > dateTo)) dateTo = to;
        if (!accountInfo && parsed.accountInfo) accountInfo = parsed.accountInfo;
      }

      clearInterval(heartbeat);
      heartbeat = undefined;

      const result: ProcessedFile = {
        fileId: crypto.randomUUID(),
        fileName,
        transactions: allTransactions,
        dateFrom,
        dateTo,
        rowCount: allTransactions.length,
        accountInfo,
      };

      await send({ done: true, result });
    } catch (error) {
      if (heartbeat) clearInterval(heartbeat);
      console.error("Expense tracking process error:", error);
      const message = error instanceof Error ? error.message : "Failed to process file";
      await send({ error: message });
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
