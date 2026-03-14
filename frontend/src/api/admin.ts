import { api } from './client'
import type { AdminUser, UserUpdate } from '@/lib/schemas'

// listUsers fetches all users for the admin panel.
export async function listUsers(): Promise<AdminUser[]> {
  return api.get('admin/users').json<AdminUser[]>()
}

// updateUsers sends bulk user flag updates to the server.
export async function updateUsers(updates: UserUpdate[]): Promise<void> {
  await api.put('admin/users', { json: updates })
}

// adminSetPassword sets a new password for a user directly from the admin panel.
export async function adminSetPassword(userId: string, newPassword: string): Promise<void> {
  await api.put(`admin/users/${userId}/password`, { json: { new_password: newPassword } })
}
