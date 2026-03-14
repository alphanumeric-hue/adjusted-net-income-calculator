package service

import (
	"context"
	"encoding/json"
	"errors"

	dbgen "ani-calculator/internal/database/generated"
	"ani-calculator/internal/domain"

	"github.com/jackc/pgx/v5/pgtype"
)

var (
	ErrNotFound     = errors.New("record not found")
	ErrUnauthorized = errors.New("unauthorized")
	ErrDuplicate    = errors.New("a record with this tax year and label already exists")
)

// TaxRecordService handles business logic for creating, reading, updating,
// and deleting tax records, including running calculations on save.
type TaxRecordService struct {
	queries *dbgen.Queries
}

// NewTaxRecordService creates a new TaxRecordService with the given database queries.
func NewTaxRecordService(queries *dbgen.Queries) *TaxRecordService {
	return &TaxRecordService{queries: queries}
}

// TaxRecordResponse represents a tax record as returned in API responses.
type TaxRecordResponse struct {
	ID         string            `json:"id"`
	TaxYear    string            `json:"tax_year"`
	Label      string            `json:"label"`
	InputData  domain.TaxInput   `json:"input_data"`
	ResultData *domain.TaxResult `json:"result_data,omitempty"`
	CreatedAt  string            `json:"created_at"`
	UpdatedAt  string            `json:"updated_at"`
}

// CreateRequest holds the parameters for creating a new tax record.
type CreateRequest struct {
	TaxYear   string          `json:"tax_year"`
	Label     string          `json:"label"`
	InputData domain.TaxInput `json:"input_data"`
}

// UpdateRequest holds the parameters for updating an existing tax record.
type UpdateRequest struct {
	InputData domain.TaxInput `json:"input_data"`
}

// DuplicateRequest holds the parameters for duplicating a tax record with a new label.
type DuplicateRequest struct {
	Label string `json:"label"`
}

// TaxYearSummary represents a summary of a user's records for a specific tax year.
type TaxYearSummary struct {
	TaxYear       string  `json:"tax_year"`
	ScenarioCount int32   `json:"scenario_count"`
	LastUpdated   *string `json:"last_updated"`
}

// Create creates a new tax record, runs the tax calculation, and stores both
// the input and result data. Returns the complete record.
func (s *TaxRecordService) Create(ctx context.Context, userID pgtype.UUID, req CreateRequest) (*TaxRecordResponse, error) {
	bands, ok := domain.GetBands(req.TaxYear)
	if !ok {
		return nil, errors.New("unsupported tax year")
	}

	req.InputData.TaxYear = req.TaxYear
	result := domain.Calculate(req.InputData, bands)

	inputJSON, err := json.Marshal(req.InputData)
	if err != nil {
		return nil, err
	}
	resultJSON, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}

	label := req.Label
	if label == "" {
		label = "Default"
	}

	record, err := s.queries.CreateTaxRecord(ctx, dbgen.CreateTaxRecordParams{
		UserID:     userID,
		TaxYear:    req.TaxYear,
		Label:      label,
		InputData:  inputJSON,
		ResultData: resultJSON,
	})
	if err != nil {
		return nil, ErrDuplicate
	}

	return toTaxRecordResponse(record)
}

// Get retrieves a single tax record by ID, checking ownership.
func (s *TaxRecordService) Get(ctx context.Context, userID pgtype.UUID, recordID pgtype.UUID) (*TaxRecordResponse, error) {
	record, err := s.queries.GetTaxRecord(ctx, recordID)
	if err != nil {
		return nil, ErrNotFound
	}

	if record.UserID != userID {
		return nil, ErrUnauthorized
	}

	return toTaxRecordResponse(record)
}

// List returns all tax records for the given user, optionally filtered by tax year.
func (s *TaxRecordService) List(ctx context.Context, userID pgtype.UUID, taxYear string) ([]TaxRecordResponse, error) {
	var records []dbgen.TaxRecord
	var err error

	if taxYear != "" {
		records, err = s.queries.ListTaxRecordsByUserAndYear(ctx, dbgen.ListTaxRecordsByUserAndYearParams{
			UserID:  userID,
			TaxYear: taxYear,
		})
	} else {
		records, err = s.queries.ListTaxRecordsByUser(ctx, userID)
	}
	if err != nil {
		return nil, err
	}

	responses := make([]TaxRecordResponse, 0, len(records))
	for _, r := range records {
		resp, err := toTaxRecordResponse(r)
		if err != nil {
			return nil, err
		}
		responses = append(responses, *resp)
	}

	return responses, nil
}

// Update updates a tax record's input data, recalculates the result, and stores both.
func (s *TaxRecordService) Update(ctx context.Context, userID pgtype.UUID, recordID pgtype.UUID, req UpdateRequest) (*TaxRecordResponse, error) {
	existing, err := s.queries.GetTaxRecord(ctx, recordID)
	if err != nil {
		return nil, ErrNotFound
	}
	if existing.UserID != userID {
		return nil, ErrUnauthorized
	}

	bands, ok := domain.GetBands(existing.TaxYear)
	if !ok {
		return nil, errors.New("unsupported tax year")
	}

	req.InputData.TaxYear = existing.TaxYear
	result := domain.Calculate(req.InputData, bands)

	inputJSON, err := json.Marshal(req.InputData)
	if err != nil {
		return nil, err
	}
	resultJSON, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}

	record, err := s.queries.UpdateTaxRecord(ctx, dbgen.UpdateTaxRecordParams{
		ID:         recordID,
		InputData:  inputJSON,
		ResultData: resultJSON,
	})
	if err != nil {
		return nil, err
	}

	return toTaxRecordResponse(record)
}

// Delete removes a tax record by ID, checking ownership first.
func (s *TaxRecordService) Delete(ctx context.Context, userID pgtype.UUID, recordID pgtype.UUID) error {
	existing, err := s.queries.GetTaxRecord(ctx, recordID)
	if err != nil {
		return ErrNotFound
	}
	if existing.UserID != userID {
		return ErrUnauthorized
	}

	return s.queries.DeleteTaxRecord(ctx, recordID)
}

// Duplicate copies an existing tax record with a new label, re-running the calculation.
func (s *TaxRecordService) Duplicate(ctx context.Context, userID pgtype.UUID, recordID pgtype.UUID, req DuplicateRequest) (*TaxRecordResponse, error) {
	existing, err := s.queries.GetTaxRecord(ctx, recordID)
	if err != nil {
		return nil, ErrNotFound
	}
	if existing.UserID != userID {
		return nil, ErrUnauthorized
	}

	var input domain.TaxInput
	if err := json.Unmarshal(existing.InputData, &input); err != nil {
		return nil, err
	}

	bands, ok := domain.GetBands(existing.TaxYear)
	if !ok {
		return nil, errors.New("unsupported tax year")
	}

	input.TaxYear = existing.TaxYear
	result := domain.Calculate(input, bands)

	inputJSON, err := json.Marshal(input)
	if err != nil {
		return nil, err
	}
	resultJSON, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}

	record, err := s.queries.CreateTaxRecord(ctx, dbgen.CreateTaxRecordParams{
		UserID:     userID,
		TaxYear:    existing.TaxYear,
		Label:      req.Label,
		InputData:  inputJSON,
		ResultData: resultJSON,
	})
	if err != nil {
		return nil, ErrDuplicate
	}

	return toTaxRecordResponse(record)
}

// ListTaxYearSummaries returns a summary for each tax year the user has records for.
func (s *TaxRecordService) ListTaxYearSummaries(ctx context.Context, userID pgtype.UUID) ([]TaxYearSummary, error) {
	rows, err := s.queries.ListTaxYearSummaries(ctx, userID)
	if err != nil {
		return nil, err
	}

	summaries := make([]TaxYearSummary, 0, len(rows))
	for _, r := range rows {
		var lastUpdated *string
		if r.LastUpdated != nil {
			if ts, ok := r.LastUpdated.(pgtype.Timestamptz); ok && ts.Valid {
				s := ts.Time.Format("2006-01-02T15:04:05Z")
				lastUpdated = &s
			}
		}
		summaries = append(summaries, TaxYearSummary{
			TaxYear:       r.TaxYear,
			ScenarioCount: r.ScenarioCount,
			LastUpdated:   lastUpdated,
		})
	}

	return summaries, nil
}

// ListAvailableTaxYears returns tax years the user hasn't created records for yet.
func (s *TaxRecordService) ListAvailableTaxYears(ctx context.Context, userID pgtype.UUID) ([]string, error) {
	existing, err := s.ListTaxYearSummaries(ctx, userID)
	if err != nil {
		return nil, err
	}

	usedYears := make(map[string]bool)
	for _, s := range existing {
		usedYears[s.TaxYear] = true
	}

	allYears := domain.SupportedTaxYears()
	available := make([]string, 0)
	for _, y := range allYears {
		if !usedYears[y] {
			available = append(available, y)
		}
	}

	return available, nil
}

// toTaxRecordResponse converts a database TaxRecord to an API response.
func toTaxRecordResponse(record dbgen.TaxRecord) (*TaxRecordResponse, error) {
	var input domain.TaxInput
	if err := json.Unmarshal(record.InputData, &input); err != nil {
		return nil, err
	}

	resp := &TaxRecordResponse{
		ID:        uuidToString(record.ID),
		TaxYear:   record.TaxYear,
		Label:     record.Label,
		InputData: input,
		CreatedAt: record.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
		UpdatedAt: record.UpdatedAt.Time.Format("2006-01-02T15:04:05Z"),
	}

	if record.ResultData != nil {
		var result domain.TaxResult
		if err := json.Unmarshal(record.ResultData, &result); err != nil {
			return nil, err
		}
		resp.ResultData = &result
	}

	return resp, nil
}
