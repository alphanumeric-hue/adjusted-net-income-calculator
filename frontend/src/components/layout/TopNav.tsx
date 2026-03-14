import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ThemeToggle } from './ThemeToggle'
import { Button } from '@/components/ui/button'

// TopNav renders the top navigation bar with the app title, navigation links,
// theme toggle, and authentication status/actions.
export function TopNav() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  // handleLogout logs the user out and redirects to the home page.
  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <div className="flex h-14 items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-serif text-xl font-semibold text-text-primary">
            ANI Calculator
          </Link>
          <nav className="hidden md:flex items-center gap-4">
            <Link to="/" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
              Dashboard
            </Link>
            {isAuthenticated && (
              <Link to="/compare" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                Compare Years
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-text-secondary hidden sm:inline">{user?.email}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Log out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Sign up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
