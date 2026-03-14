import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { resetPasswordSchema, type ResetPasswordForm } from '@/lib/schemas'
import { resetPassword } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

// ResetPassword renders the forced password reset page. Users who have the
// force_password_reset flag set are redirected here before accessing the app.
export function ResetPassword() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  })

  // onSubmit sends the password reset request and redirects to the dashboard on success.
  const onSubmit = async (data: ResetPasswordForm) => {
    try {
      setError('')
      await resetPassword(data)
      await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] })
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed')
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset Your Password</CardTitle>
          <CardDescription>
            Your account requires a password reset before you can continue. Please choose a new password of at least 10 characters.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-danger-subtle p-3 text-sm text-danger">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="current_password">Current Password</Label>
              <Input
                id="current_password"
                type="password"
                autoComplete="current-password"
                {...register('current_password')}
              />
              {errors.current_password && (
                <p className="text-sm text-danger">{errors.current_password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_password">New Password</Label>
              <Input
                id="new_password"
                type="password"
                autoComplete="new-password"
                {...register('new_password')}
              />
              {errors.new_password && (
                <p className="text-sm text-danger">{errors.new_password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_password_confirm">Confirm New Password</Label>
              <Input
                id="new_password_confirm"
                type="password"
                autoComplete="new-password"
                {...register('new_password_confirm')}
              />
              {errors.new_password_confirm && (
                <p className="text-sm text-danger">{errors.new_password_confirm.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Resetting password...' : 'Reset Password'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
