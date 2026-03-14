package domain

import (
	"testing"
)

// pence is a helper to convert pounds to pence for test readability.
func pence(pounds int64) int64 {
	return pounds * 100
}

func TestGrossIncome(t *testing.T) {
	tests := []struct {
		name     string
		input    TaxInput
		expected int64
	}{
		{
			name:     "zero income",
			input:    TaxInput{},
			expected: 0,
		},
		{
			name: "employment only",
			input: TaxInput{
				IncomeSources: []IncomeSource{{Amount: pence(50000), Description: "Salary", IncomeType: "employment"}},
			},
			expected: pence(50000),
		},
		{
			name: "employment with salary sacrifice reduces gross",
			input: TaxInput{
				IncomeSources:        []IncomeSource{{Amount: pence(50000), Description: "Salary", IncomeType: "employment"}},
				PensionContributions: PensionContributions{SalarySacrificePension: pence(5000)},
			},
			expected: pence(45000),
		},
		{
			name: "multiple income sources",
			input: TaxInput{
				IncomeSources: []IncomeSource{
					{Amount: pence(50000), Description: "Salary", IncomeType: "employment"},
					{Amount: pence(10000), Description: "Self-employment", IncomeType: "other"},
					{Amount: pence(500), Description: "Savings interest", IncomeType: "other"},
					{Amount: pence(2000), Description: "Dividends", IncomeType: "other"},
					{Amount: pence(5000), Description: "Rental income", IncomeType: "other"},
					{Amount: pence(1000), Description: "Other income", IncomeType: "other"},
				},
			},
			expected: pence(68500),
		},
		{
			name: "employment with benefits in kind",
			input: TaxInput{
				IncomeSources: []IncomeSource{
					{Amount: pence(50000), Description: "Salary", IncomeType: "employment"},
					{Amount: pence(3000), Description: "Benefits in kind", IncomeType: "other"},
				},
			},
			expected: pence(53000),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := GrossIncome(tt.input)
			if got != tt.expected {
				t.Errorf("GrossIncome() = %d, want %d", got, tt.expected)
			}
		})
	}
}

func TestAdjustedNetIncome(t *testing.T) {
	tests := []struct {
		name     string
		input    TaxInput
		expected int64
	}{
		{
			name:     "zero income",
			input:    TaxInput{},
			expected: 0,
		},
		{
			name: "no deductions",
			input: TaxInput{
				IncomeSources: []IncomeSource{{Amount: pence(85000), Description: "Salary", IncomeType: "employment"}},
			},
			expected: pence(85000),
		},
		{
			name: "with SIPP contribution",
			input: TaxInput{
				IncomeSources:        []IncomeSource{{Amount: pence(85000), Description: "Salary", IncomeType: "employment"}},
				PensionContributions: PensionContributions{SIPPGross: pence(10000)},
			},
			expected: pence(75000),
		},
		{
			name: "with salary sacrifice and SIPP",
			input: TaxInput{
				IncomeSources: []IncomeSource{{Amount: pence(85000), Description: "Salary", IncomeType: "employment"}},
				PensionContributions: PensionContributions{
					SalarySacrificePension: pence(5000),
					SIPPGross:              pence(10000),
				},
			},
			// Gross = 85000 - 5000 = 80000, ANI = 80000 - 10000 = 70000
			expected: pence(70000),
		},
		{
			name: "with gift aid",
			input: TaxInput{
				IncomeSources: []IncomeSource{{Amount: pence(85000), Description: "Salary", IncomeType: "employment"}},
				GiftAid:       GiftAid{DonationsGross: pence(500)},
			},
			expected: pence(84500),
		},
		{
			name: "with trading losses",
			input: TaxInput{
				IncomeSources: []IncomeSource{
					{Amount: pence(50000), Description: "Salary", IncomeType: "employment"},
					{Amount: pence(10000), Description: "Self-employment", IncomeType: "other"},
				},
				TradingLosses: pence(15000),
			},
			// Gross = 60000, ANI = 60000 - 15000 = 45000
			expected: pence(45000),
		},
		{
			name: "all deductions combined",
			input: TaxInput{
				IncomeSources: []IncomeSource{{Amount: pence(120000), Description: "Salary", IncomeType: "employment"}},
				PensionContributions: PensionContributions{
					SalarySacrificePension: pence(5000),
					SIPPGross:              pence(10000),
				},
				GiftAid:       GiftAid{DonationsGross: pence(1000)},
				TradingLosses: pence(2000),
			},
			// Gross = 120000 - 5000 = 115000, ANI = 115000 - 10000 - 1000 - 2000 = 102000
			expected: pence(102000),
		},
		{
			name: "deductions cannot make ANI negative",
			input: TaxInput{
				IncomeSources:        []IncomeSource{{Amount: pence(5000), Description: "Salary", IncomeType: "employment"}},
				PensionContributions: PensionContributions{SIPPGross: pence(10000)},
			},
			expected: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := AdjustedNetIncome(tt.input)
			if got != tt.expected {
				t.Errorf("AdjustedNetIncome() = %d, want %d", got, tt.expected)
			}
		})
	}
}

func TestPersonalAllowance(t *testing.T) {
	bands := TaxYear2024_25

	tests := []struct {
		name     string
		ani      int64
		expected int64
	}{
		{
			name:     "below taper threshold",
			ani:      pence(50000),
			expected: pence(12570),
		},
		{
			name:     "exactly at taper threshold",
			ani:      pence(100000),
			expected: pence(12570),
		},
		{
			name:     "just above taper threshold",
			ani:      pence(100001),
			// Excess = 100 pence, reduction = 50 pence
			expected: 1257000 - 50,
		},
		{
			name:     "partial taper at £110,000",
			ani:      pence(110000),
			// Excess = £10,000 = 1000000 pence, reduction = 500000 pence = £5,000
			expected: pence(7570),
		},
		{
			name:     "fully tapered at £125,140",
			ani:      pence(125140),
			expected: 0,
		},
		{
			name:     "above full taper",
			ani:      pence(150000),
			expected: 0,
		},
		{
			name:     "zero income",
			ani:      0,
			expected: pence(12570),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := PersonalAllowance(tt.ani, bands)
			if got != tt.expected {
				t.Errorf("PersonalAllowance(%d) = %d, want %d", tt.ani, got, tt.expected)
			}
		})
	}
}

func TestIncomeTax(t *testing.T) {
	bands := TaxYear2024_25

	tests := []struct {
		name        string
		taxable     int64
		expectedTax int64
	}{
		{
			name:        "zero taxable income",
			taxable:     0,
			expectedTax: 0,
		},
		{
			name:        "basic rate only - £20,000 taxable",
			taxable:     pence(20000),
			expectedTax: pence(4000), // 20% of £20,000
		},
		{
			name:        "full basic rate band - £37,700 taxable",
			taxable:     pence(37700),
			expectedTax: 754000, // 20% of £37,700 = £7,540.00
		},
		{
			name:    "basic + higher rate - £50,000 taxable",
			taxable: pence(50000),
			// Basic: 37700 * 20% = 7540.00, Higher: (50000-37700) * 40% = 12300 * 40% = 4920.00
			// Total = 12460.00
			expectedTax: 1246000,
		},
		{
			name:    "into additional rate - £200,000 taxable",
			taxable: pence(200000),
			// Basic: 37700 * 20% = 7540.00
			// Higher band width = (125070 - 12570 - 37700)*100 = 7480000 pence
			// remaining after basic = 200000-37700 = 162300 → 16230000 pence
			// Higher income = min(16230000, 7480000) = 7480000 → tax = 7480000*40% = 2992000
			// Additional income = 16230000 - 7480000 = 8750000 → tax = 8750000*45% = 3937500
			// Total = 754000 + 2992000 + 3937500 = 7683500
			expectedTax: 7683500,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, _ := IncomeTax(tt.taxable, bands.PersonalAllowance, bands)
			if got != tt.expectedTax {
				t.Errorf("IncomeTax(%d) = %d, want %d", tt.taxable, got, tt.expectedTax)
			}
		})
	}
}

func TestIncomeTaxBands(t *testing.T) {
	bands := TaxYear2024_25

	// Test that bands are returned correctly for basic+higher income
	_, taxBands := IncomeTax(pence(50000), bands.PersonalAllowance, bands)
	if len(taxBands) != 2 {
		t.Fatalf("expected 2 tax bands, got %d", len(taxBands))
	}
	if taxBands[0].Name != "Basic Rate" {
		t.Errorf("first band should be Basic Rate, got %s", taxBands[0].Name)
	}
	if taxBands[1].Name != "Higher Rate" {
		t.Errorf("second band should be Higher Rate, got %s", taxBands[1].Name)
	}
}

func TestNationalInsurance(t *testing.T) {
	bands := TaxYear2024_25

	tests := []struct {
		name     string
		gross    int64
		expected int64
	}{
		{
			name:     "below primary threshold",
			gross:    pence(10000),
			expected: 0,
		},
		{
			name:     "at primary threshold",
			gross:    pence(12048),
			expected: 0,
		},
		{
			name:  "between PT and UEL - £30,000",
			gross: pence(30000),
			// (30000 - 12048) * 8% = 17952 * 8% = £1,436.16
			expected: 143616,
		},
		{
			name:  "at UEL - £50,296",
			gross: pence(50296),
			// (50296 - 12048) * 8% = 38248 * 8% = £3,059.84
			expected: 305984,
		},
		{
			name:  "above UEL - £80,000",
			gross: pence(80000),
			// Main band: (50296 - 12048) * 8% = 38248 * 8% = 3059.84
			// Above UEL: (80000 - 50296) * 2% = 29704 * 2% = 594.08
			// Total = 3653.92
			expected: 365392,
		},
		{
			name:     "zero income",
			gross:    0,
			expected: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := NationalInsurance(tt.gross, bands)
			if got != tt.expected {
				t.Errorf("NationalInsurance(%d) = %d, want %d", tt.gross, got, tt.expected)
			}
		})
	}
}

func TestHICBC(t *testing.T) {
	bands := TaxYear2024_25

	tests := []struct {
		name        string
		ani         int64
		numChildren int
		expected    int64
	}{
		{
			name:        "below threshold with children",
			ani:         pence(50000),
			numChildren: 2,
			expected:    0,
		},
		{
			name:        "at threshold exactly",
			ani:         pence(60000),
			numChildren: 2,
			expected:    0,
		},
		{
			name:        "above threshold no children",
			ani:         pence(70000),
			numChildren: 0,
			expected:    0,
		},
		{
			name:        "partial charge at £70,000 with 1 child",
			ani:         pence(70000),
			numChildren: 1,
			// Annual benefit for 1 child: 2560 * 52 = 133120 pence (£1,331.20)
			// Excess = £10,000, charge = 10000*100/200 = 50%
			// HICBC = 133120 * 50 / 100 = 66560
			expected: 66560,
		},
		{
			name:        "full charge at £80,000 with 2 children",
			ani:         pence(80000),
			numChildren: 2,
			// Annual benefit: first child 2560*52 = 133120, second child 1695*52 = 88140
			// Total = 221260 pence
			expected: 221260,
		},
		{
			name:        "above upper limit with 2 children",
			ani:         pence(90000),
			numChildren: 2,
			// Full 100% charge = total annual benefit
			expected: 221260,
		},
		{
			name:        "partial charge at £65,000 with 3 children",
			ani:         pence(65000),
			numChildren: 3,
			// Annual benefit: 2560 + 1695 + 1695 = 5950 weekly, * 52 = 309400 pence
			// Excess = £5,000 = 500000 pence, charge % = 500000/20000 = 25%
			// HICBC = 309400 * 25 / 100 = 77350
			expected: 77350,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := HICBC(tt.ani, tt.numChildren, bands)
			if got != tt.expected {
				t.Errorf("HICBC(%d, %d) = %d, want %d", tt.ani, tt.numChildren, got, tt.expected)
			}
		})
	}
}

func TestAnnualChildBenefit(t *testing.T) {
	bands := TaxYear2024_25

	tests := []struct {
		name        string
		numChildren int
		expected    int64
	}{
		{"no children", 0, 0},
		{"one child", 1, 2560 * 52},                // £1,331.20
		{"two children", 2, (2560 + 1695) * 52},    // £2,212.60
		{"three children", 3, (2560 + 1695*2) * 52}, // £3,093.80 (approx)
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := AnnualChildBenefit(tt.numChildren, bands)
			if got != tt.expected {
				t.Errorf("AnnualChildBenefit(%d) = %d, want %d", tt.numChildren, got, tt.expected)
			}
		})
	}
}

func TestCalculate_BasicScenario(t *testing.T) {
	// Test: £50,000 salary, no deductions, no children
	bands := TaxYear2024_25
	input := TaxInput{
		IncomeSources: []IncomeSource{{Amount: pence(50000), Description: "Salary", IncomeType: "employment"}},
		TaxYear:       "2024-25",
	}

	result := Calculate(input, bands)

	if result.GrossIncome != pence(50000) {
		t.Errorf("GrossIncome = %d, want %d", result.GrossIncome, pence(50000))
	}
	if result.AdjustedNetIncome != pence(50000) {
		t.Errorf("AdjustedNetIncome = %d, want %d", result.AdjustedNetIncome, pence(50000))
	}
	if result.PersonalAllowance != pence(12570) {
		t.Errorf("PersonalAllowance = %d, want %d", result.PersonalAllowance, pence(12570))
	}
	if result.TaxableIncome != pence(37430) {
		t.Errorf("TaxableIncome = %d, want %d", result.TaxableIncome, pence(37430))
	}
	// Tax: 37430 * 20% = £7,486
	if result.IncomeTax != 748600 {
		t.Errorf("IncomeTax = %d, want %d", result.IncomeTax, 748600)
	}
}

func TestCalculate_HighIncomeWithTapering(t *testing.T) {
	// Test: £120,000 salary — PA tapered
	bands := TaxYear2024_25
	input := TaxInput{
		IncomeSources: []IncomeSource{{Amount: pence(120000), Description: "Salary", IncomeType: "employment"}},
		TaxYear:       "2024-25",
	}

	result := Calculate(input, bands)

	if result.GrossIncome != pence(120000) {
		t.Errorf("GrossIncome = %d, want %d", result.GrossIncome, pence(120000))
	}
	if result.AdjustedNetIncome != pence(120000) {
		t.Errorf("AdjustedNetIncome = %d, want %d", result.AdjustedNetIncome, pence(120000))
	}
	// PA: 12570 - (120000-100000)/2 = 12570 - 10000 = 2570
	if result.PersonalAllowance != pence(2570) {
		t.Errorf("PersonalAllowance = %d, want %d", result.PersonalAllowance, pence(2570))
	}
	// Taxable: 120000 - 2570 = 117430
	if result.TaxableIncome != pence(117430) {
		t.Errorf("TaxableIncome = %d, want %d", result.TaxableIncome, pence(117430))
	}
}

func TestCalculate_WithSIPPReducingANI(t *testing.T) {
	// Test: £110,000 salary, £10,000 SIPP — should restore some PA
	bands := TaxYear2024_25
	input := TaxInput{
		IncomeSources:        []IncomeSource{{Amount: pence(110000), Description: "Salary", IncomeType: "employment"}},
		PensionContributions: PensionContributions{SIPPGross: pence(10000)},
		TaxYear:              "2024-25",
	}

	result := Calculate(input, bands)

	if result.AdjustedNetIncome != pence(100000) {
		t.Errorf("AdjustedNetIncome = %d, want %d", result.AdjustedNetIncome, pence(100000))
	}
	// ANI at exactly £100,000 means full PA
	if result.PersonalAllowance != pence(12570) {
		t.Errorf("PersonalAllowance = %d, want %d", result.PersonalAllowance, pence(12570))
	}
}

func TestCalculate_SalarySacrificeImpact(t *testing.T) {
	// Test: £60,000 salary with £5,000 salary sacrifice
	bands := TaxYear2024_25
	input := TaxInput{
		IncomeSources:        []IncomeSource{{Amount: pence(60000), Description: "Salary", IncomeType: "employment"}},
		PensionContributions: PensionContributions{SalarySacrificePension: pence(5000)},
		TaxYear:              "2024-25",
	}

	result := Calculate(input, bands)

	// Gross income is reduced by salary sacrifice
	if result.GrossIncome != pence(55000) {
		t.Errorf("GrossIncome = %d, want %d", result.GrossIncome, pence(55000))
	}
	// Should have NI savings
	if result.EmployeeNISaved <= 0 {
		t.Error("expected positive employee NI savings from salary sacrifice")
	}
	if result.EmployerNISaved <= 0 {
		t.Error("expected positive employer NI savings from salary sacrifice")
	}
}

func TestCalculate_WithChildBenefitCharge(t *testing.T) {
	// Test: £70,000 salary, claiming child benefit for 2 children
	bands := TaxYear2024_25
	input := TaxInput{
		IncomeSources: []IncomeSource{{Amount: pence(70000), Description: "Salary", IncomeType: "employment"}},
		ChildBenefit:  ChildBenefit{Claimed: true, NumberOfChildren: 2},
		TaxYear:       "2024-25",
	}

	result := Calculate(input, bands)

	if result.HICBC <= 0 {
		t.Error("expected positive HICBC charge at £70,000 with children")
	}
	// At £70,000 with 2 children: 50% charge
	annualBenefit := AnnualChildBenefit(2, bands)
	expectedHICBC := annualBenefit * 50 / 100
	if result.HICBC != expectedHICBC {
		t.Errorf("HICBC = %d, want %d", result.HICBC, expectedHICBC)
	}
}

func TestCalculate_ChildBenefitNotClaimed(t *testing.T) {
	// Test: £70,000 salary, NOT claiming child benefit — no HICBC
	bands := TaxYear2024_25
	input := TaxInput{
		IncomeSources: []IncomeSource{{Amount: pence(70000), Description: "Salary", IncomeType: "employment"}},
		ChildBenefit:  ChildBenefit{Claimed: false, NumberOfChildren: 2},
		TaxYear:       "2024-25",
	}

	result := Calculate(input, bands)

	if result.HICBC != 0 {
		t.Errorf("HICBC should be 0 when not claimed, got %d", result.HICBC)
	}
}

func TestCalculate_ZeroIncome(t *testing.T) {
	bands := TaxYear2024_25
	input := TaxInput{TaxYear: "2024-25"}
	result := Calculate(input, bands)

	if result.GrossIncome != 0 {
		t.Errorf("GrossIncome = %d, want 0", result.GrossIncome)
	}
	if result.IncomeTax != 0 {
		t.Errorf("IncomeTax = %d, want 0", result.IncomeTax)
	}
	if result.NationalInsurance != 0 {
		t.Errorf("NI = %d, want 0", result.NationalInsurance)
	}
	if result.TotalTax != 0 {
		t.Errorf("TotalTax = %d, want 0", result.TotalTax)
	}
}

func TestCalculate_EffectiveRate(t *testing.T) {
	bands := TaxYear2024_25
	input := TaxInput{
		IncomeSources: []IncomeSource{{Amount: pence(50000), Description: "Salary", IncomeType: "employment"}},
		TaxYear:       "2024-25",
	}

	result := Calculate(input, bands)

	if result.EffectiveRateBPS <= 0 {
		t.Error("expected positive effective rate for £50,000 income")
	}
	// Effective rate should be less than 40% (highest marginal rate at this income)
	if result.EffectiveRateBPS >= 4000 {
		t.Errorf("effective rate %d bps seems too high for £50k income", result.EffectiveRateBPS)
	}
}

func TestCalculate_MultipleIncomeSources(t *testing.T) {
	bands := TaxYear2024_25
	input := TaxInput{
		IncomeSources: []IncomeSource{
			{Amount: pence(50000), Description: "Salary", IncomeType: "employment"},
			{Amount: pence(10000), Description: "Self-employment", IncomeType: "other"},
			{Amount: pence(500), Description: "Savings interest", IncomeType: "other"},
			{Amount: pence(2000), Description: "Dividends", IncomeType: "other"},
			{Amount: pence(5000), Description: "Rental income", IncomeType: "other"},
		},
		PensionContributions: PensionContributions{SIPPGross: pence(5000)},
		GiftAid:              GiftAid{DonationsGross: pence(500)},
		TaxYear:              "2024-25",
	}

	result := Calculate(input, bands)

	// Gross: 50000 + 10000 + 500 + 2000 + 5000 = 67500
	if result.GrossIncome != pence(67500) {
		t.Errorf("GrossIncome = %d, want %d", result.GrossIncome, pence(67500))
	}
	// ANI: 67500 - 5000 - 500 = 62000
	if result.AdjustedNetIncome != pence(62000) {
		t.Errorf("ANI = %d, want %d", result.AdjustedNetIncome, pence(62000))
	}
}

func TestCalculate_FullyTaperedPA(t *testing.T) {
	// Test: £150,000 salary — PA should be fully tapered to zero
	bands := TaxYear2024_25
	input := TaxInput{
		IncomeSources: []IncomeSource{{Amount: pence(150000), Description: "Salary", IncomeType: "employment"}},
		TaxYear:       "2024-25",
	}

	result := Calculate(input, bands)

	if result.PersonalAllowance != 0 {
		t.Errorf("PA should be 0 at £150k, got %d", result.PersonalAllowance)
	}
	if result.TaxableIncome != pence(150000) {
		t.Errorf("TaxableIncome = %d, want %d", result.TaxableIncome, pence(150000))
	}
}

func TestCalculate_VeryHighIncome(t *testing.T) {
	// Test: £500,000 salary — well into additional rate
	bands := TaxYear2024_25
	input := TaxInput{
		IncomeSources: []IncomeSource{{Amount: pence(500000), Description: "Salary", IncomeType: "employment"}},
		TaxYear:       "2024-25",
	}

	result := Calculate(input, bands)

	if result.PersonalAllowance != 0 {
		t.Errorf("PA should be 0 at £500k, got %d", result.PersonalAllowance)
	}
	if len(result.TaxBands) != 3 {
		t.Errorf("expected 3 tax bands at £500k, got %d", len(result.TaxBands))
	}
	if result.TotalTax <= 0 {
		t.Error("expected positive total tax")
	}
}

func TestCalculate_GiftAidReducesANI(t *testing.T) {
	// Test: £105,000 salary, £10,000 gift aid — should restore some PA
	bands := TaxYear2024_25
	input := TaxInput{
		IncomeSources: []IncomeSource{{Amount: pence(105000), Description: "Salary", IncomeType: "employment"}},
		GiftAid:       GiftAid{DonationsGross: pence(10000)},
		TaxYear:       "2024-25",
	}

	result := Calculate(input, bands)

	// ANI: 105000 - 10000 = 95000, below taper threshold
	if result.AdjustedNetIncome != pence(95000) {
		t.Errorf("ANI = %d, want %d", result.AdjustedNetIncome, pence(95000))
	}
	if result.PersonalAllowance != pence(12570) {
		t.Errorf("PA = %d, want full PA %d", result.PersonalAllowance, pence(12570))
	}
}

func TestMarginalRate(t *testing.T) {
	bands := TaxYear2024_25

	tests := []struct {
		name     string
		ani      int64
		expected int
	}{
		{"below PA", pence(10000), 0},
		{"basic rate", pence(30000), 2000},
		{"higher rate", pence(60000), 4000},
		{"PA taper zone", pence(110000), 6000},
		{"additional rate", pence(200000), 4500},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := MarginalRate(tt.ani, bands)
			if got != tt.expected {
				t.Errorf("MarginalRate(%d) = %d bps, want %d bps", tt.ani, got, tt.expected)
			}
		})
	}
}

func TestEmployeeNISaved(t *testing.T) {
	bands := TaxYear2024_25

	// £50,000 salary with £5,000 sacrifice
	saved := EmployeeNISaved(pence(5000), pence(50000), bands)
	if saved <= 0 {
		t.Error("expected positive NI savings")
	}
	// Savings should be 8% of £5,000 = £400 (since entirely within main band)
	expectedSaved := pence(5000) * 800 / 10000 // 8% of 5000
	if saved != expectedSaved {
		t.Errorf("EmployeeNISaved = %d, want %d", saved, expectedSaved)
	}
}

func TestEmployerNISaved(t *testing.T) {
	bands := TaxYear2024_25

	// £50,000 salary with £5,000 sacrifice
	saved := EmployerNISaved(pence(5000), pence(50000), bands)
	if saved <= 0 {
		t.Error("expected positive employer NI savings")
	}
}

func TestIncomeTax_ZeroPA(t *testing.T) {
	// £130,000 salary, no deductions: PA = 0 (fully tapered), taxableIncome = 13,000,000p
	// basic:      3,770,000p at 20% = 754,000p
	// higherBandWidth = 12,507,000 - 0 - 3,770,000 = 8,737,000p
	// higherIncome = min(13,000,000 - 3,770,000, 8,737,000) = min(9,230,000, 8,737,000) = 8,737,000p → 3,494,800p
	// additional = 13,000,000 - 3,770,000 - 8,737,000 = 493,000p → 221,850p
	// total = 754,000 + 3,494,800 + 221,850 = 4,470,650p
	bands := TaxYear2024_25
	taxableIncome := int64(13_000_000)
	pa := int64(0)
	got, _ := IncomeTax(taxableIncome, pa, bands)
	want := int64(4_470_650)
	if got != want {
		t.Errorf("IncomeTax(13000000, pa=0) = %d, want %d", got, want)
	}
}

func TestCalculate_ZeroPA_HighSalary(t *testing.T) {
	// £130,000 salary, no deductions — PA fully tapered to zero
	bands := TaxYear2024_25
	input := TaxInput{
		IncomeSources: []IncomeSource{{Amount: pence(130000), Description: "Salary", IncomeType: "employment"}},
		TaxYear:       "2024-25",
	}

	result := Calculate(input, bands)

	if result.PersonalAllowance != 0 {
		t.Errorf("PersonalAllowance = %d, want 0", result.PersonalAllowance)
	}
	if result.TaxableIncome != pence(130000) {
		t.Errorf("TaxableIncome = %d, want %d", result.TaxableIncome, pence(130000))
	}
	// income tax = 4,470,650p
	if result.IncomeTax != 4_470_650 {
		t.Errorf("IncomeTax = %d, want 4470650", result.IncomeTax)
	}
}

func TestCalculate_SIPPRestoresPartialPA(t *testing.T) {
	// £130,000 salary, £10,000 SIPP gross: ANI = 12,000,000p
	// PA = max(0, 1,257,000 - (12,000,000 - 10,000,000)/2) = max(0, 1,257,000 - 1,000,000) = 257,000p
	// taxableIncome = 13,000,000 - 257,000 = 12,743,000p
	// basic:      3,770,000p at 20% = 754,000p
	// higherBandWidth = 12,507,000 - 257,000 - 3,770,000 = 8,480,000p
	// higherIncome = min(12,743,000 - 3,770,000, 8,480,000) = min(8,973,000, 8,480,000) = 8,480,000p → 3,392,000p
	// additional = 12,743,000 - 3,770,000 - 8,480,000 = 493,000p → 221,850p
	// total income tax = 754,000 + 3,392,000 + 221,850 = 4,367,850p
	bands := TaxYear2024_25
	input := TaxInput{
		IncomeSources:        []IncomeSource{{Amount: pence(130000), Description: "Salary", IncomeType: "employment"}},
		PensionContributions: PensionContributions{SIPPGross: pence(10000)},
		TaxYear:              "2024-25",
	}

	result := Calculate(input, bands)

	if result.AdjustedNetIncome != pence(120000) {
		t.Errorf("ANI = %d, want %d", result.AdjustedNetIncome, pence(120000))
	}
	if result.PersonalAllowance != 257_000 {
		t.Errorf("PersonalAllowance = %d, want 257000", result.PersonalAllowance)
	}
	if result.TaxableIncome != 12_743_000 {
		t.Errorf("TaxableIncome = %d, want 12743000", result.TaxableIncome)
	}
	if result.IncomeTax != 4_367_850 {
		t.Errorf("IncomeTax = %d, want 4367850", result.IncomeTax)
	}
}
