import { ExpenseTracking } from "./expense-tracking";

export const metadata = { title: "Expense Tracking · Financials" };

export default function ExpenseTrackingPage() {
  return (
    <main>
      <div className="border-b px-4 py-3 text-center">
        <h1 className="text-sm font-semibold tracking-tight">Expense Tracking</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Upload bank statements to see where your money actually goes
        </p>
      </div>
      <ExpenseTracking />
    </main>
  );
}
