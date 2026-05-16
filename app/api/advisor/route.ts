import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type AdvisorReport = {
  verdict: string;
  summary: string;
  insights: string[];
  buyingHighlights: string[];
  rentingHighlights: string[];
  recommendation: string;
};

export type AdvisorRequestBody = {
  propertyName: string;
  purchaseYear: number;
  currentYear: number;
  purchasePrice: number;
  currentValue: number;
  originalLoan: number;
  interestRate: number;
  termYears: number;
  downPayment: number;
  yearsAnalyzed: number;
  // Buying
  buyerFinalEquity: number;
  buyerTotalInterestPaid: number;
  buyerTotalOngoingCosts: number;
  buyerMonthlyAllIn: number;
  // Renting
  weeklyRentAtPurchase: number;
  annualRentIncrease: number;
  sp500Rate: number;
  renterFinalPortfolio: number;
  renterTotalRentPaid: number;
  renterMonthlyAtEnd: number;
  winner: "buying" | "renting" | "neutral";
  winnerDiff: number;
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export async function POST(request: NextRequest) {
  let body: AdvisorRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const winnerLabel =
    body.winner === "buying"
      ? `Buying comes out ahead by ${fmt(body.winnerDiff)}`
      : body.winner === "renting"
        ? `Renting + investing comes out ahead by ${fmt(body.winnerDiff)}`
        : "Both paths produce similar outcomes";

  const prompt = `You are explaining a buy-vs-rent financial comparison to someone in Year 12 — smart but not a finance nerd. Use plain language, short sentences, one or two everyday analogies (like comparing to a coffee habit or a car), and a touch of dry humour. Keep the whole thing brief. Do NOT repeat the raw numbers — they're already on screen.

PROPERTY: ${body.propertyName}
Period: ${body.purchaseYear}–${body.currentYear} (${body.yearsAnalyzed} years)
Purchase price: ${fmt(body.purchasePrice)} → now ${fmt(body.currentValue)}
Loan: ${fmt(body.originalLoan)} at ${body.interestRate}% · Down payment: ${fmt(body.downPayment)}

BUYING: ended with ${fmt(body.buyerFinalEquity)} equity · paid ${fmt(body.buyerTotalInterestPaid)} in interest · ${fmt(body.buyerMonthlyAllIn)}/mo all-in
RENTING: ended with ${fmt(body.renterFinalPortfolio)} portfolio · paid ${fmt(body.renterTotalRentPaid)} in rent · S&P 500 at ${body.sp500Rate}%

RESULT: ${winnerLabel}

Respond with valid JSON only — no markdown, no commentary outside the JSON:
{
  "verdict": "One punchy sentence. Casual, not corporate.",
  "summary": "2–3 sentences max. What actually happened here, in plain English. One analogy allowed.",
  "insights": ["3 short observations — each one sentence, no jargon. Make at least one mildly funny."],
  "buyingHighlights": ["2 genuine upsides of buying in this case — keep it real"],
  "rentingHighlights": ["2 genuine upsides of renting+investing in this case — keep it real"],
  "recommendation": "2 sentences. Honest, balanced. End on something actionable."
}`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from model");
    }

    // Strip any accidental markdown code fences
    const raw = textBlock.text.trim().replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
    const report = JSON.parse(raw) as AdvisorReport;

    return NextResponse.json(report);
  } catch (error) {
    console.error("Advisor analysis failed:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
