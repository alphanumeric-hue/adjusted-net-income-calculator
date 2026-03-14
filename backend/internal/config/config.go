package config

import (
	"github.com/kelseyhightower/envconfig"
)

// Config holds all application configuration loaded from environment variables.
type Config struct {
	DatabaseURL   string `envconfig:"DATABASE_URL" required:"true"`
	SessionSecret string `envconfig:"SESSION_SECRET" required:"true"`
	BcryptCost    int    `envconfig:"BCRYPT_COST" default:"12"`
	CorsOrigin    string `envconfig:"CORS_ORIGIN" default:"http://localhost"`
	Port          int    `envconfig:"PORT" default:"8080"`
}

// Load reads configuration from environment variables into a Config struct.
func Load() (*Config, error) {
	var cfg Config
	if err := envconfig.Process("", &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}
