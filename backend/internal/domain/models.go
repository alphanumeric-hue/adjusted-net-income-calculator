package domain

// IncomeSource represents a single income entry with amount, label, and type.
type IncomeSource struct {
	Amount      int64  `json:"amount"`
	Description string `json:"description"`
	IncomeType  string `json:"income_type"` // "employment" | "other"
}

// PensionContributions holds pension contribution details. All monetary values are in pence.
// SalarySacrificePension is here (moved from the old Employment struct) as it is a pension
// contribution method that reduces gross employment income before tax and NI.
type PensionContributions struct {
	SIPPGross              int64 `json:"sipp_gross"`
	SalarySacrificePension int64 `json:"salary_sacrifice_pension"`
}

// GiftAid holds Gift Aid donation details. All monetary values are in pence.
type GiftAid struct {
	DonationsGross int64 `json:"donations_gross"`
}

// ChildBenefit holds child benefit claim details.
type ChildBenefit struct {
	Claimed          bool `json:"claimed"`
	NumberOfChildren int  `json:"number_of_children"`
}

// TaxInput represents all user-provided tax inputs for a single scenario.
type TaxInput struct {
	TaxYear              string               `json:"tax_year"`
	IncomeSources        []IncomeSource        `json:"income_sources"`
	PensionContributions PensionContributions  `json:"pension_contributions"`
	GiftAid              GiftAid              `json:"gift_aid"`
	TradingLosses        int64                `json:"trading_losses"` // ANI deduction (moved from old SelfEmployment)
	ChildBenefit         ChildBenefit         `json:"child_benefit"`
}

// TaxBand represents a single tax band in the income tax breakdown.
type TaxBand struct {
	Name       string `json:"name"`
	LowerBound int64  `json:"lower_bound"`
	UpperBound int64  `json:"upper_bound"`
	Rate       int    `json:"rate"`
	TaxAmount  int64  `json:"tax_amount"`
	Income     int64  `json:"income"`
}

// TaxResult holds the complete calculated tax breakdown. All monetary values are in pence.
type TaxResult struct {
	GrossIncome              int64     `json:"gross_income"`
	TotalDeductions          int64     `json:"total_deductions"`
	AdjustedNetIncome        int64     `json:"adjusted_net_income"`
	PersonalAllowance        int64     `json:"personal_allowance"`
	TaxableIncome            int64     `json:"taxable_income"`
	IncomeTax                int64     `json:"income_tax"`
	TaxBands                 []TaxBand `json:"tax_bands"`
	NationalInsurance        int64     `json:"national_insurance"`
	EmployeeNISaved          int64     `json:"employee_ni_saved"`
	EmployerNISaved          int64     `json:"employer_ni_saved"`
	HICBC                    int64     `json:"hicbc"`
	TotalTax                 int64     `json:"total_tax"`
	NetIncome                int64     `json:"net_income"`
	EffectiveRateBPS         int       `json:"effective_rate_bps"`
	MarginalRateBPS          int       `json:"marginal_rate_bps"`
	SalarySacrificeReduction int64     `json:"salary_sacrifice_reduction"`
	SIPPRelief               int64     `json:"sipp_relief"`
	GiftAidDeduction         int64     `json:"gift_aid_deduction"`
}
