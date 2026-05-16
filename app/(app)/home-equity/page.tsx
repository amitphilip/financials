import { HomeEquityCalculator } from "./home-equity-calculator";

export const metadata = { title: "Home Equity · Financials" };

export default function HomeEquityPage() {
  return (
    <main>
      <div className="border-b px-4 py-3 text-center">
        <h1 className="text-sm font-semibold tracking-tight">Home Equity</h1>
      </div>
      <HomeEquityCalculator />
    </main>
  );
}
