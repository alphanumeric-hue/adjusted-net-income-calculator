import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { listUsers, updateUsers, adminSetPassword } from '@/api/admin'
import type { UserUpdate } from '@/lib/schemas'

// useAdminUsers fetches the full user list for the admin panel.
export function useAdminUsers() {
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: listUsers,
    enabled: isAuthenticated,
  })
}

// useUpdateUsers returns a mutation for bulk-updating user flags.
export function useUpdateUsers() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (updates: UserUpdate[]) => updateUsers(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}

// useAdminSetPassword returns a mutation for setting a user's password as an admin.
export function useAdminSetPassword() {
  return useMutation({
    mutationFn: ({ userId, newPassword }: { userId: string; newPassword: string }) =>
      adminSetPassword(userId, newPassword),
  })
}
