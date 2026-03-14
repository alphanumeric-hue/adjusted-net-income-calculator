package handler

import (
	"encoding/json"
	"net/http"
)

// ErrorResponse represents the standard JSON error response shape.
type ErrorResponse struct {
	Error   string      `json:"error"`
	Code    string      `json:"code"`
	Details interface{} `json:"details,omitempty"`
}

// writeJSON writes a JSON response with the given status code and data.
func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// writeError writes a standardised JSON error response with the given status code and message.
func writeError(w http.ResponseWriter, status int, code string, message string) {
	writeJSON(w, status, ErrorResponse{
		Error: message,
		Code:  code,
	})
}

// writeErrorWithDetails writes a standardised JSON error response with additional details.
func writeErrorWithDetails(w http.ResponseWriter, status int, code string, message string, details interface{}) {
	writeJSON(w, status, ErrorResponse{
		Error:   message,
		Code:    code,
		Details: details,
	})
}
