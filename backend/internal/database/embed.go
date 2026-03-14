package database

import "embed"

// MigrationFS embeds all SQL migration files for use with goose at runtime.
//
//go:embed migrations/*.sql
var MigrationFS embed.FS
