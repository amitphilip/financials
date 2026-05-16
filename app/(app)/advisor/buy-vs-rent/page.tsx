import { BuyVsRentAdvisor } from "./buy-vs-rent";

export const metadata = { title: "House Ownership vs Rent · Financials" };

export default function BuyVsRentPage() {
  return (
    <main>
      <div className="border-b px-4 py-3 text-center">
        <h1 className="text-sm font-semibold tracking-tight">House Ownership vs Rent</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Buy vs rent + invest analysis
        </p>
      </div>
      <BuyVsRentAdvisor />
    </main>
  );
}
