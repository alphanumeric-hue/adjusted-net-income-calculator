import { api } from './client'
import type { User, LoginForm, RegisterForm, ResetPasswordForm } from '@/lib/schemas'

// login authenticates a user with email and password, returning the user object.
export async function login(data: LoginForm): Promise<User> {
  return api.post('auth/login', { json: data }).json<User>()
}

// register creates a new user account and automatically logs them in.
export async function register(data: RegisterForm): Promise<User> {
  return api.post('auth/register', { json: data }).json<User>()
}

// logout clears the session cookie.
export async function logout(): Promise<void> {
  await api.post('auth/logout')
}

// getSession checks the current session and returns the user if authenticated.
export async function getSession(): Promise<User> {
  return api.get('auth/session').json<User>()
}

// resetPassword sends a password reset request with the current and new passwords.
export async function resetPassword(data: ResetPasswordForm): Promise<User> {
  return api.post('auth/reset-password', { json: data }).json<User>()
}
