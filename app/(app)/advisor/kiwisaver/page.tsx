import { KiwisaverCalculator } from "./kiwisaver-calculator";

export const metadata = { title: "KiwiSaver Projection · Financials" };

export default function KiwisaverPage() {
  return (
    <main>
      <div className="border-b px-4 py-3 text-center">
        <h1 className="text-sm font-semibold tracking-tight">KiwiSaver Projection</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          High growth fund · AI-powered rate · forward forecast
        </p>
      </div>
      <KiwisaverCalculator />
    </main>
  );
}
