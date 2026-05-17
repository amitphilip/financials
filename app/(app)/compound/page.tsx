import { CompoundCalculator } from "./compound-calculator";

export const metadata = { title: "Compound Calculator · Financials" };

export default function CompoundPage() {
  return (
    <main>
      <div className="border-b px-4 py-3 text-center">
        <h1 className="text-sm font-semibold tracking-tight">Compound Calculator</h1>
      </div>
      <CompoundCalculator />
    </main>
  );
}
