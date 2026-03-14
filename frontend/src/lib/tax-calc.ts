import type { TaxInput, TaxResult } from './schemas'

// Tax year band definitions for client-side preview calculations.
// Mirrors the Go domain/bands.go — used for real-time debounced preview as users type.
interface TaxYearBands {
  personalAllowance: number
  paTaperThreshold: number
  basicRateLimit: number
  additionalRateThreshold: number
  basicRateBPS: number
  higherRateBPS: number
  additionalRateBPS: number
  niPrimaryThreshold: number
  niUpperEarningsLimit: number
  niRateBelowUELBPS: number
  niRateAboveUELBPS: number
  hicbcThreshold: number
  hicbcUpperLimit: number
  childBenefitWeeklyFirst: number
  childBenefitWeeklySubsequent: number
}

const bands: Record<string, TaxYearBands> = {
  '2024-25': {
    personalAllowance: 1257000,
    paTaperThreshold: 10000000,
    basicRateLimit: 3770000,
    additionalRateThreshold: 12507000,
    basicRateBPS: 2000,
    higherRateBPS: 4000,
    additionalRateBPS: 4500,
    niPrimaryThreshold: 1204800,
    niUpperEarningsLimit: 5029600,
    niRateBelowUELBPS: 800,
    niRateAboveUELBPS: 200,
    hicbcThreshold: 6000000,
    hicbcUpperLimit: 8000000,
    childBenefitWeeklyFirst: 2560,
    childBenefitWeeklySubsequent: 1695,
  },
  '2025-26': {
    personalAllowance: 1257000,
    paTaperThreshold: 10000000,
    basicRateLimit: 3770000,
    additionalRateThreshold: 12507000,
    basicRateBPS: 2000,
    higherRateBPS: 4000,
    additionalRateBPS: 4500,
    niPrimaryThreshold: 1204800,
    niUpperEarningsLimit: 5029600,
    niRateBelowUELBPS: 800,
    niRateAboveUELBPS: 200,
    hicbcThreshold: 6000000,
    hicbcUpperLimit: 8000000,
    childBenefitWeeklyFirst: 2660,
    childBenefitWeeklySubsequent: 1760,
  },
}

// applyRate multiplies an amount by a basis-point rate and returns the result.
function applyRate(amount: number, rateBPS: number): number {
  return Math.floor(amount * rateBPS / 10000)
}

// calculateGrossIncome sums all income sources, reducing the total by salary sacrifice.
function calculateGrossIncome(input: TaxInput): number {
  const total = input.income_sources.reduce((sum, src) => sum + src.amount, 0)
  return Math.max(0, total - input.pension_contributions.salary_sacrifice_pension)
}

// calculatePA computes the personal allowance after tapering for high earners.
function calculatePA(ani: number, b: TaxYearBands): number {
  let pa = b.personalAllowance
  if (ani > b.paTaperThreshold) {
    const reduction = Math.floor((ani - b.paTaperThreshold) / 2)
    pa = Math.max(0, pa - reduction)
  }
  return pa
}

// calculatePreview performs a quick client-side tax calculation for real-time preview.
// This mirrors the server logic but is not authoritative — the server result is used on save.
export function calculatePreview(input: TaxInput): TaxResult | null {
  const b = bands[input.tax_year]
  if (!b) return null

  const gross = calculateGrossIncome(input)
  const deductions = input.pension_contributions.sipp_gross +
    input.gift_aid.donations_gross +
    input.trading_losses
  const ani = Math.max(0, gross - deductions)
  const pa = calculatePA(ani, b)
  const taxableIncome = Math.max(0, gross - pa)

  // Income tax by band
  let remaining = taxableIncome
  let incomeTax = 0
  const taxBands = []

  const basicIncome = Math.min(remaining, b.basicRateLimit)
  if (basicIncome > 0) {
    const tax = applyRate(basicIncome, b.basicRateBPS)
    taxBands.push({ name: 'Basic Rate', lower_bound: 0, upper_bound: b.basicRateLimit, rate: b.basicRateBPS, tax_amount: tax, income: basicIncome })
    incomeTax += tax
    remaining -= basicIncome
  }

  const higherBandWidth = b.additionalRateThreshold - pa - b.basicRateLimit
  const higherIncome = Math.min(remaining, Math.max(0, higherBandWidth))
  if (higherIncome > 0) {
    const tax = applyRate(higherIncome, b.higherRateBPS)
    taxBands.push({ name: 'Higher Rate', lower_bound: b.basicRateLimit, upper_bound: b.basicRateLimit + higherBandWidth, rate: b.higherRateBPS, tax_amount: tax, income: higherIncome })
    incomeTax += tax
    remaining -= higherIncome
  }

  if (remaining > 0) {
    const tax = applyRate(remaining, b.additionalRateBPS)
    taxBands.push({ name: 'Additional Rate', lower_bound: b.basicRateLimit + higherBandWidth, upper_bound: 0, rate: b.additionalRateBPS, tax_amount: tax, income: remaining })
    incomeTax += tax
  }

  // NI is calculated on employment-typed income rows only.
  const grossEmployment = input.income_sources
    .filter(src => src.income_type === 'employment')
    .reduce((sum, src) => sum + src.amount, 0)
  const grossEmploymentAfterSacrifice = Math.max(0, grossEmployment - input.pension_contributions.salary_sacrifice_pension)
  let ni = 0
  if (grossEmploymentAfterSacrifice > b.niPrimaryThreshold) {
    const mainBand = Math.min(grossEmploymentAfterSacrifice, b.niUpperEarningsLimit) - b.niPrimaryThreshold
    if (mainBand > 0) ni += applyRate(mainBand, b.niRateBelowUELBPS)
    const aboveUEL = grossEmploymentAfterSacrifice - b.niUpperEarningsLimit
    if (aboveUEL > 0) ni += applyRate(aboveUEL, b.niRateAboveUELBPS)
  }

  // HICBC
  let hicbc = 0
  if (input.child_benefit.claimed && input.child_benefit.number_of_children > 0 && ani > b.hicbcThreshold) {
    let weekly = b.childBenefitWeeklyFirst
    if (input.child_benefit.number_of_children > 1) {
      weekly += b.childBenefitWeeklySubsequent * (input.child_benefit.number_of_children - 1)
    }
    const annualBenefit = weekly * 52
    if (ani >= b.hicbcUpperLimit) {
      hicbc = annualBenefit
    } else {
      const pct = Math.min(100, Math.floor((ani - b.hicbcThreshold) / 20000))
      hicbc = Math.floor(annualBenefit * pct / 100)
    }
  }

  const totalTax = incomeTax + ni + hicbc
  const effectiveRateBPS = gross > 0 ? Math.floor(totalTax * 10000 / gross) : 0

  return {
    gross_income: gross,
    total_deductions: deductions,
    adjusted_net_income: ani,
    personal_allowance: pa,
    taxable_income: taxableIncome,
    income_tax: incomeTax,
    tax_bands: taxBands,
    national_insurance: ni,
    employee_ni_saved: 0,
    employer_ni_saved: 0,
    hicbc,
    total_tax: totalTax,
    net_income: gross - totalTax,
    effective_rate_bps: effectiveRateBPS,
    marginal_rate_bps: 0,
    salary_sacrifice_reduction: input.pension_contributions.salary_sacrifice_pension,
    sipp_relief: input.pension_contributions.sipp_gross,
    gift_aid_deduction: input.gift_aid.donations_gross,
  }
}
