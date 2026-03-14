package main

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"ani-calculator/internal/config"
	"ani-calculator/internal/database"
	dbgen "ani-calculator/internal/database/generated"
	"ani-calculator/internal/handler"
	"ani-calculator/internal/service"

	"github.com/gorilla/sessions"
	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

// main is the application entry point. It loads configuration, connects to the
// database, runs migrations, sets up HTTP routing with all handlers and middleware,
// and starts the server with graceful shutdown support.
func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	// Run migrations using database/sql driver (required by goose)
	sqlDB, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to open database for migrations", "error", err)
		os.Exit(1)
	}
	if err := sqlDB.Ping(); err != nil {
		slog.Error("failed to ping database", "error", err)
		os.Exit(1)
	}

	goose.SetBaseFS(database.MigrationFS)
	if err := goose.SetDialect("postgres"); err != nil {
		slog.Error("failed to set goose dialect", "error", err)
		os.Exit(1)
	}
	if err := goose.Up(sqlDB, "migrations"); err != nil {
		slog.Error("failed to run migrations", "error", err)
		os.Exit(1)
	}
	sqlDB.Close()
	slog.Info("migrations complete")

	// Connect using pgxpool for the application (better performance)
	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to create connection pool", "error", err)
		os.Exit(1)
	}
	defer pool.Close()
	slog.Info("connected to database")

	queries := dbgen.New(pool)
	sessionStore := sessions.NewCookieStore([]byte(cfg.SessionSecret))
	sessionStore.Options = &sessions.Options{
		Path:     "/",
		MaxAge:   30 * 24 * 60 * 60, // 30 days
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   false, // local HTTP
	}

	authService := service.NewAuthService(queries, cfg.BcryptCost)
	taxRecordService := service.NewTaxRecordService(queries)
	adminService := service.NewAdminService(queries, cfg.BcryptCost)
	authHandler := handler.NewAuthHandler(authService, sessionStore)
	calcHandler := handler.NewCalculateHandler()
	taxRecordHandler := handler.NewTaxRecordHandler(taxRecordService)
	adminHandler := handler.NewAdminHandler(adminService)

	mux := http.NewServeMux()

	// Health check endpoint for Docker healthchecks and readiness probes
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Auth endpoints — no authentication required
	mux.HandleFunc("POST /api/auth/register", authHandler.Register)
	mux.HandleFunc("POST /api/auth/login", authHandler.Login)
	mux.HandleFunc("POST /api/auth/logout", authHandler.Logout)
	mux.HandleFunc("GET /api/auth/session", authHandler.Session)

	// Stateless calculate endpoint — no authentication required
	mux.HandleFunc("POST /api/calculate", calcHandler.Handle)

	// Authenticated tax record endpoints
	requireAuth := handler.RequireAuth(sessionStore)
	requireAdmin := handler.RequireAdmin(sessionStore, queries)

	mux.Handle("POST /api/auth/reset-password", requireAuth(http.HandlerFunc(authHandler.ResetPassword)))

	// Admin-only user management endpoints
	mux.Handle("GET /api/admin/users", requireAdmin(http.HandlerFunc(adminHandler.ListUsers)))
	mux.Handle("PUT /api/admin/users", requireAdmin(http.HandlerFunc(adminHandler.UpdateUsers)))
	mux.Handle("PUT /api/admin/users/{id}/password", requireAdmin(http.HandlerFunc(adminHandler.SetPassword)))

	mux.Handle("GET /api/tax-records", requireAuth(http.HandlerFunc(taxRecordHandler.List)))
	mux.Handle("POST /api/tax-records", requireAuth(http.HandlerFunc(taxRecordHandler.Create)))
	mux.Handle("GET /api/tax-records/{id}", requireAuth(http.HandlerFunc(taxRecordHandler.Get)))
	mux.Handle("PUT /api/tax-records/{id}", requireAuth(http.HandlerFunc(taxRecordHandler.Update)))
	mux.Handle("DELETE /api/tax-records/{id}", requireAuth(http.HandlerFunc(taxRecordHandler.Delete)))
	mux.Handle("POST /api/tax-records/{id}/duplicate", requireAuth(http.HandlerFunc(taxRecordHandler.Duplicate)))
	mux.Handle("GET /api/tax-years", requireAuth(http.HandlerFunc(taxRecordHandler.ListTaxYears)))
	mux.Handle("GET /api/tax-years/available", requireAuth(http.HandlerFunc(taxRecordHandler.ListAvailableTaxYears)))

	// Apply middleware chain
	var h http.Handler = mux
	h = handler.CORSMiddleware(cfg.CorsOrigin)(h)
	h = handler.LoggingMiddleware(h)
	h = handler.RecoveryMiddleware(h)

	addr := fmt.Sprintf(":%d", cfg.Port)
	server := &http.Server{
		Addr:         addr,
		Handler:      h,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGTERM)

	go func() {
		slog.Info("server starting", "addr", addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()

	<-done
	slog.Info("shutting down server")

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		slog.Error("server shutdown failed", "error", err)
		os.Exit(1)
	}

	pool.Close()
	slog.Info("server stopped")
}
