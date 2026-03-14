import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useAdminUsers, useUpdateUsers, useAdminSetPassword } from '@/hooks/useAdmin'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import type { AdminUser, UserUpdate } from '@/lib/schemas'

// AdminPanel renders the admin user management page, showing all users
// and allowing bulk updates to admin status and forced password reset flags.
export function AdminPanel() {
  const { isAdmin } = useAuth()
  const { data: users = [], isLoading } = useAdminUsers()
  const updateUsers = useUpdateUsers()
  const adminSetPassword = useAdminSetPassword()

  // pendingChanges holds local edits not yet saved to the server.
  const [pendingChanges, setPendingChanges] = useState<Map<string, { is_admin: boolean; force_password_reset: boolean }>>(new Map())

  // pendingPasswords holds new passwords entered for each user, keyed by user ID.
  const [pendingPasswords, setPendingPasswords] = useState<Map<string, string>>(new Map())

  if (!isAdmin) return <Navigate to="/" replace />

  // getIsAdmin returns the current (possibly pending) is_admin value for a user.
  const getIsAdmin = (user: AdminUser) => pendingChanges.get(user.id)?.is_admin ?? user.is_admin

  // getForceReset returns the current (possibly pending) force_password_reset value for a user.
  const getForceReset = (user: AdminUser) => pendingChanges.get(user.id)?.force_password_reset ?? user.force_password_reset

  // handleToggle toggles a boolean field for a user in the pending changes map.
  const handleToggle = (user: AdminUser, field: 'is_admin' | 'force_password_reset') => {
    setPendingChanges(prev => {
      const next = new Map(prev)
      const current = next.get(user.id) ?? { is_admin: user.is_admin, force_password_reset: user.force_password_reset }
      next.set(user.id, { ...current, [field]: !current[field] })
      return next
    })
  }

  // handlePasswordChange updates the pending password for a given user ID.
  const handlePasswordChange = (userId: string, value: string) => {
    setPendingPasswords(prev => {
      const next = new Map(prev)
      if (value === '') {
        next.delete(userId)
      } else {
        next.set(userId, value)
      }
      return next
    })
  }

  // handleSave sends all pending flag changes and password updates to the server.
  const handleSave = () => {
    const passwordEntries = Array.from(pendingPasswords.entries()).filter(([, pw]) => pw !== '')
    const shortPassword = passwordEntries.find(([, pw]) => pw.length < 10)
    if (shortPassword) {
      return
    }

    const updates: UserUpdate[] = Array.from(pendingChanges.entries()).map(([id, vals]) => ({ id, ...vals }))

    const flagPromise = updates.length > 0
      ? new Promise<void>((resolve, reject) =>
          updateUsers.mutate(updates, { onSuccess: () => resolve(), onError: reject })
        )
      : Promise.resolve()

    const passwordPromises = passwordEntries.map(
      ([userId, newPassword]) =>
        new Promise<void>((resolve, reject) =>
          adminSetPassword.mutate({ userId, newPassword }, { onSuccess: () => resolve(), onError: reject })
        )
    )

    Promise.all([flagPromise, ...passwordPromises]).then(() => {
      setPendingChanges(new Map())
      setPendingPasswords(new Map())
    })
  }

  // formatDate formats an ISO date string to a readable date.
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const hasPendingChanges = pendingChanges.size > 0 || pendingPasswords.size > 0

  // hasShortPassword is true if any pending password is non-empty but under the minimum length.
  const hasShortPassword = Array.from(pendingPasswords.values()).some(pw => pw.length > 0 && pw.length < 10)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Admin Panel</h1>
        <p className="text-sm text-text-secondary mt-1">Manage user accounts and permissions.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Toggle admin privileges or force a password reset for any user.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-text-muted py-4 text-center">Loading users...</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium text-text-secondary">Email</th>
                      <th className="text-left py-2 px-3 font-medium text-text-secondary">Joined</th>
                      <th className="text-center py-2 px-3 font-medium text-text-secondary">Admin</th>
                      <th className="text-center py-2 px-3 font-medium text-text-secondary">Force Password Reset</th>
                      <th className="text-left py-2 px-3 font-medium text-text-secondary">Set Password</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const isPendingRow = pendingChanges.has(user.id)
                      return (
                        <tr
                          key={user.id}
                          className={`border-b border-border last:border-0 transition-colors ${isPendingRow ? 'bg-accent-subtle' : 'hover:bg-surface'}`}
                        >
                          <td className="py-2.5 px-3 text-text-primary">{user.email}</td>
                          <td className="py-2.5 px-3 text-text-secondary">{formatDate(user.created_at)}</td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={getIsAdmin(user)}
                              onChange={() => handleToggle(user, 'is_admin')}
                              className="h-4 w-4 rounded accent-[var(--color-accent)] cursor-pointer"
                              aria-label={`Admin for ${user.email}`}
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={getForceReset(user)}
                              onChange={() => handleToggle(user, 'force_password_reset')}
                              className="h-4 w-4 rounded accent-[var(--color-accent)] cursor-pointer"
                              aria-label={`Force password reset for ${user.email}`}
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="password"
                              value={pendingPasswords.get(user.id) ?? ''}
                              onChange={e => handlePasswordChange(user.id, e.target.value)}
                              placeholder="New password (10+ chars)"
                              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ring"
                              aria-label={`Set password for ${user.email}`}
                            />
                          </td>
                        </tr>
                      )
                    })}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-text-muted">No users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {(updateUsers.isError || adminSetPassword.isError) && (
                <div className="mt-4 rounded-md bg-danger-subtle p-3 text-sm text-danger">
                  Failed to save changes. Please try again.
                </div>
              )}

              {hasShortPassword && (
                <div className="mt-4 rounded-md bg-danger-subtle p-3 text-sm text-danger">
                  Passwords must be at least 10 characters.
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={!hasPendingChanges || hasShortPassword || updateUsers.isPending || adminSetPassword.isPending}
                >
                  {(updateUsers.isPending || adminSetPassword.isPending) ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
