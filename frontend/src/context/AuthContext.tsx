import { createContext, useContext, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as authApi from '@/api/auth'
import type { User, LoginForm, RegisterForm } from '@/lib/schemas'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  forcePasswordReset: boolean
  login: (data: LoginForm) => Promise<User>
  register: (data: RegisterForm) => Promise<User>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// AuthProvider wraps the application with authentication state, checking the session
// on mount and providing login/register/logout functions.
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  const sessionQuery = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: authApi.getSession,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (user) => {
      queryClient.setQueryData(['auth', 'session'], user)
    },
  })

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (user) => {
      queryClient.setQueryData(['auth', 'session'], user)
    },
  })

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.setQueryData(['auth', 'session'], null)
      queryClient.invalidateQueries({ queryKey: ['tax-records'] })
      queryClient.invalidateQueries({ queryKey: ['tax-years'] })
    },
  })

  const value: AuthContextValue = {
    user: sessionQuery.data ?? null,
    isLoading: sessionQuery.isLoading,
    isAuthenticated: !!sessionQuery.data,
    isAdmin: sessionQuery.data?.is_admin ?? false,
    forcePasswordReset: sessionQuery.data?.force_password_reset ?? false,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// useAuth returns the authentication context for accessing user state and auth actions.
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
