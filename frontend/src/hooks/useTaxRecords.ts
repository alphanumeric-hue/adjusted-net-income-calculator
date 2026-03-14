import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listTaxRecords,
  getTaxRecord,
  createTaxRecord,
  updateTaxRecord,
  deleteTaxRecord,
  duplicateTaxRecord,
} from '@/api/tax-records'
import type { TaxInput } from '@/lib/schemas'

// useTaxRecordsByYear fetches all tax records for a specific tax year.
export function useTaxRecordsByYear(year: string) {
  return useQuery({
    queryKey: ['tax-records', year],
    queryFn: () => listTaxRecords(year),
    enabled: !!year,
  })
}

// useTaxRecord fetches a single tax record by ID.
export function useTaxRecord(id: string) {
  return useQuery({
    queryKey: ['tax-records', 'detail', id],
    queryFn: () => getTaxRecord(id),
    enabled: !!id,
  })
}

// useCreateTaxRecord returns a mutation for creating a new tax record.
export function useCreateTaxRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { tax_year: string; label: string; input_data: TaxInput }) =>
      createTaxRecord(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-records'] })
      queryClient.invalidateQueries({ queryKey: ['tax-years'] })
    },
  })
}

// useUpdateTaxRecord returns a mutation for updating an existing tax record.
export function useUpdateTaxRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input_data }: { id: string; input_data: TaxInput }) =>
      updateTaxRecord(id, { input_data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-records'] })
      queryClient.invalidateQueries({ queryKey: ['tax-years'] })
    },
  })
}

// useDeleteTaxRecord returns a mutation for deleting a tax record.
export function useDeleteTaxRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTaxRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-records'] })
      queryClient.invalidateQueries({ queryKey: ['tax-years'] })
    },
  })
}

// useDuplicateTaxRecord returns a mutation for duplicating a tax record with a new label.
export function useDuplicateTaxRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) =>
      duplicateTaxRecord(id, label),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-records'] })
      queryClient.invalidateQueries({ queryKey: ['tax-years'] })
    },
  })
}
