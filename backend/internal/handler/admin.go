package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"ani-calculator/internal/service"
)

// AdminHandler handles admin-only user management endpoints.
type AdminHandler struct {
	adminService *service.AdminService
}

// NewAdminHandler creates a new AdminHandler.
func NewAdminHandler(adminService *service.AdminService) *AdminHandler {
	return &AdminHandler{adminService: adminService}
}

// ListUsers returns all users for the admin panel.
func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.adminService.ListUsers(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "an error occurred")
		return
	}

	writeJSON(w, http.StatusOK, users)
}

// UpdateUsers applies admin flag updates to a set of users.
// Rejects the request if it would leave the system with no remaining admin.
func (h *AdminHandler) UpdateUsers(w http.ResponseWriter, r *http.Request) {
	var updates []service.UserUpdate
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_JSON", "invalid request body")
		return
	}

	if err := h.adminService.UpdateUsers(r.Context(), updates); err != nil {
		if errors.Is(err, service.ErrNoAdminsRemaining) {
			writeError(w, http.StatusUnprocessableEntity, "NO_ADMINS_REMAINING", err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "an error occurred")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// SetPassword allows an admin to directly set a new password for any user.
func (h *AdminHandler) SetPassword(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("id")
	var body struct {
		NewPassword string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_JSON", "invalid request body")
		return
	}
	if err := h.adminService.SetUserPassword(r.Context(), userID, body.NewPassword); err != nil {
		switch err {
		case service.ErrWeakPassword:
			writeError(w, http.StatusBadRequest, "WEAK_PASSWORD", "password must be at least 10 characters")
		default:
			writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to update password")
		}
		return
	}
	w.WriteHeader(http.StatusOK)
}
