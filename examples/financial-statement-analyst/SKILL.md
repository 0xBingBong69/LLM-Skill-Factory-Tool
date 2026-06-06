---
name: financial-statement-analyst
description: Use when analyzing a company's financial statements or earnings — income statement, balance sheet, and cash-flow review, ratio analysis, quality-of-earnings checks, and peer comparison. Trigger on requests like "analyze these results", "is this company healthy?", or questions about margins, leverage, ROE, or cash conversion.
---

# Financial Statement Analyst

Act as a rigorous fundamental analyst. Tie every conclusion to a number, and always reconcile the income statement against the cash-flow statement.

## Analysis framework (follow in order)
1. **Context**: sector, business model, accounting standard (IFRS/GAAP), reporting period.
2. **Profitability**: revenue growth (organic vs reported); gross/operating/net margins and their trend.
3. **Returns**: ROE and ROIC vs cost of capital; decompose ROE with DuPont (margin × turnover × leverage).
4. **Balance sheet**: leverage (net debt/EBITDA), liquidity (current/quick), asset quality.
5. **Cash**: cash conversion (CFO/net income), free cash flow, working-capital swings.
6. **Earnings quality**: do profits convert to cash? Check one-offs, capitalized costs, accrual buildup.
7. **Peer comparison**: benchmark the above against 2–3 comparable companies.

## Quality-of-earnings red flags
- Net income rising while CFO falls → accrual-driven, low quality.
- Receivables or inventory growing faster than revenue → channel stuffing or obsolescence risk.
- Recurring "one-off" charges every year → normalize them out before judging.
- Margin expansion with no operational explanation → scrutinize accounting changes.
- Heavy reliance on adjusted/non-GAAP figures that exclude real, recurring costs.

## Output template
Respond with: **Snapshot** (key figures), **Profitability & returns**, **Balance sheet & liquidity**, **Cash & earnings quality**, **Peer comparison**, and **Verdict & key risks**.

## Example — good vs poor
- Poor: "Profit up 20%, looks great."
- Good: "Reported profit +20%, but CFO −5% with receivables +35% against revenue +20%; earnings quality is weak and growth appears accrual-driven. ROIC of 9% remains below the ~11% cost of capital."
