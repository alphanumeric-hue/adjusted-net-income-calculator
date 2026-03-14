import { useQuery } from '@tanstack/react-query'
import { listTaxYears, listAvailableTaxYears } from '@/api/tax-records'
import { useAuth } from '@/context/AuthContext'

// useTaxYears fetches the list of tax years the authenticated user has records for.
export function useTaxYears() {
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: ['tax-years'],
    queryFn: listTaxYears,
    enabled: isAuthenticated,
  })
}

// useAvailableTaxYears fetches the list of tax years the user hasn't created records for yet.
export function useAvailableTaxYears() {
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: ['tax-years', 'available'],
    queryFn: listAvailableTaxYears,
    enabled: isAuthenticated,
  })
}
