-- +goose Up
CREATE TABLE tax_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tax_year        TEXT NOT NULL,
    label           TEXT NOT NULL DEFAULT 'Default',
    input_data      JSONB NOT NULL,
    result_data     JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(user_id, tax_year, label)
);

CREATE INDEX idx_tax_records_user_id ON tax_records (user_id);
CREATE INDEX idx_tax_records_user_year ON tax_records (user_id, tax_year);

-- +goose Down
DROP TABLE IF EXISTS tax_records;
