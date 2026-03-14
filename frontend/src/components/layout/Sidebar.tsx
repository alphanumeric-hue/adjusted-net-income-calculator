import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Calendar, ChevronLeft, ChevronRight, Shield } from 'lucide-react'
import { listTaxYears, listAvailableTaxYears } from '@/api/tax-records'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { TaxYearSummary } from '@/lib/schemas'

interface SidebarProps {
  selectedYear?: string
  collapsed: boolean
  onToggle: () => void
}

// Sidebar renders the left navigation panel showing the user's tax years,
// with an "Add Tax Year" button that opens a modal for creating new years.
// A toggle button at the bottom collapses/expands the sidebar.
// When collapsed, a narrow icon column is shown with navigation shortcuts.
export function Sidebar({ selectedYear, collapsed, onToggle }: SidebarProps) {
  const { isAuthenticated, isAdmin } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newYear, setNewYear] = useState('')

  const taxYearsQuery = useQuery({
    queryKey: ['tax-years'],
    queryFn: listTaxYears,
    enabled: isAuthenticated,
  })

  const availableYearsQuery = useQuery({
    queryKey: ['tax-years', 'available'],
    queryFn: listAvailableTaxYears,
    enabled: isAuthenticated && dialogOpen,
  })

  if (!isAuthenticated) return null

  const taxYears: TaxYearSummary[] = taxYearsQuery.data ?? []

  // handleAddYear navigates to the selected new tax year.
  const handleAddYear = () => {
    if (newYear) {
      navigate(`/tax-year/${newYear}`)
      setDialogOpen(false)
      setNewYear('')
      queryClient.invalidateQueries({ queryKey: ['tax-years'] })
    }
  }

  // formatDate formats an ISO date string to a short locale date.
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  return (
    <aside className={`${collapsed ? 'w-12' : 'w-64'} transition-[width] duration-200 border-r border-border bg-surface-alt h-full hidden md:flex md:flex-col overflow-hidden shrink-0`}>
      {collapsed ? (
        <>
          <div className="flex flex-col items-center gap-1 p-1 pt-2 flex-1">
            <Button
              variant="ghost"
              size="icon"
              title="Tax Years"
              onClick={() => navigate('/')}
            >
              <Calendar className="h-4 w-4" />
            </Button>
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                title="Admin Panel"
                onClick={() => navigate('/admin')}
              >
                <Shield className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="p-2 border-t border-border flex justify-center mt-auto">
            <Button variant="ghost" size="icon" onClick={onToggle} title="Expand sidebar">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto">
            <nav className="px-2 pt-2">
              <button
                onClick={() => navigate('/')}
                className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors text-text-secondary hover:bg-surface hover:text-text-primary"
              >
                <Calendar className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">Tax Years</span>
              </button>
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors text-text-secondary hover:bg-surface hover:text-text-primary"
                >
                  <Shield className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium">Admin Panel</span>
                </button>
              )}
            </nav>

            <div className="border-t border-border mx-2 my-2" />

            <div className="px-4 pb-2">
              <Button
                onClick={() => setDialogOpen(true)}
                className="w-full"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Tax Year
              </Button>
            </div>

            <nav className="px-2">
              {taxYears.map((ty) => (
                <button
                  key={ty.tax_year}
                  onClick={() => navigate(`/tax-year/${ty.tax_year}`)}
                  className={`w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${
                    selectedYear === ty.tax_year
                      ? 'bg-accent-subtle text-accent'
                      : 'text-text-secondary hover:bg-surface hover:text-text-primary'
                  }`}
                >
                  <Calendar className="h-4 w-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{ty.tax_year}</div>
                    <div className="text-xs text-text-muted">
                      {ty.scenario_count} scenario{ty.scenario_count !== 1 ? 's' : ''}
                      {ty.last_updated && ` · ${formatDate(ty.last_updated)}`}
                    </div>
                  </div>
                </button>
              ))}

              {taxYears.length === 0 && (
                <p className="px-3 py-4 text-sm text-text-muted text-center">
                  No tax years yet
                </p>
              )}
            </nav>
          </div>

          <div className="p-2 border-t border-border flex justify-center mt-auto">
            <Button variant="ghost" size="icon" onClick={onToggle} title="Collapse sidebar">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tax Year</DialogTitle>
            <DialogDescription>Select a tax year to create your first scenario for.</DialogDescription>
          </DialogHeader>
          <Select value={newYear} onValueChange={setNewYear}>
            <SelectTrigger>
              <SelectValue placeholder="Select a tax year" />
            </SelectTrigger>
            <SelectContent>
              {(availableYearsQuery.data ?? []).map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddYear} disabled={!newYear}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
