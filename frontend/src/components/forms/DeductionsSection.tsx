import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TaxInput } from '@/lib/schemas'

// DeductionsSection renders form fields for trading losses, Gift Aid donations,
// and child benefit details (claimed status and number of children).
export function DeductionsSection() {
  const { register, watch } = useFormContext<TaxInput>()
  const claimed = watch('child_benefit.claimed')

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Trading Losses</h3>
        <div className="max-w-sm space-y-2">
          <Label htmlFor="trading_losses">Trading Losses (£)</Label>
          <Input
            id="trading_losses"
            type="number"
            step="1"
            min="0"
            className="tabular-nums"
            {...register('trading_losses', { valueAsNumber: true })}
          />
          <p className="text-xs text-text-muted">Self-employment trading losses reduce your adjusted net income.</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Gift Aid</h3>
        <div className="max-w-sm space-y-2">
          <Label htmlFor="gift_aid">Gift Aid Donations — Net Amount (£)</Label>
          <Input
            id="gift_aid"
            type="number"
            step="1"
            min="0"
            className="tabular-nums"
            {...register('gift_aid.donations_gross', { valueAsNumber: true })}
          />
          <p className="text-xs text-text-muted">The amount you donated. The gross donation (×1.25) is deducted from your adjusted net income.</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Child Benefit</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="child_benefit_claimed"
              className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
              {...register('child_benefit.claimed')}
            />
            <Label htmlFor="child_benefit_claimed">I claim Child Benefit</Label>
          </div>
          {claimed && (
            <div className="max-w-xs space-y-2">
              <Label htmlFor="num_children">Number of Children</Label>
              <Input
                id="num_children"
                type="number"
                step="1"
                min="1"
                max="20"
                {...register('child_benefit.number_of_children', { valueAsNumber: true })}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
