package handler

import (
	"encoding/json"
	"net/http"

	"ani-calculator/internal/domain"
)

// CalculateHandler handles stateless tax calculation requests.
// No authentication is required — this enables "try before you register".
type CalculateHandler struct{}

// NewCalculateHandler creates a new CalculateHandler instance.
func NewCalculateHandler() *CalculateHandler {
	return &CalculateHandler{}
}

// Handle processes a POST /api/calculate request by validating the input,
// looking up the tax year bands, running the calculation, and returning the result.
func (h *CalculateHandler) Handle(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "only POST is allowed")
		return
	}

	var input domain.TaxInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_JSON", "invalid request body")
		return
	}

	if input.TaxYear == "" {
		writeError(w, http.StatusBadRequest, "MISSING_FIELD", "tax_year is required")
		return
	}

	bands, ok := domain.GetBands(input.TaxYear)
	if !ok {
		writeError(w, http.StatusBadRequest, "INVALID_TAX_YEAR", "unsupported tax year: "+input.TaxYear)
		return
	}

	result := domain.Calculate(input, bands)
	writeJSON(w, http.StatusOK, result)
}
