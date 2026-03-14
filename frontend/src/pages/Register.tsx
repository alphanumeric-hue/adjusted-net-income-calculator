import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/context/AuthContext'
import { registerSchema, type RegisterForm } from '@/lib/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

// Register renders the registration page with email, password, and confirmation fields.
export default function Register() {
  const navigate = useNavigate()
  const { register: registerUser } = useAuth()
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  // onSubmit creates the account and redirects to the dashboard on success.
  const onSubmit = async (data: RegisterForm) => {
    try {
      setError('')
      await registerUser(data)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>Sign up to save and compare your tax calculations.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-danger-subtle p-3 text-sm text-danger">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register('email')} />
              {errors.email && <p className="text-sm text-danger">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
              {errors.password && <p className="text-sm text-danger">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password_confirm">Confirm password</Label>
              <Input id="password_confirm" type="password" autoComplete="new-password" {...register('password_confirm')} />
              {errors.password_confirm && <p className="text-sm text-danger">{errors.password_confirm.message}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </Button>
            <p className="text-sm text-text-secondary">
              Already have an account?{' '}
              <Link to="/login" className="text-accent hover:text-accent-hover">Log in</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
