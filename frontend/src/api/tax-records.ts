import { api } from './client'
import type { TaxInput, TaxResult, TaxRecord, TaxYearSummary } from '@/lib/schemas'

// calculate performs a stateless tax calculation without saving (no auth required).
export async function calculate(input: TaxInput): Promise<TaxResult> {
  return api.post('calculate', { json: input }).json<TaxResult>()
}

// createTaxRecord creates a new tax record with the given data and returns it.
export async function createTaxRecord(data: {
  tax_year: string
  label: string
  input_data: TaxInput
}): Promise<TaxRecord> {
  return api.post('tax-records', { json: data }).json<TaxRecord>()
}

// getTaxRecord retrieves a single tax record by its ID.
export async function getTaxRecord(id: string): Promise<TaxRecord> {
  return api.get(`tax-records/${id}`).json<TaxRecord>()
}

// listTaxRecords lists all tax records, optionally filtered by tax year.
export async function listTaxRecords(year?: string): Promise<TaxRecord[]> {
  const searchParams = year ? { year } : undefined
  return api.get('tax-records', { searchParams }).json<TaxRecord[]>()
}

// updateTaxRecord updates a tax record's input data and triggers recalculation.
export async function updateTaxRecord(id: string, data: { input_data: TaxInput }): Promise<TaxRecord> {
  return api.put(`tax-records/${id}`, { json: data }).json<TaxRecord>()
}

// deleteTaxRecord deletes a tax record by its ID.
export async function deleteTaxRecord(id: string): Promise<void> {
  await api.delete(`tax-records/${id}`)
}

// duplicateTaxRecord creates a copy of an existing record with a new label.
export async function duplicateTaxRecord(id: string, label: string): Promise<TaxRecord> {
  return api.post(`tax-records/${id}/duplicate`, { json: { label } }).json<TaxRecord>()
}

// listTaxYears returns a summary of tax years the user has records for.
export async function listTaxYears(): Promise<TaxYearSummary[]> {
  return api.get('tax-years').json<TaxYearSummary[]>()
}

// listAvailableTaxYears returns tax years the user hasn't created records for yet.
export async function listAvailableTaxYears(): Promise<string[]> {
  return api.get('tax-years/available').json<string[]>()
}
