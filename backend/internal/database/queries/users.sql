-- name: CreateUser :one
-- Inserts a new user with a hashed password and returns the created user row.
INSERT INTO users (email, password_hash, is_admin)
VALUES ($1, $2, $3)
RETURNING id, email, is_admin, force_password_reset, created_at, updated_at;

-- name: GetUserByEmail :one
-- Retrieves a user by their email address, including the password hash for authentication.
SELECT id, email, password_hash, is_admin, force_password_reset, created_at, updated_at
FROM users
WHERE email = $1;

-- name: GetUserByID :one
-- Retrieves a user by their UUID, excluding the password hash.
SELECT id, email, is_admin, force_password_reset, created_at, updated_at
FROM users
WHERE id = $1;

-- name: CountUsers :one
-- Returns the total number of users in the system.
SELECT count(*) FROM users;

-- name: ListAllUsers :many
-- Returns all users ordered by creation date, for the admin panel.
SELECT id, email, is_admin, force_password_reset, created_at, updated_at
FROM users
ORDER BY created_at ASC;

-- name: UpdateUserAdminFlags :exec
-- Updates the admin and force_password_reset flags for a user.
UPDATE users SET is_admin=$2, force_password_reset=$3, updated_at=now() WHERE id=$1;

-- name: GetUserByIDWithHash :one
-- Retrieves a user by their UUID including the password hash, for password change operations.
SELECT id, email, password_hash, is_admin, force_password_reset FROM users WHERE id=$1;

-- name: UpdatePasswordAndClearReset :exec
-- Updates the user's password hash and clears the force_password_reset flag.
UPDATE users SET password_hash=$2, force_password_reset=FALSE, updated_at=now() WHERE id=$1;

-- name: UpdatePassword :exec
-- UpdatePassword sets a new password hash for the given user without affecting other fields.
UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1;
