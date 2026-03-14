package service

import (
	"context"
	"errors"

	dbgen "ani-calculator/internal/database/generated"

	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/crypto/bcrypt"
)

// ErrNoAdminsRemaining is returned when an update would leave the system with no admin users.
var ErrNoAdminsRemaining = errors.New("cannot remove the last admin")

// AdminUserResponse represents user data for admin panel display.
type AdminUserResponse struct {
	ID                 string `json:"id"`
	Email              string `json:"email"`
	IsAdmin            bool   `json:"is_admin"`
	ForcePasswordReset bool   `json:"force_password_reset"`
	CreatedAt          string `json:"created_at"`
}

// UserUpdate represents a request to update a user's admin flags.
type UserUpdate struct {
	ID                 string `json:"id"`
	IsAdmin            bool   `json:"is_admin"`
	ForcePasswordReset bool   `json:"force_password_reset"`
}

// AdminService handles admin-only user management operations.
type AdminService struct {
	queries    *dbgen.Queries
	bcryptCost int
}

// NewAdminService creates a new AdminService with the given bcrypt cost factor.
func NewAdminService(queries *dbgen.Queries, bcryptCost int) *AdminService {
	return &AdminService{queries: queries, bcryptCost: bcryptCost}
}

// ListUsers returns all users for the admin panel.
func (s *AdminService) ListUsers(ctx context.Context) ([]AdminUserResponse, error) {
	rows, err := s.queries.ListAllUsers(ctx)
	if err != nil {
		return nil, err
	}

	users := make([]AdminUserResponse, 0, len(rows))
	for _, row := range rows {
		users = append(users, AdminUserResponse{
			ID:                 uuidToString(row.ID),
			Email:              row.Email,
			IsAdmin:            row.IsAdmin,
			ForcePasswordReset: row.ForcePasswordReset,
			CreatedAt:          row.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
		})
	}
	return users, nil
}

// UpdateUsers applies the given user flag updates, ensuring at least one admin remains.
// It validates the resulting admin count before persisting any changes.
func (s *AdminService) UpdateUsers(ctx context.Context, updates []UserUpdate) error {
	// Build a lookup map of updates keyed by ID string.
	updateMap := make(map[string]UserUpdate, len(updates))
	for _, u := range updates {
		updateMap[u.ID] = u
	}

	// Fetch current user state to validate the final admin count.
	rows, err := s.queries.ListAllUsers(ctx)
	if err != nil {
		return err
	}

	// Overlay the proposed updates on the current state and count admins.
	adminCount := 0
	for _, row := range rows {
		id := uuidToString(row.ID)
		if upd, ok := updateMap[id]; ok {
			if upd.IsAdmin {
				adminCount++
			}
		} else {
			if row.IsAdmin {
				adminCount++
			}
		}
	}

	if adminCount == 0 {
		return ErrNoAdminsRemaining
	}

	// Apply each update individually.
	for _, upd := range updates {
		uuid, err := StringToUUID(upd.ID)
		if err != nil {
			return err
		}
		if err := s.queries.UpdateUserAdminFlags(ctx, dbgen.UpdateUserAdminFlagsParams{
			ID:                 pgtype.UUID(uuid),
			IsAdmin:            upd.IsAdmin,
			ForcePasswordReset: upd.ForcePasswordReset,
		}); err != nil {
			return err
		}
	}

	return nil
}

// SetUserPassword sets a new bcrypt-hashed password for the given user.
// Returns ErrWeakPassword if the password is shorter than 10 characters.
func (s *AdminService) SetUserPassword(ctx context.Context, userID string, newPassword string) error {
	if len(newPassword) < 10 {
		return ErrWeakPassword
	}
	uuid, err := StringToUUID(userID)
	if err != nil {
		return err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), s.bcryptCost)
	if err != nil {
		return err
	}
	return s.queries.UpdatePassword(ctx, dbgen.UpdatePasswordParams{
		ID:           uuid,
		PasswordHash: string(hash),
	})
}
