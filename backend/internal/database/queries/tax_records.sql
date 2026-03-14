-- name: CreateTaxRecord :one
-- Creates a new tax record for a user with the given tax year, label, and input/result data.
INSERT INTO tax_records (user_id, tax_year, label, input_data, result_data)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, user_id, tax_year, label, input_data, result_data, created_at, updated_at;

-- name: GetTaxRecord :one
-- Retrieves a single tax record by its UUID.
SELECT id, user_id, tax_year, label, input_data, result_data, created_at, updated_at
FROM tax_records
WHERE id = $1;

-- name: ListTaxRecordsByUser :many
-- Lists all tax records for a given user, ordered by tax year descending then label.
SELECT id, user_id, tax_year, label, input_data, result_data, created_at, updated_at
FROM tax_records
WHERE user_id = $1
ORDER BY tax_year DESC, label ASC;

-- name: ListTaxRecordsByUserAndYear :many
-- Lists all tax records (scenarios) for a given user and specific tax year.
SELECT id, user_id, tax_year, label, input_data, result_data, created_at, updated_at
FROM tax_records
WHERE user_id = $1 AND tax_year = $2
ORDER BY created_at ASC;

-- name: UpdateTaxRecord :one
-- Updates a tax record's input data, result data, and updated_at timestamp.
UPDATE tax_records
SET input_data = $2, result_data = $3, updated_at = now()
WHERE id = $1
RETURNING id, user_id, tax_year, label, input_data, result_data, created_at, updated_at;

-- name: DeleteTaxRecord :exec
-- Deletes a tax record by its UUID.
DELETE FROM tax_records
WHERE id = $1;

-- name: ListTaxYearSummaries :many
-- Returns a summary of each tax year the user has records for: year, scenario count, and last update time.
SELECT tax_year,
       COUNT(*)::int AS scenario_count,
       MAX(updated_at) AS last_updated
FROM tax_records
WHERE user_id = $1
GROUP BY tax_year
ORDER BY tax_year DESC;

-- name: GetTaxRecordByUserAndYearAndLabel :one
-- Retrieves a specific tax record by user, tax year, and scenario label.
SELECT id, user_id, tax_year, label, input_data, result_data, created_at, updated_at
FROM tax_records
WHERE user_id = $1 AND tax_year = $2 AND label = $3;
