import { useMutation } from '@tanstack/react-query'
import { calculate } from '@/api/tax-records'
import type { TaxInput } from '@/lib/schemas'

// useTaxCalculation returns a TanStack Query mutation for the stateless POST /api/calculate endpoint.
export function useTaxCalculation() {
  return useMutation({
    mutationFn: (input: TaxInput) => calculate(input),
  })
}
