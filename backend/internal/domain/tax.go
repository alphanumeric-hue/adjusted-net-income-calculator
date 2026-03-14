package domain

// GrossIncome calculates total gross income across all income sources before any deductions.
// Salary sacrifice reduces gross income directly; the result is clamped to zero.
// All values are in pence.
func GrossIncome(input TaxInput) int64 {
	var total int64
	for _, src := range input.IncomeSources {
		total += src.Amount
	}

	total -= input.PensionContributions.SalarySacrificePension
	if total < 0 {
		return 0
	}
	return total
}

// AdjustedNetIncome calculates the adjusted net income by deducting qualifying
// pension contributions, gift aid, and trading losses from gross income.
// This figure determines personal allowance tapering and HICBC liability.
func AdjustedNetIncome(input TaxInput) int64 {
	gross := GrossIncome(input)

	deductions := input.PensionContributions.SIPPGross +
		input.GiftAid.DonationsGross +
		input.TradingLosses

	ani := gross - deductions
	if ani < 0 {
		return 0
	}
	return ani
}

// TotalDeductions returns the sum of all qualifying deductions from gross income.
func TotalDeductions(input TaxInput) int64 {
	return input.PensionContributions.SIPPGross +
		input.GiftAid.DonationsGross +
		input.TradingLosses
}

// PersonalAllowance calculates the personal allowance after tapering.
// For every £2 of adjusted net income above the taper threshold (£100,000),
// the personal allowance is reduced by £1 until it reaches zero.
func PersonalAllowance(ani int64, bands TaxYearBands) int64 {
	pa := bands.PersonalAllowance

	if ani <= bands.PATaperThreshold {
		return pa
	}

	excess := ani - bands.PATaperThreshold
	reduction := excess / 2

	pa -= reduction
	if pa < 0 {
		return 0
	}
	return pa
}

// IncomeTax calculates income tax liability across the basic, higher, and additional
// rate bands. Returns the total tax and a breakdown by band.
// taxableIncome should be gross income minus personal allowance (not ANI).
// pa is the actual personal allowance after tapering, used to determine the higher rate band width.
func IncomeTax(taxableIncome int64, pa int64, bands TaxYearBands) (int64, []TaxBand) {
	if taxableIncome <= 0 {
		return 0, []TaxBand{}
	}

	var totalTax int64
	var taxBands []TaxBand
	remaining := taxableIncome

	// Basic rate band
	basicBandWidth := bands.BasicRateLimit
	basicIncome := min64(remaining, basicBandWidth)
	if basicIncome > 0 {
		basicTax := applyRate(basicIncome, bands.BasicRateBPS)
		taxBands = append(taxBands, TaxBand{
			Name:       "Basic Rate",
			LowerBound: 0,
			UpperBound: basicBandWidth,
			Rate:       bands.BasicRateBPS,
			TaxAmount:  basicTax,
			Income:     basicIncome,
		})
		totalTax += basicTax
		remaining -= basicIncome
	}

	// Higher rate band
	higherBandWidth := bands.AdditionalRateThreshold - pa - bands.BasicRateLimit
	if higherBandWidth < 0 {
		higherBandWidth = 0
	}
	higherIncome := min64(remaining, higherBandWidth)
	if higherIncome > 0 {
		higherTax := applyRate(higherIncome, bands.HigherRateBPS)
		taxBands = append(taxBands, TaxBand{
			Name:       "Higher Rate",
			LowerBound: basicBandWidth,
			UpperBound: basicBandWidth + higherBandWidth,
			Rate:       bands.HigherRateBPS,
			TaxAmount:  higherTax,
			Income:     higherIncome,
		})
		totalTax += higherTax
		remaining -= higherIncome
	}

	// Additional rate band
	if remaining > 0 {
		additionalTax := applyRate(remaining, bands.AdditionalRateBPS)
		taxBands = append(taxBands, TaxBand{
			Name:       "Additional Rate",
			LowerBound: basicBandWidth + higherBandWidth,
			UpperBound: 0, // unlimited
			Rate:       bands.AdditionalRateBPS,
			TaxAmount:  additionalTax,
			Income:     remaining,
		})
		totalTax += additionalTax
	}

	return totalTax, taxBands
}

// NationalInsurance calculates Class 1 employee National Insurance contributions.
// 8% on earnings between the primary threshold and upper earnings limit,
// 2% on earnings above the upper earnings limit.
func NationalInsurance(grossEmployment int64, bands TaxYearBands) int64 {
	if grossEmployment <= bands.NIPrimaryThreshold {
		return 0
	}

	var ni int64

	// Earnings between primary threshold and UEL
	earningsInMainBand := min64(grossEmployment, bands.NIUpperEarningsLimit) - bands.NIPrimaryThreshold
	if earningsInMainBand > 0 {
		ni += applyRate(earningsInMainBand, bands.NIRateBelowUELBPS)
	}

	// Earnings above UEL
	earningsAboveUEL := grossEmployment - bands.NIUpperEarningsLimit
	if earningsAboveUEL > 0 {
		ni += applyRate(earningsAboveUEL, bands.NIRateAboveUELBPS)
	}

	return ni
}

// EmployeeNISaved calculates the employee NI savings from salary sacrifice.
// Salary sacrifice reduces gross pay, which reduces the amount subject to NI.
func EmployeeNISaved(salarySacrifice int64, grossSalaryBeforeSacrifice int64, bands TaxYearBands) int64 {
	niWithout := NationalInsurance(grossSalaryBeforeSacrifice, bands)
	niWith := NationalInsurance(grossSalaryBeforeSacrifice-salarySacrifice, bands)
	return niWithout - niWith
}

// EmployerNISaved calculates the employer NI savings from salary sacrifice.
func EmployerNISaved(salarySacrifice int64, grossSalaryBeforeSacrifice int64, bands TaxYearBands) int64 {
	niWithout := employerNI(grossSalaryBeforeSacrifice, bands)
	niWith := employerNI(grossSalaryBeforeSacrifice-salarySacrifice, bands)
	return niWithout - niWith
}

// employerNI calculates the employer's NI liability on gross employment earnings.
func employerNI(grossEmployment int64, bands TaxYearBands) int64 {
	if grossEmployment <= bands.EmployerNIThreshold {
		return 0
	}
	earningsAboveThreshold := grossEmployment - bands.EmployerNIThreshold
	return applyRate(earningsAboveThreshold, bands.EmployerNIRateBPS)
}

// HICBC calculates the High Income Child Benefit Charge.
// The charge is 1% of the annual child benefit for every £200 (20000 pence)
// of adjusted net income above the threshold, up to 100%.
func HICBC(ani int64, numChildren int, bands TaxYearBands) int64 {
	if !shouldChargeHICBC(ani, numChildren, bands) {
		return 0
	}

	annualBenefit := AnnualChildBenefit(numChildren, bands)

	if ani >= bands.HICBCUpperLimit {
		return annualBenefit
	}

	excess := ani - bands.HICBCThreshold
	// 1% per £200 (20000 pence) above threshold
	percentCharge := excess / 20000
	if percentCharge > 100 {
		percentCharge = 100
	}

	return annualBenefit * percentCharge / 100
}

// shouldChargeHICBC determines whether the HICBC applies given ANI and number of children.
func shouldChargeHICBC(ani int64, numChildren int, bands TaxYearBands) bool {
	return numChildren > 0 && ani > bands.HICBCThreshold
}

// AnnualChildBenefit calculates the total annual child benefit for the given number of children.
func AnnualChildBenefit(numChildren int, bands TaxYearBands) int64 {
	if numChildren <= 0 {
		return 0
	}

	weekly := bands.ChildBenefitWeeklyFirst
	if numChildren > 1 {
		weekly += bands.ChildBenefitWeeklySubsequent * int64(numChildren-1)
	}

	// 52 weeks per year
	return weekly * 52
}

// MarginalRate calculates the marginal tax rate at the given income level,
// accounting for the 60% effective marginal rate in the PA taper zone.
// Returns the rate in basis points.
func MarginalRate(ani int64, bands TaxYearBands) int {
	pa := PersonalAllowance(ani, bands)
	taxableIncome := ani - pa

	// In the PA taper zone (£100k-£125,070 for 2024-25), effective marginal rate is 60%
	if ani > bands.PATaperThreshold && ani < bands.AdditionalRateThreshold {
		return 6000 // 60%
	}

	if taxableIncome <= 0 {
		return 0
	}

	if taxableIncome <= bands.BasicRateLimit {
		return bands.BasicRateBPS
	}

	additionalThreshold := bands.AdditionalRateThreshold - bands.PersonalAllowance
	if taxableIncome <= additionalThreshold {
		return bands.HigherRateBPS
	}

	return bands.AdditionalRateBPS
}

// grossEmploymentIncome sums all income sources with IncomeType == "employment".
func grossEmploymentIncome(input TaxInput) int64 {
	var total int64
	for _, src := range input.IncomeSources {
		if src.IncomeType == "employment" {
			total += src.Amount
		}
	}
	return total
}

// Calculate performs the full tax calculation for the given inputs and tax year bands.
// Returns a complete TaxResult with all intermediate and final values.
func Calculate(input TaxInput, bands TaxYearBands) TaxResult {
	gross := GrossIncome(input)
	deductions := TotalDeductions(input)
	ani := AdjustedNetIncome(input)
	pa := PersonalAllowance(ani, bands)

	taxableIncome := gross - pa
	if taxableIncome < 0 {
		taxableIncome = 0
	}

	incomeTax, taxBands := IncomeTax(taxableIncome, pa, bands)

	// NI is calculated on gross employment income after salary sacrifice
	salarySacrifice := input.PensionContributions.SalarySacrificePension
	grossEmploymentBeforeSacrifice := grossEmploymentIncome(input)
	grossEmployment := grossEmploymentBeforeSacrifice - salarySacrifice
	if grossEmployment < 0 {
		grossEmployment = 0
	}
	ni := NationalInsurance(grossEmployment, bands)

	// Salary sacrifice NI savings use gross employment before sacrifice
	empNISaved := EmployeeNISaved(salarySacrifice, grossEmploymentBeforeSacrifice, bands)
	employerNISaved := EmployerNISaved(salarySacrifice, grossEmploymentBeforeSacrifice, bands)

	// HICBC
	var hicbc int64
	if input.ChildBenefit.Claimed {
		hicbc = HICBC(ani, input.ChildBenefit.NumberOfChildren, bands)
	}

	totalTax := incomeTax + ni + hicbc
	netIncome := gross - totalTax

	// Effective rate in basis points
	var effectiveRateBPS int
	if gross > 0 {
		effectiveRateBPS = int(totalTax * 10000 / gross)
	}

	marginalRateBPS := MarginalRate(ani, bands)

	return TaxResult{
		GrossIncome:              gross,
		TotalDeductions:          deductions,
		AdjustedNetIncome:        ani,
		PersonalAllowance:        pa,
		TaxableIncome:            taxableIncome,
		IncomeTax:                incomeTax,
		TaxBands:                 taxBands,
		NationalInsurance:        ni,
		EmployeeNISaved:          empNISaved,
		EmployerNISaved:          employerNISaved,
		HICBC:                    hicbc,
		TotalTax:                 totalTax,
		NetIncome:                netIncome,
		EffectiveRateBPS:         effectiveRateBPS,
		MarginalRateBPS:          marginalRateBPS,
		SalarySacrificeReduction: salarySacrifice,
		SIPPRelief:               input.PensionContributions.SIPPGross,
		GiftAidDeduction:         input.GiftAid.DonationsGross,
	}
}

// applyRate applies a basis-point rate to an amount and returns the result in pence.
func applyRate(amount int64, rateBPS int) int64 {
	return amount * int64(rateBPS) / 10000
}

// min64 returns the smaller of two int64 values.
func min64(a, b int64) int64 {
	if a < b {
		return a
	}
	return b
}
