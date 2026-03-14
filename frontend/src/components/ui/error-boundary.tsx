import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './card'
import { Button } from './button'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

// ErrorBoundary catches unhandled React errors in its subtree and displays
// a friendly error message with a retry button instead of crashing the app.
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  // getDerivedStateFromError captures the error for display.
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  // handleReset clears the error state to allow retry.
  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-danger">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-text-secondary">
                {this.state.error?.message || 'An unexpected error occurred.'}
              </p>
              <Button onClick={this.handleReset} variant="outline">
                Try again
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
