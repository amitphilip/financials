import { NextRequest, NextResponse } from "next/server";
import Anthropic, { toFile } from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";

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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

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

    // Upload to Claude Files API
    const uploadName = fileName.replace(/\.xlsx?$/i, ".csv");
    const csvBytes = Buffer.from(csvContent, "utf-8");

    const uploadedFile = await (client.beta.files as any).upload({
      file: await toFile(csvBytes, uploadName, { type: "text/plain" }),
    });

    // Parse and categorise with Claude
    const response = await (client.messages as any).create({
      model: "claude-sonnet-4-6",
      max_tokens: 8096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "file", file_id: uploadedFile.id },
            },
            { type: "text", text: PARSE_PROMPT },
          ],
        },
      ],
      betas: ["files-api-2025-04-14"],
    });

    const textBlock = response.content.find((c: { type: string }) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from Claude");
    }

    const raw = (textBlock.text as string)
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/\s*```$/i, "");

    const parsed = JSON.parse(raw) as {
      transactions: RawTransaction[];
      dateRange: { from: string; to: string };
      accountInfo: string;
    };

    const result: ProcessedFile = {
      fileId: uploadedFile.id as string,
      fileName,
      transactions: parsed.transactions ?? [],
      dateFrom: parsed.dateRange?.from ?? "",
      dateTo: parsed.dateRange?.to ?? "",
      rowCount: (parsed.transactions ?? []).length,
      accountInfo: parsed.accountInfo ?? "",
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Expense tracking process error:", error);
    return NextResponse.json({ error: "Failed to process file" }, { status: 500 });
  }
}
