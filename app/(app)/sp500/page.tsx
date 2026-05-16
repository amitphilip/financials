import { SP500Calculator } from "./sp500-calculator";

export const metadata = { title: "S&P 500 · Financials" };

export default function SP500Page() {
  return (
    <main>
      <div className="border-b px-4 py-3 text-center">
        <h1 className="text-sm font-semibold tracking-tight">S&amp;P 500</h1>
      </div>
      <SP500Calculator />
    </main>
  );
}
