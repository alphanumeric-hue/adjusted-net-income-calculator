package domain

// TaxYearBands holds all HMRC thresholds and rates for a specific tax year.
// Monetary values are in pence. Rates are in basis points (e.g. 2000 = 20.00%).
type TaxYearBands struct {
	Year                       string
	PersonalAllowance          int64
	PATaperThreshold           int64
	BasicRateLimit             int64
	HigherRateThreshold        int64
	AdditionalRateThreshold    int64
	BasicRateBPS               int
	HigherRateBPS              int
	AdditionalRateBPS          int
	NIPrimaryThreshold         int64
	NIUpperEarningsLimit       int64
	NIRateBelowUELBPS          int
	NIRateAboveUELBPS          int
	EmployerNIRateBPS          int
	EmployerNIThreshold        int64
	HICBCThreshold             int64
	HICBCUpperLimit            int64
	ChildBenefitWeeklyFirst    int64
	ChildBenefitWeeklySubsequent int64
	DividendAllowance          int64
	SavingsAllowanceBasic      int64
	SavingsAllowanceHigher     int64
}

// AllTaxYearBands contains the HMRC tax parameters for all supported tax years.
var AllTaxYearBands = map[string]TaxYearBands{
	"2024-25": TaxYear2024_25,
	"2025-26": TaxYear2025_26,
}

// TaxYear2024_25 contains HMRC thresholds and rates for the 2024-25 tax year.
var TaxYear2024_25 = TaxYearBands{
	Year:                        "2024-25",
	PersonalAllowance:           1257000, // £12,570
	PATaperThreshold:            10000000, // £100,000
	BasicRateLimit:              3770000, // £37,700 (basic rate band width)
	HigherRateThreshold:         5027000, // £50,270 (BasicRateLimit + PersonalAllowance)
	AdditionalRateThreshold:     12507000, // £125,070
	BasicRateBPS:                2000,  // 20%
	HigherRateBPS:               4000,  // 40%
	AdditionalRateBPS:           4500,  // 45%
	NIPrimaryThreshold:          1204800, // £12,048 per year
	NIUpperEarningsLimit:        5029600, // £50,296 per year
	NIRateBelowUELBPS:           800,   // 8%
	NIRateAboveUELBPS:           200,   // 2%
	EmployerNIRateBPS:           1380,  // 13.8%
	EmployerNIThreshold:         917500, // £9,175 per year
	HICBCThreshold:              6000000, // £60,000
	HICBCUpperLimit:             8000000, // £80,000
	ChildBenefitWeeklyFirst:     2560, // £25.60 per week
	ChildBenefitWeeklySubsequent: 1695, // £16.95 per week
	DividendAllowance:           50000,  // £500
	SavingsAllowanceBasic:       100000, // £1,000
	SavingsAllowanceHigher:      50000,  // £500
}

// TaxYear2025_26 contains HMRC thresholds and rates for the 2025-26 tax year.
var TaxYear2025_26 = TaxYearBands{
	Year:                        "2025-26",
	PersonalAllowance:           1257000, // £12,570
	PATaperThreshold:            10000000, // £100,000
	BasicRateLimit:              3770000, // £37,700
	HigherRateThreshold:         5027000, // £50,270
	AdditionalRateThreshold:     12507000, // £125,070
	BasicRateBPS:                2000,  // 20%
	HigherRateBPS:               4000,  // 40%
	AdditionalRateBPS:           4500,  // 45%
	NIPrimaryThreshold:          1204800, // £12,048 per year
	NIUpperEarningsLimit:        5029600, // £50,296 per year
	NIRateBelowUELBPS:           800,   // 8%
	NIRateAboveUELBPS:           200,   // 2%
	EmployerNIRateBPS:           1500,  // 15%
	EmployerNIThreshold:         517500,  // £5,175 per year
	HICBCThreshold:              6000000, // £60,000
	HICBCUpperLimit:             8000000, // £80,000
	ChildBenefitWeeklyFirst:     2660, // £26.60 per week
	ChildBenefitWeeklySubsequent: 1760, // £17.60 per week
	DividendAllowance:           50000,  // £500
	SavingsAllowanceBasic:       100000, // £1,000
	SavingsAllowanceHigher:      50000,  // £500
}

// GetBands returns the TaxYearBands for the given tax year string, or false if not found.
func GetBands(taxYear string) (TaxYearBands, bool) {
	bands, ok := AllTaxYearBands[taxYear]
	return bands, ok
}

// SupportedTaxYears returns a list of all supported tax year strings.
func SupportedTaxYears() []string {
	years := make([]string, 0, len(AllTaxYearBands))
	for y := range AllTaxYearBands {
		years = append(years, y)
	}
	return years
}
