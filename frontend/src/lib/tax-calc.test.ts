import { describe, it, expect } from 'vitest'
import { calculatePreview } from './tax-calc'
import { defaultTaxInput } from './schemas'
import type { TaxInput } from './schemas'

// Helper to create a TaxInput with overrides on the default.
function makeInput(overrides: Partial<TaxInput> & { tax_year?: string } = {}): TaxInput {
  const base = defaultTaxInput(overrides.tax_year ?? '2024-25')
  return { ...base, ...overrides }
}

describe('calculatePreview', () => {
  it('returns null for unsupported tax year', () => {
    const input = makeInput({ tax_year: '2099-00' })
    expect(calculatePreview(input)).toBeNull()
  })

  it('returns zero results for zero income', () => {
    const result = calculatePreview(makeInput({ income_sources: [] }))!
    expect(result).not.toBeNull()
    expect(result.gross_income).toBe(0)
    expect(result.adjusted_net_income).toBe(0)
    expect(result.income_tax).toBe(0)
    expect(result.national_insurance).toBe(0)
    expect(result.total_tax).toBe(0)
    expect(result.net_income).toBe(0)
    expect(result.effective_rate_bps).toBe(0)
  })

  it('calculates basic rate taxpayer correctly', () => {
    // £30,000 salary — all within basic rate band
    const input = makeInput({
      income_sources: [{ amount: 3000000, description: 'Salary', income_type: 'employment' }],
    })
    const result = calculatePreview(input)!

    expect(result.gross_income).toBe(3000000)
    expect(result.adjusted_net_income).toBe(3000000)
    // PA = £12,570
    expect(result.personal_allowance).toBe(1257000)
    // Taxable = £30,000 - £12,570 = £17,430
    expect(result.taxable_income).toBe(1743000)
    // Tax = £17,430 * 20% = £3,486
    expect(result.income_tax).toBe(348600)
    expect(result.tax_bands).toHaveLength(1)
    expect(result.tax_bands[0].name).toBe('Basic Rate')
  })

  it('calculates higher rate taxpayer correctly', () => {
    // £60,000 salary — crosses into higher rate
    const input = makeInput({
      income_sources: [{ amount: 6000000, description: 'Salary', income_type: 'employment' }],
    })
    const result = calculatePreview(input)!

    expect(result.gross_income).toBe(6000000)
    expect(result.personal_allowance).toBe(1257000)
    // Taxable = £60,000 - £12,570 = £47,430
    expect(result.taxable_income).toBe(4743000)
    expect(result.tax_bands).toHaveLength(2)
    expect(result.tax_bands[0].name).toBe('Basic Rate')
    expect(result.tax_bands[1].name).toBe('Higher Rate')
  })

  it('tapers personal allowance above £100k', () => {
    // £120,000 salary — PA should be tapered
    const input = makeInput({
      income_sources: [{ amount: 12000000, description: 'Salary', income_type: 'employment' }],
    })
    const result = calculatePreview(input)!

    // ANI = £120,000. Excess above £100k = £20,000. Reduction = £10,000.
    // PA = £12,570 - £10,000 = £2,570
    expect(result.personal_allowance).toBe(257000)
  })

  it('fully tapers personal allowance above £125,140', () => {
    // £130,000 salary — PA fully tapered to 0
    const input = makeInput({
      income_sources: [{ amount: 13000000, description: 'Salary', income_type: 'employment' }],
    })
    const result = calculatePreview(input)!

    // ANI = £130,000. Excess = £30,000. Reduction = £15,000 > £12,570 so PA = 0
    expect(result.personal_allowance).toBe(0)
  })

  it('calculates NI correctly within main band', () => {
    // £30,000 salary — above PT (£12,048), below UEL (£50,296)
    const input = makeInput({
      income_sources: [{ amount: 3000000, description: 'Salary', income_type: 'employment' }],
    })
    const result = calculatePreview(input)!

    // NI = (£30,000 - £12,048) * 8% = £17,952 * 8% = £1,436.16 → £1,436 (floor)
    expect(result.national_insurance).toBe(143616)
  })

  it('calculates NI above upper earnings limit', () => {
    // £60,000 salary — above UEL (£50,296)
    const input = makeInput({
      income_sources: [{ amount: 6000000, description: 'Salary', income_type: 'employment' }],
    })
    const result = calculatePreview(input)!

    // Main band: (£50,296 - £12,048) * 8% = £38,248 * 8% = £3,059.84 → £3,059
    // Above UEL: (£60,000 - £50,296) * 2% = £9,704 * 2% = £194.08 → £194
    // Total: £3,059 + £194 = £3,253
    const mainBandNI = Math.floor((5029600 - 1204800) * 800 / 10000)
    const aboveUelNI = Math.floor((6000000 - 5029600) * 200 / 10000)
    expect(result.national_insurance).toBe(mainBandNI + aboveUelNI)
  })

  it('applies SIPP deduction to reduce ANI', () => {
    // £60,000 salary with £10,000 SIPP contribution
    const input = makeInput({
      income_sources: [{ amount: 6000000, description: 'Salary', income_type: 'employment' }],
      pension_contributions: { sipp_gross: 1000000, salary_sacrifice_pension: 0 },
    })
    const result = calculatePreview(input)!

    // ANI = £60,000 - £10,000 = £50,000
    expect(result.adjusted_net_income).toBe(5000000)
    // Gross income is still £60,000 (SIPP doesn't reduce gross)
    expect(result.gross_income).toBe(6000000)
    expect(result.total_deductions).toBe(1000000)
  })

  it('applies salary sacrifice to reduce gross and NI', () => {
    // £60,000 salary with £5,000 salary sacrifice
    const input = makeInput({
      income_sources: [{ amount: 6000000, description: 'Salary', income_type: 'employment' }],
      pension_contributions: { sipp_gross: 0, salary_sacrifice_pension: 500000 },
    })
    const result = calculatePreview(input)!

    // Gross = £60,000 - £5,000 = £55,000
    expect(result.gross_income).toBe(5500000)
    // NI calculated on £55,000
    expect(result.salary_sacrifice_reduction).toBe(500000)
  })

  it('applies Gift Aid deduction', () => {
    // £60,000 salary with £2,000 Gift Aid
    const input = makeInput({
      income_sources: [{ amount: 6000000, description: 'Salary', income_type: 'employment' }],
      gift_aid: { donations_gross: 200000 },
    })
    const result = calculatePreview(input)!

    expect(result.adjusted_net_income).toBe(5800000)
    expect(result.gift_aid_deduction).toBe(200000)
  })

  it('calculates HICBC for income between £60k-£80k', () => {
    // £70,000 salary with 1 child claiming benefit
    const input = makeInput({
      income_sources: [{ amount: 7000000, description: 'Salary', income_type: 'employment' }],
      child_benefit: { claimed: true, number_of_children: 1 },
    })
    const result = calculatePreview(input)!

    // ANI = £70,000. Excess above £60,000 = £10,000
    // Percentage = floor(£10,000 / £200) = 50%
    // Weekly benefit for 1 child: £25.60, annual = £25.60 * 52 = £1,331.20
    // HICBC = floor(£1,331.20 * 50%) = floor(£665.60) = £665
    const annualBenefit = 2560 * 52
    const pct = Math.min(100, Math.floor((7000000 - 6000000) / 20000))
    const expectedHICBC = Math.floor(annualBenefit * pct / 100)
    expect(result.hicbc).toBe(expectedHICBC)
  })

  it('charges full HICBC above £80k', () => {
    // £85,000 salary with 2 children
    const input = makeInput({
      income_sources: [{ amount: 8500000, description: 'Salary', income_type: 'employment' }],
      child_benefit: { claimed: true, number_of_children: 2 },
    })
    const result = calculatePreview(input)!

    // Full charge: weekly = £25.60 + £16.95 = £42.55, annual = £42.55 * 52 = £2,212.60
    const annualBenefit = (2560 + 1695) * 52
    expect(result.hicbc).toBe(annualBenefit)
  })

  it('no HICBC when not claimed', () => {
    const input = makeInput({
      income_sources: [{ amount: 8500000, description: 'Salary', income_type: 'employment' }],
      child_benefit: { claimed: false, number_of_children: 2 },
    })
    const result = calculatePreview(input)!
    expect(result.hicbc).toBe(0)
  })

  it('sums multiple income sources', () => {
    const input = makeInput({
      income_sources: [
        { amount: 3000000, description: 'Salary', income_type: 'employment' },
        { amount: 1000000, description: 'Self-employment', income_type: 'other' },
        { amount: 50000, description: 'Savings', income_type: 'other' },
        { amount: 200000, description: 'Dividends', income_type: 'other' },
        { amount: 100000, description: 'Rental', income_type: 'other' },
        { amount: 50000, description: 'Other', income_type: 'other' },
      ],
    })
    const result = calculatePreview(input)!

    // £30,000 + £10,000 + £500 + £2,000 + £1,000 + £500 = £44,000
    expect(result.gross_income).toBe(4400000)
  })

  it('net_income equals gross minus total_tax', () => {
    const input = makeInput({
      income_sources: [{ amount: 5000000, description: 'Salary', income_type: 'employment' }],
    })
    const result = calculatePreview(input)!
    expect(result.net_income).toBe(result.gross_income - result.total_tax)
  })

  it('total_tax equals income_tax + NI + HICBC', () => {
    const input = makeInput({
      income_sources: [{ amount: 7000000, description: 'Salary', income_type: 'employment' }],
      child_benefit: { claimed: true, number_of_children: 1 },
    })
    const result = calculatePreview(input)!
    expect(result.total_tax).toBe(result.income_tax + result.national_insurance + result.hicbc)
  })

  it('uses actual PA (not standard) for income tax band boundary when PA is zero', () => {
    // £130,000 salary, no deductions → PA fully tapered to 0
    const input = makeInput({
      income_sources: [{ amount: 13000000, description: 'Salary', income_type: 'employment' }],
    })
    const result = calculatePreview(input)!

    // PA = 0 (ANI = 130,000 > 125,140)
    expect(result.personal_allowance).toBe(0)

    // With PA=0: higherBandWidth = additionalRateThreshold − 0 − basicRateLimit
    // = 12,507,000 − 0 − 3,770,000 = 8,737,000p
    // basic: 3,770,000p → tax = floor(3,770,000 * 2000 / 10000) = 754,000p
    // higher: 8,737,000p → tax = floor(8,737,000 * 4000 / 10000) = 3,494,800p
    // additional: 13,000,000 − 3,770,000 − 8,737,000 = 493,000p → tax = floor(493,000 * 4500 / 10000) = 221,850p
    expect(result.income_tax).toBe(754000 + 3494800 + 221850) // = 4,470,650
    expect(result.tax_bands).toHaveLength(3)
    expect(result.tax_bands[1].name).toBe('Higher Rate')
    expect(result.tax_bands[1].income).toBe(8737000)
    expect(result.tax_bands[2].name).toBe('Additional Rate')
    expect(result.tax_bands[2].income).toBe(493000)
  })

  it('SIPP contribution restores partial PA and correctly shifts income tax bands', () => {
    // £130,000 salary, SIPP gross £10,000 (1,000,000p)
    const input = makeInput({
      income_sources: [{ amount: 13000000, description: 'Salary', income_type: 'employment' }],
      pension_contributions: { sipp_gross: 1000000, salary_sacrifice_pension: 0 },
    })
    const result = calculatePreview(input)!

    // ANI = 13,000,000 − 1,000,000 = 12,000,000p (£120,000)
    expect(result.adjusted_net_income).toBe(12000000)
    // PA: excess = 12,000,000 − 10,000,000 = 2,000,000; reduction = 1,000,000; PA = 1,257,000 − 1,000,000 = 257,000p
    expect(result.personal_allowance).toBe(257000)
    // taxable = 13,000,000 − 257,000 = 12,743,000p
    expect(result.taxable_income).toBe(12743000)
    // higherBandWidth = 12,507,000 − 257,000 − 3,770,000 = 8,480,000p
    // basic: 3,770,000p → tax = 754,000p
    // higher: 8,480,000p → tax = floor(8,480,000 * 4000 / 10000) = 3,392,000p
    // additional: 12,743,000 − 3,770,000 − 8,480,000 = 493,000p → tax = 221,850p
    expect(result.income_tax).toBe(754000 + 3392000 + 221850) // = 4,367,850
  })

  it('works with 2025-26 tax year', () => {
    const input = makeInput({
      tax_year: '2025-26',
      income_sources: [{ amount: 5000000, description: 'Salary', income_type: 'employment' }],
    })
    const result = calculatePreview(input)!
    expect(result).not.toBeNull()
    expect(result.gross_income).toBe(5000000)
    // PA is same for 2025-26
    expect(result.personal_allowance).toBe(1257000)
  })
})
