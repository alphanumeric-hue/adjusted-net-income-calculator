import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useTaxYears } from '@/hooks/useTaxYears'
import { listTaxRecords } from '@/api/tax-records'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatPenceCurrency, formatPercentage } from '@/lib/format'
import type { TaxRecord } from '@/lib/schemas'

// CompareYears renders a cross-year comparison page where users can select
// 2-3 tax years and see key figures side-by-side.
export default function CompareYears() {
  const { isAuthenticated } = useAuth()
  const { data: taxYears } = useTaxYears()
  const [selectedYears, setSelectedYears] = useState<string[]>([])

  const recordsQuery = useQuery({
    queryKey: ['tax-records', 'all'],
    queryFn: () => listTaxRecords(),
    enabled: isAuthenticated,
  })

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">Please log in to compare tax years.</p>
      </div>
    )
  }

  const allRecords: TaxRecord[] = recordsQuery.data ?? []

  // toggleYear adds or removes a year from the selection (max 3).
  const toggleYear = (year: string) => {
    setSelectedYears((prev) => {
      if (prev.includes(year)) return prev.filter((y) => y !== year)
      if (prev.length >= 3) return prev
      return [...prev, year]
    })
  }

  // Get the default scenario (first record) for each selected year
  const comparisonData = selectedYears.map((year) => {
    const records = allRecords.filter((r) => r.tax_year === year)
    const defaultRecord = records.find((r) => r.label === 'Default') || records[0]
    return { year, record: defaultRecord }
  }).filter((d) => d.record?.result_data)

  const rows = [
    { label: 'Gross Income', key: 'gross_income' as const },
    { label: 'Adjusted Net Income', key: 'adjusted_net_income' as const },
    { label: 'Personal Allowance', key: 'personal_allowance' as const },
    { label: 'Income Tax', key: 'income_tax' as const },
    { label: 'National Insurance', key: 'national_insurance' as const },
    { label: 'Total Tax', key: 'total_tax' as const },
    { label: 'Net Income', key: 'net_income' as const },
  ]

  return (
    <div>
      <h1 className="text-2xl font-serif font-semibold text-text-primary mb-6">Compare Tax Years</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        {(taxYears ?? []).map((ty) => (
          <Button
            key={ty.tax_year}
            variant={selectedYears.includes(ty.tax_year) ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleYear(ty.tax_year)}
          >
            {ty.tax_year}
          </Button>
        ))}
      </div>

      {comparisonData.length >= 2 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Year-on-Year Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-text-secondary font-medium">Metric</th>
                    {comparisonData.map((d) => (
                      <th key={d.year} className="text-right py-2 text-text-secondary font-medium px-3">
                        {d.year}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key} className="border-b border-border/50">
                      <td className="py-2 text-text-primary">{row.label}</td>
                      {comparisonData.map((d) => (
                        <td key={d.year} className="py-2 text-right px-3 tabular-nums text-text-primary">
                          {formatPenceCurrency(d.record!.result_data![row.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className="py-2 text-text-primary">Effective Rate</td>
                    {comparisonData.map((d) => (
                      <td key={d.year} className="py-2 text-right px-3 tabular-nums text-text-primary">
                        {formatPercentage(d.record!.result_data!.effective_rate_bps)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-text-muted">Select at least 2 tax years to compare.</p>
      )}
    </div>
  )
}
