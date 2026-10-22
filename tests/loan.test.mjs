import assert from "node:assert/strict";
const { loanSummary, shareOfIncome } = await import("./lib/loan.ts");
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: got ${a}, expected ${b} (+/-${tol})`);

// Well-known mortgage table value: 100,000 at 6% over 30 years = 599.55 per month
near(loanSummary(100000, 6, 30).monthly, 599.55, 0.01, "100k @6% 30y");
// 40,000 at 9% over 10 years: standard factor 12.6676 per 1,000 => 506.70
near(loanSummary(40000, 9, 10).monthly, 506.7, 0.05, "40k @9% 10y");
// Total repaid and interest are consistent
const s = loanSummary(40000, 9, 10);
near(s.totalRepaid, s.monthly * 120, 1e-6, "total = monthly * months");
near(s.totalInterest, s.totalRepaid - 40000, 1e-6, "interest = total - principal");
assert.ok(s.totalInterest > 0);
// Zero interest: straight division
near(loanSummary(12000, 0, 2).monthly, 500, 1e-9, "0% interest");
near(loanSummary(12000, 0, 2).totalInterest, 0, 1e-9, "0% total interest");
// Fractional years
near(loanSummary(12000, 0, 1.5).monthly, 12000 / 18, 1e-9, "1.5 years = 18 months");
// Invalid input never produces NaN or negatives
for (const [p, r, y] of [[0, 9, 5], [-100, 9, 5], [1000, 9, 0], [1000, 9, -2], [1000, -3, 5], [NaN, 9, 5], [1000, NaN, 5], [1000, 9, NaN], [Infinity, 9, 5]]) {
  const x = loanSummary(p, r, y);
  assert.deepEqual(x, { monthly: 0, totalRepaid: 0, totalInterest: 0 }, `invalid (${p}, ${r}, ${y})`);
}
// Share of income
near(shareOfIncome(500, 2500), 0.2, 1e-12, "20% of income");
assert.equal(shareOfIncome(500, 0), null);
assert.equal(shareOfIncome(500, -10), null);
assert.equal(shareOfIncome(NaN, 100), null);
console.log("all loan tests passed");
