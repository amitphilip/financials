import { TextAnimate } from "@/components/ui/text-animate";
import { IncomeCalculator } from "./income-calculator";

export default function IncomePage() {
  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
      <div>
        <TextAnimate animation="blurIn" by="word" once className="text-2xl font-semibold tracking-tight">
          Income calculator
        </TextAnimate>
        <TextAnimate
          animation="blurIn"
          by="word"
          once
          delay={0.15}
          className="mt-1 text-sm text-muted-foreground"
        >
          NZ PAYE, ACC levy, and KiwiSaver — see your real take-home.
        </TextAnimate>
      </div>

      <IncomeCalculator />
    </div>
  );
}
