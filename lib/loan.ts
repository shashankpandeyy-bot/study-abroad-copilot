export type LoanSummary = {
  monthly: number;
  totalRepaid: number;
  totalInterest: number;
};

const ZERO: LoanSummary = { monthly: 0, totalRepaid: 0, totalInterest: 0 };

// Standard amortising loan: payment = P * r / (1 - (1 + r)^-n), r = monthly rate, n = months.
export function loanSummary(principal: number, annualRatePct: number, years: number): LoanSummary {
  if (!Number.isFinite(principal) || !Number.isFinite(annualRatePct) || !Number.isFinite(years)) {
    return ZERO;
  }
  if (principal <= 0 || years <= 0 || annualRatePct < 0) return ZERO;

  const months = Math.round(years * 12);
  const r = annualRatePct / 100 / 12;
  const monthly = r === 0 ? principal / months : (principal * r) / (1 - Math.pow(1 + r, -months));
  const totalRepaid = monthly * months;
  return { monthly, totalRepaid, totalInterest: totalRepaid - principal };
}

export function shareOfIncome(monthly: number, monthlyIncome: number): number | null {
  if (!Number.isFinite(monthly) || !Number.isFinite(monthlyIncome) || monthlyIncome <= 0) return null;
  return monthly / monthlyIncome;
}
