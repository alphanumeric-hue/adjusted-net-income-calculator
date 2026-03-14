# ANI Calculator — Browser Validation Test Scenarios

Tax year used throughout: **2025-26** unless noted.

All monetary values in pence. All rates in basis points (bps = rate × 10,000).

## Authoritative threshold values from `backend/internal/domain/bands.go` (2025-26)

| Parameter | Pence | £ |
|---|---|---|
| PersonalAllowance | 1,257,000 | £12,570 |
| PATaperThreshold | 10,000,000 | £100,000 |
| BasicRateLimit | 3,770,000 | £37,700 |
| HigherRateThreshold | 5,027,000 | £50,270 |
| AdditionalRateThreshold | 12,507,000 | £125,070 |
| NIPrimaryThreshold | 1,204,800 | £12,048 |
| NIUpperEarningsLimit | 5,029,600 | £50,296 |
| HICBCThreshold | 6,000,000 | £60,000 |
| HICBCUpperLimit | 8,000,000 | £80,000 |
| ChildBenefitWeeklyFirst | 2,660 | £26.60 |
| ChildBenefitWeeklySubsequent | 1,760 | £17.60 |

NI rates: 8% below UEL, 2% above UEL.
Income tax rates: 20% basic, 40% higher, 45% additional.

---

## Scenario 1: Basic Rate Salary — no deductions

### Purpose
Validates the common case of a sole employment income entirely within the basic rate band, with no deductions and no children. Confirms PA, NI, and income tax all apply correctly.

### Inputs

| Field | Value (pence) | Human-readable |
|---|---|---|
| tax_year | — | "2025-26" |
| income_sources[0].amount | 3,000,000 | £30,000 |
| income_sources[0].description | — | "Salary" |
| income_sources[0].income_type | — | "employment" |
| salary_sacrifice_pension | 0 | £0 |
| sipp_gross | 0 | £0 |
| donations_gross | 0 | £0 |
| trading_losses | 0 | £0 |
| child_benefit.claimed | — | false |
| child_benefit.number_of_children | — | 0 |

### Expected Outputs

| Field | Value (pence) | Human-readable | Calculation |
|---|---|---|---|
| gross_income | 3,000,000 | £30,000 | £30,000 salary, no sacrifice |
| total_deductions | 0 | £0 | no SIPP, Gift Aid or losses |
| adjusted_net_income | 3,000,000 | £30,000 | gross − 0 |
| personal_allowance | 1,257,000 | £12,570 | ANI < £100,000, no taper |
| taxable_income | 1,743,000 | £17,430 | 3,000,000 − 1,257,000 |
| income_tax | 348,600 | £3,486.00 | 1,743,000 × 20% |
| national_insurance | 143,616 | £1,436.16 | (3,000,000 − 1,204,800) × 8% = 1,795,200 × 8% |
| hicbc | 0 | £0 | child benefit not claimed |
| total_tax | 492,216 | £4,922.16 | 348,600 + 143,616 |
| net_income | 2,507,784 | £25,077.84 | 3,000,000 − 492,216 |
| effective_rate_bps | 1641 | 16.41% | 492,216 / 3,000,000 = 0.164072 → truncate to bps |
| marginal_rate_bps | 2000 | 20% | basic rate band |

---

## Scenario 2: Higher Rate Salary — crosses into 40% band

### Purpose
Validates that income spanning both the basic and higher rate bands produces the correct split tax calculation, and that NI above the Upper Earnings Limit applies at 2%.

### Inputs

| Field | Value (pence) | Human-readable |
|---|---|---|
| tax_year | — | "2025-26" |
| income_sources[0].amount | 6,000,000 | £60,000 |
| income_sources[0].income_type | — | "employment" |
| salary_sacrifice_pension | 0 | £0 |
| sipp_gross | 0 | £0 |
| donations_gross | 0 | £0 |
| trading_losses | 0 | £0 |
| child_benefit.claimed | — | false |
| child_benefit.number_of_children | — | 0 |

### Expected Outputs

| Field | Value (pence) | Human-readable | Calculation |
|---|---|---|---|
| gross_income | 6,000,000 | £60,000 | salary only |
| total_deductions | 0 | £0 | no deductions |
| adjusted_net_income | 6,000,000 | £60,000 | gross − 0 |
| personal_allowance | 1,257,000 | £12,570 | ANI < £100,000 |
| taxable_income | 4,743,000 | £47,430 | 6,000,000 − 1,257,000 |
| income_tax | 1,143,200 | £11,432.00 | basic: 3,770,000 × 20% = 754,000; higher: (4,743,000 − 3,770,000) × 40% = 973,000 × 40% = 389,200; total: 754,000 + 389,200 |
| national_insurance | 325,392 | £3,253.92 | main: (5,029,600 − 1,204,800) × 8% = 3,824,800 × 8% = 305,984; above UEL: (6,000,000 − 5,029,600) × 2% = 970,400 × 2% = 19,408; total: 305,984 + 19,408 |
| hicbc | 0 | £0 | not claimed |
| total_tax | 1,468,592 | £14,685.92 | 1,143,200 + 325,392 |
| net_income | 4,531,408 | £45,314.08 | 6,000,000 − 1,468,592 |
| effective_rate_bps | 2444 | 24.44% | 1,468,592 / 6,000,000 = 0.244432 → truncate |
| marginal_rate_bps | 4000 | 40% | higher rate band |

---

## Scenario 3: PA Taper Entry — ANI just above £100,000

### Purpose
Validates that the PA taper begins correctly when ANI exceeds £100,000 by a small amount. At ANI = £102,000, the PA is reduced by £1,000 to £11,570.

### Inputs

| Field | Value (pence) | Human-readable |
|---|---|---|
| tax_year | — | "2025-26" |
| income_sources[0].amount | 10,200,000 | £102,000 |
| income_sources[0].income_type | — | "employment" |
| salary_sacrifice_pension | 0 | £0 |
| sipp_gross | 0 | £0 |
| donations_gross | 0 | £0 |
| trading_losses | 0 | £0 |
| child_benefit.claimed | — | false |
| child_benefit.number_of_children | — | 0 |

### Expected Outputs

| Field | Value (pence) | Human-readable | Calculation |
|---|---|---|---|
| gross_income | 10,200,000 | £102,000 | salary only |
| total_deductions | 0 | £0 | no deductions |
| adjusted_net_income | 10,200,000 | £102,000 | gross − 0 |
| personal_allowance | 1,157,000 | £11,570 | 1,257,000 − (10,200,000 − 10,000,000) / 2 = 1,257,000 − 100,000 |
| taxable_income | 9,043,000 | £90,430 | 10,200,000 − 1,157,000 |
| income_tax | 2,863,200 | £28,632.00 | basic: 3,770,000 × 20% = 754,000; higherBandWidth: 12,507,000 − 1,157,000 − 3,770,000 = 7,580,000; higherIncome: min(9,043,000 − 3,770,000, 7,580,000) = 5,273,000; higher tax: 5,273,000 × 40% = 2,109,200; total: 754,000 + 2,109,200 |
| national_insurance | 409,392 | £4,093.92 | main: 3,824,800 × 8% = 305,984; above UEL: (10,200,000 − 5,029,600) × 2% = 5,170,400 × 2% = 103,408; total: 305,984 + 103,408 |
| hicbc | 0 | £0 | not claimed |
| total_tax | 3,272,592 | £32,725.92 | 2,863,200 + 409,392 |
| net_income | 6,927,408 | £69,274.08 | 10,200,000 − 3,272,592 |
| effective_rate_bps | 3208 | 32.08% | 3,272,592 / 10,200,000 = 0.320842 → truncate |
| marginal_rate_bps | 6000 | 60% | inside PA taper zone |

---

## Scenario 4: PA Taper Midpoint — ANI = £110,000 (PA = £7,570)

### Purpose
Validates PA taper arithmetic at the midpoint of the taper range. At ANI = £110,000 the excess is £10,000, so PA is reduced by £5,000 to £7,570. Confirms the 60% effective marginal rate applies.

### Inputs

| Field | Value (pence) | Human-readable |
|---|---|---|
| tax_year | — | "2025-26" |
| income_sources[0].amount | 11,000,000 | £110,000 |
| income_sources[0].income_type | — | "employment" |
| salary_sacrifice_pension | 0 | £0 |
| sipp_gross | 0 | £0 |
| donations_gross | 0 | £0 |
| trading_losses | 0 | £0 |
| child_benefit.claimed | — | false |
| child_benefit.number_of_children | — | 0 |

### Expected Outputs

| Field | Value (pence) | Human-readable | Calculation |
|---|---|---|---|
| gross_income | 11,000,000 | £110,000 | salary only |
| total_deductions | 0 | £0 | no deductions |
| adjusted_net_income | 11,000,000 | £110,000 | gross − 0 |
| personal_allowance | 757,000 | £7,570 | 1,257,000 − (11,000,000 − 10,000,000) / 2 = 1,257,000 − 500,000 |
| taxable_income | 10,243,000 | £102,430 | 11,000,000 − 757,000 |
| income_tax | 3,343,200 | £33,432.00 | basic: 3,770,000 × 20% = 754,000; higherBandWidth: 12,507,000 − 757,000 − 3,770,000 = 7,980,000; higherIncome: min(10,243,000 − 3,770,000, 7,980,000) = min(6,473,000, 7,980,000) = 6,473,000; higher tax: 6,473,000 × 40% = 2,589,200; total: 754,000 + 2,589,200 |
| national_insurance | 425,392 | £4,253.92 | main: 3,824,800 × 8% = 305,984; above UEL: (11,000,000 − 5,029,600) × 2% = 5,970,400 × 2% = 119,408; total: 305,984 + 119,408 |
| hicbc | 0 | £0 | not claimed |
| total_tax | 3,768,592 | £37,685.92 | 3,343,200 + 425,392 |
| net_income | 7,231,408 | £72,314.08 | 11,000,000 − 3,768,592 |
| effective_rate_bps | 3426 | 34.26% | 3,768,592 / 11,000,000 = 0.342599 → truncate |
| marginal_rate_bps | 6000 | 60% | inside PA taper zone |

---

## Scenario 5: PA Fully Tapered — ANI = £125,140 (PA = £0)

### Purpose
Validates that the PA reaches exactly zero at ANI = £125,140. At this point the excess over £100,000 is £25,140 and the reduction is £12,570 — equal to the full PA. A small slice of additional rate tax is also due, confirming the AdditionalRateThreshold (£125,070) threshold works correctly.

### Inputs

| Field | Value (pence) | Human-readable |
|---|---|---|
| tax_year | — | "2025-26" |
| income_sources[0].amount | 12,514,000 | £125,140 |
| income_sources[0].income_type | — | "employment" |
| salary_sacrifice_pension | 0 | £0 |
| sipp_gross | 0 | £0 |
| donations_gross | 0 | £0 |
| trading_losses | 0 | £0 |
| child_benefit.claimed | — | false |
| child_benefit.number_of_children | — | 0 |

### Expected Outputs

| Field | Value (pence) | Human-readable | Calculation |
|---|---|---|---|
| gross_income | 12,514,000 | £125,140 | salary only |
| total_deductions | 0 | £0 | no deductions |
| adjusted_net_income | 12,514,000 | £125,140 | gross − 0 |
| personal_allowance | 0 | £0 | excess: 12,514,000 − 10,000,000 = 2,514,000; reduction: 2,514,000 / 2 = 1,257,000 = full PA |
| taxable_income | 12,514,000 | £125,140 | 12,514,000 − 0 |
| income_tax | 4,251,950 | £42,519.50 | basic: 3,770,000 × 20% = 754,000; higherBandWidth: 12,507,000 − 0 − 3,770,000 = 8,737,000; higherIncome: min(12,514,000 − 3,770,000, 8,737,000) = min(8,744,000, 8,737,000) = 8,737,000; higher tax: 8,737,000 × 40% = 3,494,800; additional: 12,514,000 − 3,770,000 − 8,737,000 = 7,000; additional tax: 7,000 × 45% = 3,150; total: 754,000 + 3,494,800 + 3,150 |
| national_insurance | 455,672 | £4,556.72 | main: 3,824,800 × 8% = 305,984; above UEL: (12,514,000 − 5,029,600) × 2% = 7,484,400 × 2% = 149,688; total: 305,984 + 149,688 |
| hicbc | 0 | £0 | not claimed |
| total_tax | 4,707,622 | £47,076.22 | 4,251,950 + 455,672 |
| net_income | 7,806,378 | £78,063.78 | 12,514,000 − 4,707,622 |
| effective_rate_bps | 3761 | 37.61% | 4,707,622 / 12,514,000 = 0.376195 → truncate |
| marginal_rate_bps | 4500 | 45% | ANI £125,140 > AdditionalRateThreshold £125,070 |

---

## Scenario 6: SIPP Contribution Restores Full PA

### Purpose
Validates that a SIPP gross contribution reduces ANI to exactly £100,000, restoring the full personal allowance. The SIPP does NOT reduce the NI base (NI is calculated on the full £120,000 employment income), confirming that only salary sacrifice achieves NI savings.

### Inputs

| Field | Value (pence) | Human-readable |
|---|---|---|
| tax_year | — | "2025-26" |
| income_sources[0].amount | 12,000,000 | £120,000 |
| income_sources[0].income_type | — | "employment" |
| salary_sacrifice_pension | 0 | £0 |
| sipp_gross | 2,000,000 | £20,000 |
| donations_gross | 0 | £0 |
| trading_losses | 0 | £0 |
| child_benefit.claimed | — | false |
| child_benefit.number_of_children | — | 0 |

### Expected Outputs

| Field | Value (pence) | Human-readable | Calculation |
|---|---|---|---|
| gross_income | 12,000,000 | £120,000 | employment income, no salary sacrifice |
| total_deductions | 2,000,000 | £20,000 | SIPP gross only |
| adjusted_net_income | 10,000,000 | £100,000 | 12,000,000 − 2,000,000 |
| personal_allowance | 1,257,000 | £12,570 | ANI = £100,000, exactly at taper threshold — no reduction |
| taxable_income | 10,743,000 | £107,430 | 12,000,000 − 1,257,000 (taxable uses gross not ANI) |
| income_tax | 3,543,200 | £35,432.00 | basic: 3,770,000 × 20% = 754,000; higherBandWidth: 12,507,000 − 1,257,000 − 3,770,000 = 7,480,000; higherIncome: min(10,743,000 − 3,770,000, 7,480,000) = min(6,973,000, 7,480,000) = 6,973,000; higher tax: 6,973,000 × 40% = 2,789,200; total: 754,000 + 2,789,200 |
| national_insurance | 445,392 | £4,453.92 | NI on employment £120,000 — SIPP has no NI effect; main: 3,824,800 × 8% = 305,984; above UEL: (12,000,000 − 5,029,600) × 2% = 6,970,400 × 2% = 139,408; total: 305,984 + 139,408 |
| hicbc | 0 | £0 | not claimed |
| total_tax | 3,988,592 | £39,885.92 | 3,543,200 + 445,392 |
| net_income | 8,011,408 | £80,114.08 | 12,000,000 − 3,988,592 |
| effective_rate_bps | 3323 | 33.23% | 3,988,592 / 12,000,000 = 0.332382 → truncate |
| marginal_rate_bps | 4000 | 40% | ANI = exactly £100,000, not above threshold |

---

## Scenario 7: Salary Sacrifice Reduces Gross and NI Base

### Purpose
Validates that salary sacrifice reduces gross_income before any other calculation (unlike SIPP). The NI saving is material because the £5,000 sacrifice falls entirely within the 8% NI band. Compare with Scenario 6 to confirm SIPP and salary sacrifice produce different NI outcomes despite similar income tax effects.

### Inputs

| Field | Value (pence) | Human-readable |
|---|---|---|
| tax_year | — | "2025-26" |
| income_sources[0].amount | 6,000,000 | £60,000 (pre-sacrifice notional salary) |
| income_sources[0].income_type | — | "employment" |
| salary_sacrifice_pension | 500,000 | £5,000 |
| sipp_gross | 0 | £0 |
| donations_gross | 0 | £0 |
| trading_losses | 0 | £0 |
| child_benefit.claimed | — | false |
| child_benefit.number_of_children | — | 0 |

### Expected Outputs

| Field | Value (pence) | Human-readable | Calculation |
|---|---|---|---|
| gross_income | 5,500,000 | £55,000 | 6,000,000 − 500,000 salary sacrifice |
| total_deductions | 0 | £0 | salary sacrifice is not an ANI deduction |
| adjusted_net_income | 5,500,000 | £55,000 | gross − 0 |
| personal_allowance | 1,257,000 | £12,570 | ANI < £100,000 |
| taxable_income | 4,243,000 | £42,430 | 5,500,000 − 1,257,000 |
| income_tax | 943,200 | £9,432.00 | basic: 3,770,000 × 20% = 754,000; higher: (4,243,000 − 3,770,000) × 40% = 473,000 × 40% = 189,200; total: 754,000 + 189,200 |
| national_insurance | 315,392 | £3,153.92 | NI on reduced employment income £55,000; main: (5,029,600 − 1,204,800) × 8% = 3,824,800 × 8% = 305,984; above UEL: (5,500,000 − 5,029,600) × 2% = 470,400 × 2% = 9,408; total: 305,984 + 9,408 |
| hicbc | 0 | £0 | not claimed |
| total_tax | 1,258,592 | £12,585.92 | 943,200 + 315,392 |
| net_income | 4,241,408 | £42,414.08 | 5,500,000 − 1,258,592 |
| effective_rate_bps | 2288 | 22.88% | 1,258,592 / 5,500,000 = 0.228835 → truncate |
| marginal_rate_bps | 4000 | 40% | ANI = £55,000, higher rate band |

---

## Scenario 8: HICBC Partial Charge — ANI = £70,000, 2 Children

### Purpose
Validates the HICBC partial charge calculation for 2025-26. ANI = £70,000 is £10,000 above the £60,000 threshold, producing a 50% charge (£10,000 / £200 = 50 steps of 1%). Child benefit annual total uses bands.go weekly rates of £26.60 and £17.60.

### Inputs

| Field | Value (pence) | Human-readable |
|---|---|---|
| tax_year | — | "2025-26" |
| income_sources[0].amount | 7,000,000 | £70,000 |
| income_sources[0].income_type | — | "employment" |
| salary_sacrifice_pension | 0 | £0 |
| sipp_gross | 0 | £0 |
| donations_gross | 0 | £0 |
| trading_losses | 0 | £0 |
| child_benefit.claimed | — | true |
| child_benefit.number_of_children | — | 2 |

### Expected Outputs

| Field | Value (pence) | Human-readable | Calculation |
|---|---|---|---|
| gross_income | 7,000,000 | £70,000 | salary only |
| total_deductions | 0 | £0 | no deductions |
| adjusted_net_income | 7,000,000 | £70,000 | gross − 0 |
| personal_allowance | 1,257,000 | £12,570 | ANI < £100,000 |
| taxable_income | 5,743,000 | £57,430 | 7,000,000 − 1,257,000 |
| income_tax | 1,543,200 | £15,432.00 | basic: 3,770,000 × 20% = 754,000; higher: (5,743,000 − 3,770,000) × 40% = 1,973,000 × 40% = 789,200; total: 754,000 + 789,200 |
| national_insurance | 345,392 | £3,453.92 | main: 3,824,800 × 8% = 305,984; above UEL: (7,000,000 − 5,029,600) × 2% = 1,970,400 × 2% = 39,408; total: 305,984 + 39,408 |
| hicbc | 114,920 | £1,149.20 | annual benefit: (2,660 + 1,760) × 52 = 4,420 × 52 = 229,840p; excess ANI: 7,000,000 − 6,000,000 = 1,000,000p; charge %: 1,000,000 / 20,000 = 50%; HICBC: 229,840 × 50 / 100 |
| total_tax | 2,003,512 | £20,035.12 | 1,543,200 + 345,392 + 114,920 |
| net_income | 4,996,488 | £49,964.88 | 7,000,000 − 2,003,512 |
| effective_rate_bps | 2862 | 28.62% | 2,003,512 / 7,000,000 = 0.286216 → truncate |
| marginal_rate_bps | 4000 | 40% | ANI = £70,000, higher rate band |

---

## Scenario 9: HICBC Full Clawback — ANI above £80,000, 1 Child

### Purpose
Validates that when ANI exceeds £80,000 the HICBC equals 100% of the annual child benefit with no further scaling. Only the first-child weekly rate applies here (£26.60).

### Inputs

| Field | Value (pence) | Human-readable |
|---|---|---|
| tax_year | — | "2025-26" |
| income_sources[0].amount | 8,500,000 | £85,000 |
| income_sources[0].income_type | — | "employment" |
| salary_sacrifice_pension | 0 | £0 |
| sipp_gross | 0 | £0 |
| donations_gross | 0 | £0 |
| trading_losses | 0 | £0 |
| child_benefit.claimed | — | true |
| child_benefit.number_of_children | — | 1 |

### Expected Outputs

| Field | Value (pence) | Human-readable | Calculation |
|---|---|---|---|
| gross_income | 8,500,000 | £85,000 | salary only |
| total_deductions | 0 | £0 | no deductions |
| adjusted_net_income | 8,500,000 | £85,000 | gross − 0 |
| personal_allowance | 1,257,000 | £12,570 | ANI < £100,000 |
| taxable_income | 7,243,000 | £72,430 | 8,500,000 − 1,257,000 |
| income_tax | 2,143,200 | £21,432.00 | basic: 3,770,000 × 20% = 754,000; higher: (7,243,000 − 3,770,000) × 40% = 3,473,000 × 40% = 1,389,200; total: 754,000 + 1,389,200 |
| national_insurance | 375,392 | £3,753.92 | main: 3,824,800 × 8% = 305,984; above UEL: (8,500,000 − 5,029,600) × 2% = 3,470,400 × 2% = 69,408; total: 305,984 + 69,408 |
| hicbc | 138,320 | £1,383.20 | ANI > £80,000: full 100% clawback; annual benefit: 2,660 × 52 = 138,320p |
| total_tax | 2,656,912 | £26,569.12 | 2,143,200 + 375,392 + 138,320 |
| net_income | 5,843,088 | £58,430.88 | 8,500,000 − 2,656,912 |
| effective_rate_bps | 3125 | 31.25% | 2,656,912 / 8,500,000 = 0.312578 → truncate |
| marginal_rate_bps | 4000 | 40% | ANI = £85,000, higher rate band |

---

## Scenario 10: Gift Aid Crosses Below Taper Threshold, Restoring Full PA

### Purpose
Validates that a gross Gift Aid donation brings ANI from above £100,000 back below the taper threshold, fully restoring the personal allowance. The Gift Aid is deducted from ANI only — gross income (and therefore taxable income) remains based on gross salary.

### Inputs

| Field | Value (pence) | Human-readable |
|---|---|---|
| tax_year | — | "2025-26" |
| income_sources[0].amount | 10,500,000 | £105,000 |
| income_sources[0].income_type | — | "employment" |
| salary_sacrifice_pension | 0 | £0 |
| sipp_gross | 0 | £0 |
| donations_gross | 600,000 | £6,000 gross |
| trading_losses | 0 | £0 |
| child_benefit.claimed | — | false |
| child_benefit.number_of_children | — | 0 |

### Expected Outputs

| Field | Value (pence) | Human-readable | Calculation |
|---|---|---|---|
| gross_income | 10,500,000 | £105,000 | salary; Gift Aid does not reduce gross |
| total_deductions | 600,000 | £6,000 | Gift Aid gross |
| adjusted_net_income | 9,900,000 | £99,000 | 10,500,000 − 600,000 |
| personal_allowance | 1,257,000 | £12,570 | ANI £99,000 < £100,000 — full PA restored |
| taxable_income | 9,243,000 | £92,430 | 10,500,000 − 1,257,000 (gross − PA, not ANI − PA) |
| income_tax | 2,943,200 | £29,432.00 | basic: 3,770,000 × 20% = 754,000; higherBandWidth: 12,507,000 − 1,257,000 − 3,770,000 = 7,480,000; higherIncome: min(9,243,000 − 3,770,000, 7,480,000) = 5,473,000; higher tax: 5,473,000 × 40% = 2,189,200; total: 754,000 + 2,189,200 |
| national_insurance | 415,392 | £4,153.92 | main: 3,824,800 × 8% = 305,984; above UEL: (10,500,000 − 5,029,600) × 2% = 5,470,400 × 2% = 109,408; total: 305,984 + 109,408 |
| hicbc | 0 | £0 | not claimed |
| total_tax | 3,358,592 | £33,585.92 | 2,943,200 + 415,392 |
| net_income | 7,141,408 | £71,414.08 | 10,500,000 − 3,358,592 |
| effective_rate_bps | 3198 | 31.98% | 3,358,592 / 10,500,000 = 0.319866 → truncate |
| marginal_rate_bps | 4000 | 40% | ANI = £99,000, higher rate band (below taper) |

---

## Scenario 11: Multiple Income Sources — Employment Plus Rental Plus Savings

### Purpose
Validates that income sources of different types are correctly aggregated for gross income and income tax, but that NI is calculated only on employment income. A SIPP contribution reduces ANI without affecting the NI base.

### Inputs

| Field | Value (pence) | Human-readable |
|---|---|---|
| tax_year | — | "2025-26" |
| income_sources[0].amount | 4,500,000 | £45,000 |
| income_sources[0].description | — | "Salary" |
| income_sources[0].income_type | — | "employment" |
| income_sources[1].amount | 800,000 | £8,000 |
| income_sources[1].description | — | "Rental income" |
| income_sources[1].income_type | — | "other" |
| income_sources[2].amount | 200,000 | £2,000 |
| income_sources[2].description | — | "Savings interest" |
| income_sources[2].income_type | — | "other" |
| salary_sacrifice_pension | 0 | £0 |
| sipp_gross | 500,000 | £5,000 |
| donations_gross | 0 | £0 |
| trading_losses | 0 | £0 |
| child_benefit.claimed | — | false |
| child_benefit.number_of_children | — | 0 |

### Expected Outputs

| Field | Value (pence) | Human-readable | Calculation |
|---|---|---|---|
| gross_income | 5,500,000 | £55,000 | 4,500,000 + 800,000 + 200,000 |
| total_deductions | 500,000 | £5,000 | SIPP gross |
| adjusted_net_income | 5,000,000 | £50,000 | 5,500,000 − 500,000 |
| personal_allowance | 1,257,000 | £12,570 | ANI < £100,000 |
| taxable_income | 4,243,000 | £42,430 | 5,500,000 − 1,257,000 |
| income_tax | 943,200 | £9,432.00 | basic: 3,770,000 × 20% = 754,000; higher: (4,243,000 − 3,770,000) × 40% = 473,000 × 40% = 189,200; total: 754,000 + 189,200 |
| national_insurance | 263,616 | £2,636.16 | NI on employment income only: (4,500,000 − 1,204,800) × 8% = 3,295,200 × 8%; income below UEL so no 2% band applies |
| hicbc | 0 | £0 | not claimed |
| total_tax | 1,206,816 | £12,068.16 | 943,200 + 263,616 |
| net_income | 4,293,184 | £42,931.84 | 5,500,000 − 1,206,816 |
| effective_rate_bps | 2194 | 21.94% | 1,206,816 / 5,500,000 = 0.219421 → truncate |
| marginal_rate_bps | 2000 | 20% | ANI = £50,000 — below higher rate threshold of £50,270 |

---

## Scenario 12: Edge Case — Income Exactly at Higher Rate Threshold (£50,270)

### Purpose
Validates boundary behaviour at the exact higher rate threshold. Taxable income (gross minus full PA) = £37,700, which exactly fills the basic rate band with nothing in the higher rate band. NI is just below the UEL so no 2% charge applies.

### Inputs

| Field | Value (pence) | Human-readable |
|---|---|---|
| tax_year | — | "2025-26" |
| income_sources[0].amount | 5,027,000 | £50,270 |
| income_sources[0].income_type | — | "employment" |
| salary_sacrifice_pension | 0 | £0 |
| sipp_gross | 0 | £0 |
| donations_gross | 0 | £0 |
| trading_losses | 0 | £0 |
| child_benefit.claimed | — | false |
| child_benefit.number_of_children | — | 0 |

### Expected Outputs

| Field | Value (pence) | Human-readable | Calculation |
|---|---|---|---|
| gross_income | 5,027,000 | £50,270 | salary only |
| total_deductions | 0 | £0 | no deductions |
| adjusted_net_income | 5,027,000 | £50,270 | gross − 0 |
| personal_allowance | 1,257,000 | £12,570 | ANI < £100,000 |
| taxable_income | 3,770,000 | £37,700 | 5,027,000 − 1,257,000 — exactly fills basic rate band |
| income_tax | 754,000 | £7,540.00 | 3,770,000 × 20% — no higher rate tax at all |
| national_insurance | 305,776 | £3,057.76 | (5,027,000 − 1,204,800) × 8% = 3,822,200 × 8%; employment income below UEL of 5,029,600 so no 2% band |
| hicbc | 0 | £0 | not claimed |
| total_tax | 1,059,776 | £10,597.76 | 754,000 + 305,776 |
| net_income | 3,967,224 | £39,672.24 | 5,027,000 − 1,059,776 |
| effective_rate_bps | 2108 | 21.08% | 1,059,776 / 5,027,000 = 0.210849 → truncate |
| marginal_rate_bps | 4000 | 40% | next pound of income enters higher rate band |

---

## Notes for Validator

1. **Rounding**: all pence values are integers. The effective_rate_bps uses integer truncation (floor), not rounding.

2. **NI base**: NI is always computed on employment income only, after salary sacrifice. Rental income, savings interest, dividends, and other non-employment sources do not enter the NI calculation.

3. **Taxable income**: uses `gross_income − personal_allowance`, not `ANI − personal_allowance`. SIPP and Gift Aid reduce ANI (and therefore PA), but the taxable base is always gross.

4. **Salary sacrifice vs SIPP**: salary sacrifice reduces gross_income and the NI base. SIPP appears only as a total_deductions entry and reduces ANI — the NI base remains gross employment income.

5. **ANI floor**: ANI cannot be negative. If deductions exceed gross income the result is zero.

6. **AdditionalRateThreshold**: bands.go stores this as 12,507,000p (£125,070), not the HMRC-published £125,140 that exactly zeros PA. This produces a small overlap: between £125,070 and £125,140 the calculator charges additional rate (45%) on income that is still within the taper zone. Scenario 5 above exercises this boundary deliberately.

7. **Child benefit weekly rates (2025-26 per bands.go)**: £26.60 first child, £17.60 subsequent. Annual = weekly × 52.
