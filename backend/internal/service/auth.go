package service

import (
	"context"
	"errors"
	"sync"
	"time"

	dbgen "ani-calculator/internal/database/generated"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrEmailTaken         = errors.New("unable to create account")
	ErrRateLimited        = errors.New("too many login attempts, please try again later")
	ErrWeakPassword       = errors.New("password must be at least 10 characters")
	ErrInvalidEmail       = errors.New("invalid email address")
	ErrUserNotFound       = errors.New("user not found")
	ErrWrongPassword      = errors.New("current password is incorrect")
)

// AuthService handles user registration, authentication, and rate limiting.
type AuthService struct {
	queries    *dbgen.Queries
	bcryptCost int

	// In-memory rate limiting for login attempts
	mu          sync.Mutex
	loginCounts map[string]*loginAttempt
}

// loginAttempt tracks the number of login attempts for a given email within a time window.
type loginAttempt struct {
	count   int
	resetAt time.Time
}

// NewAuthService creates a new AuthService with the given database queries and bcrypt cost factor.
func NewAuthService(queries *dbgen.Queries, bcryptCost int) *AuthService {
	return &AuthService{
		queries:     queries,
		bcryptCost:  bcryptCost,
		loginCounts: make(map[string]*loginAttempt),
	}
}

// UserResponse represents the public user data returned in API responses.
type UserResponse struct {
	ID                 string `json:"id"`
	Email              string `json:"email"`
	IsAdmin            bool   `json:"is_admin"`
	ForcePasswordReset bool   `json:"force_password_reset"`
}

// Register creates a new user account with the given email and password.
// The password is hashed with bcrypt before storage. The first user registered
// is automatically granted admin privileges. Returns the user response or an
// error if the email is taken or the password is too weak.
func (s *AuthService) Register(ctx context.Context, email, password string) (*UserResponse, error) {
	if len(email) < 3 || !containsAt(email) {
		return nil, ErrInvalidEmail
	}
	if len(password) < 10 {
		return nil, ErrWeakPassword
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), s.bcryptCost)
	if err != nil {
		return nil, err
	}

	// Grant admin to the very first registered user.
	count, err := s.queries.CountUsers(ctx)
	if err != nil {
		return nil, err
	}
	isAdmin := count == 0

	user, err := s.queries.CreateUser(ctx, dbgen.CreateUserParams{
		Email:        email,
		PasswordHash: string(hash),
		IsAdmin:      isAdmin,
	})
	if err != nil {
		// Unique constraint violation means email already exists.
		// Return generic error to avoid email enumeration.
		return nil, ErrEmailTaken
	}

	return &UserResponse{
		ID:                 uuidToString(user.ID),
		Email:              user.Email,
		IsAdmin:            user.IsAdmin,
		ForcePasswordReset: user.ForcePasswordReset,
	}, nil
}

// Authenticate verifies the email and password combination.
// Returns the user response on success, or ErrInvalidCredentials on failure.
// Applies rate limiting of 5 attempts per minute per email.
func (s *AuthService) Authenticate(ctx context.Context, email, password string) (*UserResponse, error) {
	if err := s.checkRateLimit(email); err != nil {
		return nil, err
	}

	user, err := s.queries.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// Perform a dummy bcrypt comparison to prevent timing attacks
			bcrypt.CompareHashAndPassword([]byte("$2a$12$dummy.hash.to.prevent.timing.attacks.placeholder"), []byte(password))
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	return &UserResponse{
		ID:                 uuidToString(user.ID),
		Email:              user.Email,
		IsAdmin:            user.IsAdmin,
		ForcePasswordReset: user.ForcePasswordReset,
	}, nil
}

// GetUser retrieves a user by their UUID string. Returns the user response or an error.
func (s *AuthService) GetUser(ctx context.Context, userID string) (*UserResponse, error) {
	uuid, err := StringToUUID(userID)
	if err != nil {
		return nil, err
	}

	user, err := s.queries.GetUserByID(ctx, uuid)
	if err != nil {
		return nil, err
	}

	return &UserResponse{
		ID:                 uuidToString(user.ID),
		Email:              user.Email,
		IsAdmin:            user.IsAdmin,
		ForcePasswordReset: user.ForcePasswordReset,
	}, nil
}

// ResetPassword allows an authenticated user to change their password by supplying their
// current password for verification. Clears the force_password_reset flag on success.
func (s *AuthService) ResetPassword(ctx context.Context, userID, currentPassword, newPassword string) (*UserResponse, error) {
	uuid, err := StringToUUID(userID)
	if err != nil {
		return nil, ErrUserNotFound
	}

	user, err := s.queries.GetUserByIDWithHash(ctx, uuid)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(currentPassword)); err != nil {
		return nil, ErrWrongPassword
	}

	if len(newPassword) < 10 {
		return nil, ErrWeakPassword
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), s.bcryptCost)
	if err != nil {
		return nil, err
	}

	if err := s.queries.UpdatePasswordAndClearReset(ctx, dbgen.UpdatePasswordAndClearResetParams{
		ID:           uuid,
		PasswordHash: string(newHash),
	}); err != nil {
		return nil, err
	}

	return &UserResponse{
		ID:                 uuidToString(user.ID),
		Email:              user.Email,
		IsAdmin:            user.IsAdmin,
		ForcePasswordReset: false,
	}, nil
}

// checkRateLimit enforces a maximum of 5 login attempts per minute per email.
func (s *AuthService) checkRateLimit(email string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	attempt, exists := s.loginCounts[email]
	if !exists || now.After(attempt.resetAt) {
		s.loginCounts[email] = &loginAttempt{count: 1, resetAt: now.Add(time.Minute)}
		return nil
	}

	attempt.count++
	if attempt.count > 5 {
		return ErrRateLimited
	}
	return nil
}

// containsAt checks if a string contains an @ character (basic email validation).
func containsAt(s string) bool {
	for _, c := range s {
		if c == '@' {
			return true
		}
	}
	return false
}

// uuidToString converts a pgtype.UUID to its string representation.
func uuidToString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	b := u.Bytes
	return formatUUID(b)
}

// formatUUID formats a 16-byte UUID array as a standard UUID string.
func formatUUID(b [16]byte) string {
	return encodeHex(b[0:4]) + "-" +
		encodeHex(b[4:6]) + "-" +
		encodeHex(b[6:8]) + "-" +
		encodeHex(b[8:10]) + "-" +
		encodeHex(b[10:16])
}

// encodeHex converts a byte slice to a lowercase hex string.
func encodeHex(b []byte) string {
	const hexDigits = "0123456789abcdef"
	result := make([]byte, len(b)*2)
	for i, v := range b {
		result[i*2] = hexDigits[v>>4]
		result[i*2+1] = hexDigits[v&0x0f]
	}
	return string(result)
}

// StringToUUID parses a UUID string into a pgtype.UUID.
func StringToUUID(s string) (pgtype.UUID, error) {
	var uuid pgtype.UUID
	if err := uuid.Scan(s); err != nil {
		return uuid, err
	}
	return uuid, nil
}
