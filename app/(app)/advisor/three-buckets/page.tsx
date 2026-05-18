import { ThreeBuckets } from "./three-buckets";

export const metadata = { title: "Three-Bucket Framework · Financials" };

export default function ThreeBucketsPage() {
  return (
    <main>
      <div className="border-b px-4 py-3 text-center">
        <h1 className="text-sm font-semibold tracking-tight">Three-Bucket Framework</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tax · Wealth · Living — split automatically on payday
        </p>
      </div>
      <ThreeBuckets />
    </main>
  );
}
