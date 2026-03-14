import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TaxInput } from '@/lib/schemas'

// PensionSection renders form fields for salary sacrifice and personal pension (SIPP) contributions.
export function PensionSection() {
  const { register } = useFormContext<TaxInput>()

  return (
    <div>
      <h3 className="text-lg font-semibold text-text-primary mb-4">Pension Contributions</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="salary_sacrifice">Salary Sacrifice Pension (£)</Label>
          <Input
            id="salary_sacrifice"
            type="number"
            step="1"
            min="0"
            className="tabular-nums"
            {...register('pension_contributions.salary_sacrifice_pension', { valueAsNumber: true })}
          />
          <p className="text-xs text-text-muted">Reduces your gross income and National Insurance liability.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sipp_gross">Personal Pension / SIPP (£)</Label>
          <Input
            id="sipp_gross"
            type="number"
            step="1"
            min="0"
            className="tabular-nums"
            {...register('pension_contributions.sipp_gross', { valueAsNumber: true })}
          />
          <p className="text-xs text-text-muted">The amount you paid to your provider. The gross contribution (×1.25) is deducted from your adjusted net income.</p>
        </div>
      </div>
    </div>
  )
}
