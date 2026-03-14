import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

// NotFound renders a 404 page when the user navigates to a non-existent route.
export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold text-text-primary">404</h1>
      <p className="text-text-secondary">Page not found</p>
      <Link to="/">
        <Button variant="outline">Go to Dashboard</Button>
      </Link>
    </div>
  )
}
