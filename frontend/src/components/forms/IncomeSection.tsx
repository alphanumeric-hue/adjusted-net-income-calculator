import { useFormContext, useFieldArray } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TaxInput } from '@/lib/schemas'

// IncomeSection renders a dynamic table of income sources.
// Each row has an amount, description, and income type (employment or other).
export function IncomeSection() {
  const { register, control, setValue, watch } = useFormContext<TaxInput>()
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'income_sources',
  })

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Income Sources</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left pb-2 pr-3 font-medium text-text-secondary">Amount (£)</th>
                <th className="text-left pb-2 pr-3 font-medium text-text-secondary">Description</th>
                <th className="text-left pb-2 pr-3 font-medium text-text-secondary">Type</th>
                <th className="pb-2 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {fields.map((field, index) => {
                const currentType = watch(`income_sources.${index}.income_type`)
                return (
                  <tr key={field.id}>
                    <td className="py-2 pr-3">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="tabular-nums"
                        {...register(`income_sources.${index}.amount`, { valueAsNumber: true })}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        type="text"
                        {...register(`income_sources.${index}.description`)}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <Select
                        value={currentType}
                        onValueChange={(value) =>
                          setValue(
                            `income_sources.${index}.income_type`,
                            value as 'employment' | 'other',
                            { shouldDirty: true }
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employment">Employment</SelectItem>
                          <SelectItem value="other">Other income</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                        title="Remove row"
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => append({ amount: 0, description: '', income_type: 'employment' })}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add income source
        </Button>
      </div>
    </div>
  )
}
