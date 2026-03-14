import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useTaxYears } from '@/hooks/useTaxYears'
import { useTaxCalculation } from '@/hooks/useTaxCalculation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ResultsPanel } from '@/components/results/ResultsPanel'
import { IncomeSection } from '@/components/forms/IncomeSection'
import { PensionSection } from '@/components/forms/PensionSection'
import { DeductionsSection } from '@/components/forms/DeductionsSection'
import { defaultTaxInput, type TaxInput } from '@/lib/schemas'
import { calculatePreview } from '@/lib/tax-calc'
import { Calendar, Plus } from 'lucide-react'
import { useForm, FormProvider } from 'react-hook-form'
import { useState, useEffect, useCallback } from 'react'
import type { TaxResult } from '@/lib/schemas'

// Dashboard renders the main landing page. For authenticated users, it shows
// summary cards for each tax year. For anonymous users, it shows the calculator.
export default function Dashboard() {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <AuthenticatedDashboard />
  }

  return <AnonymousCalculator />
}

// AuthenticatedDashboard shows summary cards for the user's tax years with
// an empty state prompting them to create their first tax year.
function AuthenticatedDashboard() {
  const navigate = useNavigate()
  const { data: taxYears, isLoading } = useTaxYears()

  if (isLoading) {
    return <p className="text-text-muted">Loading...</p>
  }

  if (!taxYears || taxYears.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Calendar className="h-12 w-12 text-text-muted" />
        <h2 className="text-xl font-semibold text-text-primary">No tax years yet</h2>
        <p className="text-text-secondary text-center max-w-md">
          Get started by adding a tax year using the sidebar and entering your income details.
        </p>
        <Button onClick={() => navigate('/tax-year/2024-25')}>
          <Plus className="h-4 w-4 mr-2" />
          Create 2024-25
        </Button>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-serif font-semibold text-text-primary mb-6">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {taxYears.map((ty) => (
          <Card
            key={ty.tax_year}
            className="cursor-pointer hover:border-accent transition-colors"
            onClick={() => navigate(`/tax-year/${ty.tax_year}`)}
          >
            <CardHeader>
              <CardTitle>{ty.tax_year}</CardTitle>
              <CardDescription>
                {ty.scenario_count} scenario{ty.scenario_count !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-text-muted">
                Last updated: {ty.last_updated ? new Date(ty.last_updated).toLocaleDateString('en-GB') : 'N/A'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// AnonymousCalculator renders a full tax calculator form that works without
// authentication, using the stateless /api/calculate endpoint.
function AnonymousCalculator() {
  const [preview, setPreview] = useState<TaxResult | null>(null)
  const [serverResult, setServerResult] = useState<TaxResult | null>(null)
  const calculateMutation = useTaxCalculation()

  const methods = useForm<TaxInput>({
    defaultValues: defaultTaxInput('2024-25'),
  })

  const watchedValues = methods.watch()

  // Debounced client-side preview calculation.
  const updatePreview = useCallback(() => {
    const result = calculatePreview(watchedValues)
    setPreview(result)
  }, [watchedValues])

  useEffect(() => {
    const timer = setTimeout(updatePreview, 300)
    return () => clearTimeout(timer)
  }, [updatePreview])

  // onSubmit sends the form data to the server for an authoritative calculation.
  const onSubmit = async (data: TaxInput) => {
    // Convert pound values to pence for the API
    const penceData = convertToPence(data)
    const result = await calculateMutation.mutateAsync(penceData)
    setServerResult(result)
  }

  const displayResult = serverResult || preview

  return (
    <div>
      <h1 className="text-2xl font-serif font-semibold text-text-primary mb-2">
        UK Adjusted Net Income Calculator
      </h1>
      <p className="text-text-secondary mb-6">
        Calculate your adjusted net income, tax liability, and effective rate. Sign up to save and compare scenarios.
      </p>

      <div className="grid lg:grid-cols-2 gap-8">
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-4 mb-4">
                  <label className="text-sm font-medium text-text-primary">Tax Year:</label>
                  <select
                    className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm"
                    {...methods.register('tax_year')}
                  >
                    <option value="2024-25">2024-25</option>
                    <option value="2025-26">2025-26</option>
                  </select>
                </div>
                <IncomeSection />
                <PensionSection />
                <DeductionsSection />
                <Button type="submit" className="w-full" disabled={calculateMutation.isPending}>
                  {calculateMutation.isPending ? 'Calculating...' : 'Calculate'}
                </Button>
              </CardContent>
            </Card>
          </form>
        </FormProvider>

        <div>
          {displayResult && (
            <ResultsPanel result={displayResult} isPreview={!serverResult} />
          )}
        </div>
      </div>
    </div>
  )
}

// convertToPence converts all pound values in a TaxInput to pence for the API.
function convertToPence(input: TaxInput): TaxInput {
  return {
    ...input,
    income_sources: input.income_sources.map(src => ({
      ...src,
      amount: Math.round(src.amount * 100),
    })),
    trading_losses: Math.round(input.trading_losses * 100),
    pension_contributions: {
      sipp_gross: Math.round(input.pension_contributions.sipp_gross * 125),
      salary_sacrifice_pension: Math.round(input.pension_contributions.salary_sacrifice_pension * 100),
    },
    gift_aid: { donations_gross: Math.round(input.gift_aid.donations_gross * 125) },
    child_benefit: input.child_benefit,
  }
}
