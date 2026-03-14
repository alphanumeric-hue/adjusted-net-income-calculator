package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"ani-calculator/internal/service"

	dbgen "ani-calculator/internal/database/generated"

	"github.com/gorilla/sessions"
	"github.com/jackc/pgx/v5/pgtype"
)

const sessionName = "ani-session"
const sessionKeyUserID = "user_id"

// AuthHandler handles HTTP requests for user authentication (register, login, logout, session check).
type AuthHandler struct {
	authService  *service.AuthService
	sessionStore sessions.Store
}

// NewAuthHandler creates a new AuthHandler with the given auth service and session store.
func NewAuthHandler(authService *service.AuthService, sessionStore sessions.Store) *AuthHandler {
	return &AuthHandler{
		authService:  authService,
		sessionStore: sessionStore,
	}
}

// registerRequest holds the JSON body for the registration endpoint.
type registerRequest struct {
	Email           string `json:"email"`
	Password        string `json:"password"`
	PasswordConfirm string `json:"password_confirm"`
}

// loginRequest holds the JSON body for the login endpoint.
type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// resetPasswordRequest holds the JSON body for the reset-password endpoint.
type resetPasswordRequest struct {
	CurrentPassword    string `json:"current_password"`
	NewPassword        string `json:"new_password"`
	NewPasswordConfirm string `json:"new_password_confirm"`
}

// Register handles POST /api/auth/register — creates a new user account,
// sets a session cookie, and returns the user object.
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_JSON", "invalid request body")
		return
	}

	if req.Password != req.PasswordConfirm {
		writeError(w, http.StatusBadRequest, "PASSWORDS_MISMATCH", "passwords do not match")
		return
	}

	user, err := h.authService.Register(r.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, service.ErrEmailTaken) {
			writeError(w, http.StatusConflict, "REGISTRATION_FAILED", "unable to create account")
			return
		}
		if errors.Is(err, service.ErrWeakPassword) {
			writeError(w, http.StatusBadRequest, "WEAK_PASSWORD", err.Error())
			return
		}
		if errors.Is(err, service.ErrInvalidEmail) {
			writeError(w, http.StatusBadRequest, "INVALID_EMAIL", err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "an error occurred")
		return
	}

	if err := h.createSession(w, r, user.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "SESSION_ERROR", "failed to create session")
		return
	}

	writeJSON(w, http.StatusCreated, user)
}

// Login handles POST /api/auth/login — authenticates the user and sets a session cookie.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_JSON", "invalid request body")
		return
	}

	user, err := h.authService.Authenticate(r.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredentials) {
			writeError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "invalid credentials")
			return
		}
		if errors.Is(err, service.ErrRateLimited) {
			writeError(w, http.StatusTooManyRequests, "RATE_LIMITED", err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "an error occurred")
		return
	}

	if err := h.createSession(w, r, user.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "SESSION_ERROR", "failed to create session")
		return
	}

	writeJSON(w, http.StatusOK, user)
}

// Logout handles POST /api/auth/logout — clears the session cookie.
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	session, _ := h.sessionStore.Get(r, sessionName)
	session.Options.MaxAge = -1
	session.Save(r, w)
	writeJSON(w, http.StatusOK, map[string]string{"status": "logged out"})
}

// Session handles GET /api/auth/session — returns the current user's info if
// authenticated, or 401 if not.
func (h *AuthHandler) Session(w http.ResponseWriter, r *http.Request) {
	session, _ := h.sessionStore.Get(r, sessionName)
	userID, ok := session.Values[sessionKeyUserID].(string)
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "NOT_AUTHENTICATED", "not authenticated")
		return
	}

	user, err := h.authService.GetUser(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "NOT_AUTHENTICATED", "not authenticated")
		return
	}

	writeJSON(w, http.StatusOK, user)
}

// createSession stores the user ID in an encrypted session cookie.
func (h *AuthHandler) createSession(w http.ResponseWriter, r *http.Request, userID string) error {
	session, _ := h.sessionStore.Get(r, sessionName)
	session.Values[sessionKeyUserID] = userID
	return session.Save(r, w)
}

// RequireAuth returns middleware that checks for a valid session and injects
// the user ID into the request context. Returns 401 if not authenticated.
func RequireAuth(sessionStore sessions.Store) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			session, _ := sessionStore.Get(r, sessionName)
			userID, ok := session.Values[sessionKeyUserID].(string)
			if !ok || userID == "" {
				writeError(w, http.StatusUnauthorized, "NOT_AUTHENTICATED", "authentication required")
				return
			}

			uuid, err := service.StringToUUID(userID)
			if err != nil {
				writeError(w, http.StatusUnauthorized, "INVALID_SESSION", "invalid session")
				return
			}

			ctx := context.WithValue(r.Context(), userIDContextKey, uuid)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// contextKey is a custom type for context keys to avoid collisions.
type contextKey string

const userIDContextKey contextKey = "user_id"

// GetUserIDFromContext extracts the authenticated user's UUID from the request context.
func GetUserIDFromContext(ctx context.Context) (pgtype.UUID, bool) {
	uid, ok := ctx.Value(userIDContextKey).(pgtype.UUID)
	return uid, ok
}

// ResetPassword allows an authenticated user to change their password.
// If the user has force_password_reset set, this clears that flag.
func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req resetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_JSON", "invalid request body")
		return
	}

	if req.NewPassword != req.NewPasswordConfirm {
		writeError(w, http.StatusBadRequest, "PASSWORDS_MISMATCH", "passwords do not match")
		return
	}

	userID, ok := GetUserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "NOT_AUTHENTICATED", "not authenticated")
		return
	}

	user, err := h.authService.ResetPassword(r.Context(), uuidToString(userID), req.CurrentPassword, req.NewPassword)
	if err != nil {
		if errors.Is(err, service.ErrWrongPassword) {
			writeError(w, http.StatusUnauthorized, "WRONG_PASSWORD", "current password is incorrect")
			return
		}
		if errors.Is(err, service.ErrWeakPassword) {
			writeError(w, http.StatusBadRequest, "WEAK_PASSWORD", err.Error())
			return
		}
		if errors.Is(err, service.ErrUserNotFound) {
			writeError(w, http.StatusNotFound, "USER_NOT_FOUND", "user not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "an error occurred")
		return
	}

	writeJSON(w, http.StatusOK, user)
}

// uuidToString converts a pgtype.UUID to its canonical string form for use within handlers.
func uuidToString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	b := u.Bytes
	const hexDigits = "0123456789abcdef"
	buf := make([]byte, 36)
	groups := [][2]int{{0, 4}, {4, 6}, {6, 8}, {8, 10}, {10, 16}}
	pos := 0
	for gi, g := range groups {
		for i := g[0]; i < g[1]; i++ {
			buf[pos] = hexDigits[b[i]>>4]
			buf[pos+1] = hexDigits[b[i]&0x0f]
			pos += 2
		}
		if gi < len(groups)-1 {
			buf[pos] = '-'
			pos++
		}
	}
	return string(buf)
}

// RequireAdmin returns middleware that allows only admin users through.
// It chains RequireAuth first, then checks the is_admin flag on the user record.
func RequireAdmin(store sessions.Store, queries *dbgen.Queries) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return RequireAuth(store)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := GetUserIDFromContext(r.Context())
			if !ok {
				writeError(w, http.StatusUnauthorized, "NOT_AUTHENTICATED", "not authenticated")
				return
			}
			user, err := queries.GetUserByID(r.Context(), userID)
			if err != nil || !user.IsAdmin {
				writeError(w, http.StatusForbidden, "FORBIDDEN", "admin access required")
				return
			}
			next.ServeHTTP(w, r)
		}))
	}
}
