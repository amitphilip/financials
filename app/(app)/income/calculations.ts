// NZ PAYE tax brackets 2025–2026
const TAX_BRACKETS = [
  { ceiling: 14_000,   rate: 0.105 },
  { ceiling: 48_000,   rate: 0.175 },
  { ceiling: 70_000,   rate: 0.30  },
  { ceiling: 180_000,  rate: 0.33  },
  { ceiling: Infinity, rate: 0.39  },
];

// ACC earners' levy 2025–2026
const ACC_RATE = 0.0167;
const ACC_MAX_EARNINGS = 142_283;

// KiwiSaver employer minimum
const EMPLOYER_KIWI_RATE = 0.03;

export const KIWI_RATES = [3.5, 4, 6, 8, 10] as const;
export type KiwiRate = (typeof KIWI_RATES)[number];

export type IncomeResult = {
  gross: number;
  paye: number;
  acc: number;
  kiwiEmployee: number;
  kiwiEmployer: number;
  net: number;
  weekly: number;
  fortnightly: number;
  monthly: number;
  effectiveTaxRate: number;
};

export function calculatePAYE(gross: number): number {
  let tax = 0;
  let prev = 0;
  for (const { ceiling, rate } of TAX_BRACKETS) {
    if (gross <= prev) break;
    tax += (Math.min(gross, ceiling) - prev) * rate;
    prev = ceiling;
  }
  return Math.round(tax);
}

export function calculateACC(gross: number): number {
  return Math.round(Math.min(gross, ACC_MAX_EARNINGS) * ACC_RATE);
}

export function calculateIncome(gross: number, kiwiRate: KiwiRate): IncomeResult {
  const paye = calculatePAYE(gross);
  const acc = calculateACC(gross);
  const kiwiEmployee = Math.round(gross * (kiwiRate / 100));
  const kiwiEmployer = Math.round(gross * EMPLOYER_KIWI_RATE);
  const net = gross - paye - acc - kiwiEmployee;
  const effectiveTaxRate = gross > 0
    ? Math.round(((paye + acc) / gross) * 1000) / 10
    : 0;

  return {
    gross,
    paye,
    acc,
    kiwiEmployee,
    kiwiEmployer,
    net,
    weekly: Math.round(net / 52),
    fortnightly: Math.round(net / 26),
    monthly: Math.round(net / 12),
    effectiveTaxRate,
  };
}

export const TAX_BRACKET_DISPLAY = TAX_BRACKETS.map((b, i) => ({
  label: i === TAX_BRACKETS.length - 1
    ? `$180,001+`
    : `$${(i === 0 ? 0 : TAX_BRACKETS[i - 1].ceiling + 1).toLocaleString("en-AU")}–$${b.ceiling.toLocaleString("en-AU")}`,
  rate: `${b.rate * 100}%`,
}));
