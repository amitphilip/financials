import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const CURRENT_YEAR = new Date().getFullYear();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startYear = searchParams.get("startYear");
  const endYear = searchParams.get("endYear");

  if (!startYear || !endYear) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const sy = parseInt(startYear, 10);
  const ey = parseInt(endYear, 10);

  if (isNaN(sy) || isNaN(ey) || ey <= sy) {
    return NextResponse.json({ error: "Invalid year range" }, { status: 400 });
  }

  const effectiveEnd = Math.min(ey, CURRENT_YEAR);

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      tools: [{ type: "web_search_20250305" as const, name: "web_search" }],
      system: [
        "You are a financial data assistant with web search access.",
        "When asked about S&P 500 returns, search for accurate historical data.",
        `If the requested end year is beyond ${CURRENT_YEAR}, use ${CURRENT_YEAR} as the effective end year and clearly state this.`,
        "Respond in exactly this format — two lines, nothing else:",
        "RATE: <decimal number>",
        "NOTE: <one sentence explaining the period used, the methodology (total return incl. dividends), and any caveats such as future years being capped>",
        "Example:",
        "RATE: 13.6",
        "NOTE: Average annual total return (dividends reinvested) for the S&P 500 from 2020 to 2024, as 2025–2026 data is not yet fully available.",
      ].join("\n"),
      messages: [
        {
          role: "user",
          content: `What was the average annual total return of the S&P 500 from ${sy} to ${ey}?`,
        },
      ],
    });

    const textBlock = response.content.filter((c) => c.type === "text").pop();
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from model");
    }

    const text = textBlock.text.trim();

    const rateMatch = text.match(/RATE:\s*([\d.]+)/i);
    const noteMatch = text.match(/NOTE:\s*(.+)/i);

    if (!rateMatch) throw new Error("Could not parse RATE from response");

    const rate = parseFloat(rateMatch[1]);
    if (isNaN(rate) || rate < 0 || rate > 60) {
      throw new Error(`Rate out of expected range: ${rateMatch[1]}`);
    }

    const note = noteMatch ? noteMatch[1].trim() : `S&P 500 avg annual return ${sy}–${effectiveEnd}`;

    return NextResponse.json({ rate, note });
  } catch (error) {
    console.error("SP500 rate lookup failed:", error);
    return NextResponse.json({ error: "Could not fetch rate" }, { status: 500 });
  }
}
