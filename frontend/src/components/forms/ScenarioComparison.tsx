import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatPenceCurrency, formatPercentage } from '@/lib/format'
import type { TaxRecord } from '@/lib/schemas'

interface ScenarioComparisonProps {
  records: TaxRecord[]
}

// ScenarioComparison renders a side-by-side table comparing key figures
// across multiple scenarios for the same tax year.
export function ScenarioComparison({ records }: ScenarioComparisonProps) {
  const withResults = records.filter((r) => r.result_data)

  if (withResults.length < 2) {
    return <p className="text-sm text-text-muted">Create at least 2 scenarios to compare.</p>
  }

  const rows = [
    { label: 'Gross Income', key: 'gross_income' as const },
    { label: 'Adjusted Net Income', key: 'adjusted_net_income' as const },
    { label: 'Personal Allowance', key: 'personal_allowance' as const },
    { label: 'Income Tax', key: 'income_tax' as const },
    { label: 'National Insurance', key: 'national_insurance' as const },
    { label: 'HICBC', key: 'hicbc' as const },
    { label: 'Total Tax', key: 'total_tax' as const },
    { label: 'Net Income', key: 'net_income' as const },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Scenario Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-text-secondary font-medium">Metric</th>
                {withResults.map((r) => (
                  <th key={r.id} className="text-right py-2 text-text-secondary font-medium px-3">
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-border/50">
                  <td className="py-2 text-text-primary">{row.label}</td>
                  {withResults.map((r) => {
                    const value = r.result_data![row.key]
                    const baseValue = withResults[0].result_data![row.key]
                    const diff = value - baseValue
                    return (
                      <td key={r.id} className="py-2 text-right px-3">
                        <span className="tabular-nums text-text-primary">
                          {formatPenceCurrency(value)}
                        </span>
                        {r !== withResults[0] && diff !== 0 && (
                          <span className={`block text-xs tabular-nums ${diff > 0 ? 'text-accent-green' : 'text-danger'}`}>
                            {diff > 0 ? '+' : ''}{formatPenceCurrency(diff)}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-2 text-text-primary">Effective Rate</td>
                {withResults.map((r) => (
                  <td key={r.id} className="py-2 text-right px-3 tabular-nums text-text-primary">
                    {formatPercentage(r.result_data!.effective_rate_bps)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
