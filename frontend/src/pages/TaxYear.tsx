import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useForm, FormProvider } from 'react-hook-form'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import {
  useTaxRecordsByYear,
  useCreateTaxRecord,
  useUpdateTaxRecord,
  useDeleteTaxRecord,
  useDuplicateTaxRecord,
} from '@/hooks/useTaxRecords'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { IncomeSection } from '@/components/forms/IncomeSection'
import { PensionSection } from '@/components/forms/PensionSection'
import { DeductionsSection } from '@/components/forms/DeductionsSection'
import { ScenarioComparison } from '@/components/forms/ScenarioComparison'
import { ResultsPanel } from '@/components/results/ResultsPanel'
import { defaultTaxInput, type TaxInput, type TaxRecord } from '@/lib/schemas'
import { Plus, Copy, Trash2, BarChart3 } from 'lucide-react'

// TaxYear renders the main tax year detail view with scenario tabs,
// input forms, results, and comparison features.
export default function TaxYear() {
  const { year } = useParams<{ year: string }>()
  const { isAuthenticated } = useAuth()
  const { data: records, isLoading } = useTaxRecordsByYear(year || '')
  const createMutation = useCreateTaxRecord()
  const updateMutation = useUpdateTaxRecord()
  const deleteMutation = useDeleteTaxRecord()
  const duplicateMutation = useDuplicateTaxRecord()

  const [activeTab, setActiveTab] = useState<string>('')
  const [newScenarioDialog, setNewScenarioDialog] = useState(false)
  const [newScenarioLabel, setNewScenarioLabel] = useState('')
  const [duplicateDialog, setDuplicateDialog] = useState<string | null>(null)
  const [duplicateLabel, setDuplicateLabel] = useState('')
  const [showComparison, setShowComparison] = useState(false)

  if (!year) return null
  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">Please log in to manage tax year records.</p>
      </div>
    )
  }
  if (isLoading) return <p className="text-text-muted">Loading...</p>

  const scenarioRecords = records || []

  // Set active tab to first record if not set
  if (scenarioRecords.length > 0 && !activeTab) {
    setActiveTab(scenarioRecords[0].id)
  }

  // handleCreateScenario creates a new scenario with the given label and default inputs.
  const handleCreateScenario = async () => {
    if (!newScenarioLabel.trim()) return
    try {
      const record = await createMutation.mutateAsync({
        tax_year: year,
        label: newScenarioLabel.trim(),
        input_data: convertToPence(defaultTaxInput(year)),
      })
      setActiveTab(record.id)
      setNewScenarioDialog(false)
      setNewScenarioLabel('')
      toast.success('Scenario created')
    } catch {
      toast.error('Failed to create scenario')
    }
  }

  // handleDuplicate copies an existing scenario with a new label.
  const handleDuplicate = async () => {
    if (!duplicateDialog || !duplicateLabel.trim()) return
    try {
      const record = await duplicateMutation.mutateAsync({
        id: duplicateDialog,
        label: duplicateLabel.trim(),
      })
      setActiveTab(record.id)
      setDuplicateDialog(null)
      setDuplicateLabel('')
      toast.success('Scenario duplicated')
    } catch {
      toast.error('Failed to duplicate scenario')
    }
  }

  // handleDelete removes a scenario after confirmation.
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this scenario?')) return
    try {
      await deleteMutation.mutateAsync(id)
      if (activeTab === id && scenarioRecords.length > 1) {
        const remaining = scenarioRecords.filter((r) => r.id !== id)
        setActiveTab(remaining[0]?.id || '')
      }
      toast.success('Scenario deleted')
    } catch {
      toast.error('Failed to delete scenario')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-semibold text-text-primary">Tax Year {year}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowComparison(!showComparison)}>
            <BarChart3 className="h-4 w-4 mr-2" />
            {showComparison ? 'Hide' : 'Compare'}
          </Button>
        </div>
      </div>

      {showComparison && scenarioRecords.length >= 2 && (
        <div className="mb-6">
          <ScenarioComparison records={scenarioRecords} />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center gap-2 mb-4 overflow-x-auto">
          <TabsList>
            {scenarioRecords.map((record) => (
              <TabsTrigger key={record.id} value={record.id}>
                {record.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <Button variant="ghost" size="sm" onClick={() => setNewScenarioDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Scenario
          </Button>
        </div>

        {scenarioRecords.map((record) => (
          <TabsContent key={record.id} value={record.id}>
            <ScenarioTab
              record={record}
              onSave={async (data) => {
                await updateMutation.mutateAsync({ id: record.id, input_data: data })
                toast.success('Saved')
              }}
              onDuplicate={() => {
                setDuplicateDialog(record.id)
                setDuplicateLabel(record.label + ' (copy)')
              }}
              onDelete={() => handleDelete(record.id)}
              isSaving={updateMutation.isPending}
            />
          </TabsContent>
        ))}

        {scenarioRecords.length === 0 && (
          <div className="text-center py-12">
            <p className="text-text-secondary mb-4">No scenarios yet for {year}.</p>
            <Button onClick={() => {
              setNewScenarioLabel('Default')
              handleCreateScenario()
            }}>
              Create Default Scenario
            </Button>
          </div>
        )}
      </Tabs>

      {/* New Scenario Dialog */}
      <Dialog open={newScenarioDialog} onOpenChange={setNewScenarioDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Scenario</DialogTitle>
            <DialogDescription>Give your scenario a descriptive label.</DialogDescription>
          </DialogHeader>
          <Input
            value={newScenarioLabel}
            onChange={(e) => setNewScenarioLabel(e.target.value)}
            placeholder="e.g. Max pension, No SIPP"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewScenarioDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateScenario} disabled={!newScenarioLabel.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={!!duplicateDialog} onOpenChange={() => setDuplicateDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Scenario</DialogTitle>
            <DialogDescription>Enter a label for the duplicated scenario.</DialogDescription>
          </DialogHeader>
          <Input
            value={duplicateLabel}
            onChange={(e) => setDuplicateLabel(e.target.value)}
            placeholder="New scenario label"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateDialog(null)}>Cancel</Button>
            <Button onClick={handleDuplicate} disabled={!duplicateLabel.trim()}>Duplicate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ScenarioTab renders the form and results for a single scenario within a tax year.
function ScenarioTab({ record, onSave, onDuplicate, onDelete, isSaving }: {
  record: TaxRecord
  onSave: (data: TaxInput) => Promise<void>
  onDuplicate: () => void
  onDelete: () => void
  isSaving: boolean
}) {
  // Convert pence values to pounds for form display
  const formDefaults = convertToPounds(record.input_data)
  const methods = useForm<TaxInput>({ defaultValues: formDefaults })

  // onSubmit converts pounds back to pence and saves.
  const onSubmit = async (data: TaxInput) => {
    await onSave(convertToPence(data))
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-6">
              <IncomeSection />
              <PensionSection />
              <DeductionsSection />
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save & Calculate'}
                </Button>
                <Button type="button" variant="outline" size="icon" onClick={onDuplicate} title="Duplicate">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="icon" onClick={onDelete} title="Delete">
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </FormProvider>

      <div>
        {record.result_data && <ResultsPanel result={record.result_data} />}
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

// convertToPounds converts all pence values in a TaxInput to pounds for form display.
function convertToPounds(input: TaxInput): TaxInput {
  return {
    ...input,
    income_sources: input.income_sources.map(src => ({
      ...src,
      amount: src.amount / 100,
    })),
    trading_losses: input.trading_losses / 100,
    pension_contributions: {
      sipp_gross: input.pension_contributions.sipp_gross / 125,
      salary_sacrifice_pension: input.pension_contributions.salary_sacrifice_pension / 100,
    },
    gift_aid: { donations_gross: input.gift_aid.donations_gross / 125 },
    child_benefit: input.child_benefit,
  }
}
