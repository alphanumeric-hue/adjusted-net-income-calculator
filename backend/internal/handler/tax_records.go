package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"ani-calculator/internal/domain"
	"ani-calculator/internal/service"
)

// TaxRecordHandler handles HTTP requests for tax record CRUD operations.
type TaxRecordHandler struct {
	taxRecordService *service.TaxRecordService
}

// NewTaxRecordHandler creates a new TaxRecordHandler with the given tax record service.
func NewTaxRecordHandler(taxRecordService *service.TaxRecordService) *TaxRecordHandler {
	return &TaxRecordHandler{taxRecordService: taxRecordService}
}

// List handles GET /api/tax-records — returns all tax records for the authenticated user.
// Supports optional ?year= query parameter to filter by tax year.
func (h *TaxRecordHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "NOT_AUTHENTICATED", "authentication required")
		return
	}

	taxYear := r.URL.Query().Get("year")
	records, err := h.taxRecordService.List(r.Context(), userID, taxYear)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list records")
		return
	}

	writeJSON(w, http.StatusOK, records)
}

// Create handles POST /api/tax-records — creates a new tax record with calculated results.
func (h *TaxRecordHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "NOT_AUTHENTICATED", "authentication required")
		return
	}

	var req service.CreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_JSON", "invalid request body")
		return
	}

	if req.TaxYear == "" {
		writeError(w, http.StatusBadRequest, "MISSING_FIELD", "tax_year is required")
		return
	}

	if _, ok := domain.GetBands(req.TaxYear); !ok {
		writeError(w, http.StatusBadRequest, "INVALID_TAX_YEAR", "unsupported tax year")
		return
	}

	record, err := h.taxRecordService.Create(r.Context(), userID, req)
	if err != nil {
		if errors.Is(err, service.ErrDuplicate) {
			writeError(w, http.StatusConflict, "DUPLICATE_RECORD", err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create record")
		return
	}

	writeJSON(w, http.StatusCreated, record)
}

// Get handles GET /api/tax-records/{id} — returns a single tax record with full calculation result.
func (h *TaxRecordHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "NOT_AUTHENTICATED", "authentication required")
		return
	}

	recordID, err := service.StringToUUID(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "invalid record ID")
		return
	}

	record, err := h.taxRecordService.Get(r.Context(), userID, recordID)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "record not found")
			return
		}
		if errors.Is(err, service.ErrUnauthorized) {
			writeError(w, http.StatusForbidden, "FORBIDDEN", "access denied")
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get record")
		return
	}

	writeJSON(w, http.StatusOK, record)
}

// Update handles PUT /api/tax-records/{id} — updates a tax record and recalculates the result.
func (h *TaxRecordHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "NOT_AUTHENTICATED", "authentication required")
		return
	}

	recordID, err := service.StringToUUID(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "invalid record ID")
		return
	}

	var req service.UpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_JSON", "invalid request body")
		return
	}

	record, err := h.taxRecordService.Update(r.Context(), userID, recordID, req)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "record not found")
			return
		}
		if errors.Is(err, service.ErrUnauthorized) {
			writeError(w, http.StatusForbidden, "FORBIDDEN", "access denied")
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to update record")
		return
	}

	writeJSON(w, http.StatusOK, record)
}

// Delete handles DELETE /api/tax-records/{id} — deletes a tax record after ownership check.
func (h *TaxRecordHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "NOT_AUTHENTICATED", "authentication required")
		return
	}

	recordID, err := service.StringToUUID(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "invalid record ID")
		return
	}

	err = h.taxRecordService.Delete(r.Context(), userID, recordID)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "record not found")
			return
		}
		if errors.Is(err, service.ErrUnauthorized) {
			writeError(w, http.StatusForbidden, "FORBIDDEN", "access denied")
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to delete record")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// Duplicate handles POST /api/tax-records/{id}/duplicate — copies a record with a new label.
func (h *TaxRecordHandler) Duplicate(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "NOT_AUTHENTICATED", "authentication required")
		return
	}

	recordID, err := service.StringToUUID(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "invalid record ID")
		return
	}

	var req service.DuplicateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_JSON", "invalid request body")
		return
	}

	if req.Label == "" {
		writeError(w, http.StatusBadRequest, "MISSING_FIELD", "label is required")
		return
	}

	record, err := h.taxRecordService.Duplicate(r.Context(), userID, recordID, req)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "record not found")
			return
		}
		if errors.Is(err, service.ErrDuplicate) {
			writeError(w, http.StatusConflict, "DUPLICATE_RECORD", err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to duplicate record")
		return
	}

	writeJSON(w, http.StatusCreated, record)
}

// ListTaxYears handles GET /api/tax-years — returns a summary of each tax year the user has records for.
func (h *TaxRecordHandler) ListTaxYears(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "NOT_AUTHENTICATED", "authentication required")
		return
	}

	summaries, err := h.taxRecordService.ListTaxYearSummaries(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list tax years")
		return
	}

	writeJSON(w, http.StatusOK, summaries)
}

// ListAvailableTaxYears handles GET /api/tax-years/available — returns tax years the user can still create.
func (h *TaxRecordHandler) ListAvailableTaxYears(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "NOT_AUTHENTICATED", "authentication required")
		return
	}

	available, err := h.taxRecordService.ListAvailableTaxYears(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list available years")
		return
	}

	writeJSON(w, http.StatusOK, available)
}
