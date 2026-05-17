import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const CURRENT_YEAR = new Date().getFullYear();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startYear = searchParams.get("startYear");
  const birthYear = searchParams.get("birthYear");

  if (!startYear) {
    return NextResponse.json({ error: "Missing startYear parameter" }, { status: 400 });
  }

  const sy = parseInt(startYear, 10);
  const by = birthYear ? parseInt(birthYear, 10) : null;

  if (isNaN(sy) || sy >= CURRENT_YEAR) {
    return NextResponse.json({ error: "Invalid startYear" }, { status: 400 });
  }

  const currentAge = by ? CURRENT_YEAR - by : null;
  const yearsTo65 = by ? Math.max(0, by + 65 - CURRENT_YEAR) : null;
  const yearsTo67 = by ? Math.max(0, by + 67 - CURRENT_YEAR) : null;
  const retirementContext =
    currentAge !== null && yearsTo65 !== null && yearsTo67 !== null
      ? `The user is currently ${currentAge} years old. They will reach NZ KiwiSaver eligibility age 65 in ${yearsTo65 > 0 ? yearsTo65 + " years (" + (CURRENT_YEAR + yearsTo65) + ")" : "already eligible"}${yearsTo67 !== null ? `, and age 67 in ${yearsTo67 > 0 ? yearsTo67 + " years (" + (CURRENT_YEAR + yearsTo67) + ")" : "already eligible"}` : ""}. Factor in this retirement timeline in your note.`
      : "";

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      tools: [{ type: "web_search_20250305" as const, name: "web_search" }],
      system: [
        "You are a New Zealand financial data assistant with web search access.",
        "When asked about KiwiSaver high growth fund returns, search for accurate historical data from NZ providers (e.g. Simplicity, Fisher Funds, Milford, SuperLife, Booster, AMP).",
        "Provide the average annual return across major NZ KiwiSaver high growth funds for the specified period.",
        `The current year is ${CURRENT_YEAR}. Only use data up to the end of ${CURRENT_YEAR - 1} or the most recently available full year.`,
        retirementContext,
        "Respond in exactly this format — two lines, nothing else:",
        "RATE: <decimal number>",
        "NOTE: <one sentence explaining the period used, which funds/index was referenced, any caveats, and if age data was provided mention the retirement timeline>",
        "Example:",
        "RATE: 11.2",
        "NOTE: Average annual return across major NZ KiwiSaver high growth funds (Simplicity, Milford, Fisher Funds) from 2015 to 2024; you have approx 20 years to KiwiSaver eligibility at 65.",
      ].join("\n"),
      messages: [
        {
          role: "user",
          content: `What was the average annual return for New Zealand KiwiSaver high growth funds from ${sy} to ${CURRENT_YEAR}?${retirementContext ? " " + retirementContext : ""}`,
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

    const note = noteMatch
      ? noteMatch[1].trim()
      : `NZ KiwiSaver high growth avg annual return ${sy}–${CURRENT_YEAR - 1}`;

    return NextResponse.json({ rate, note });
  } catch (error) {
    console.error("KiwiSaver rate lookup failed:", error);
    return NextResponse.json({ error: "Could not fetch rate" }, { status: 500 });
  }
}
