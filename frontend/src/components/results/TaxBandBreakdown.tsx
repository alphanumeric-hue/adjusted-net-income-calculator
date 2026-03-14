import { formatPenceCurrency, formatPercentage } from '@/lib/format'
import type { TaxResult } from '@/lib/schemas'

interface TaxBandBreakdownProps {
  result: TaxResult
}

// TaxBandBreakdown renders a table showing the income and tax amount for each
// tax band (Basic, Higher, Additional rate).
export function TaxBandBreakdown({ result }: TaxBandBreakdownProps) {
  if (result.tax_bands.length === 0) {
    return <p className="text-sm text-text-muted">No taxable income</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 text-text-secondary font-medium">Band</th>
            <th className="text-right py-2 text-text-secondary font-medium">Rate</th>
            <th className="text-right py-2 text-text-secondary font-medium">Income</th>
            <th className="text-right py-2 text-text-secondary font-medium">Tax</th>
          </tr>
        </thead>
        <tbody>
          {result.tax_bands.map((band) => (
            <tr key={band.name} className="border-b border-border/50">
              <td className="py-2 text-text-primary">{band.name}</td>
              <td className="py-2 text-right tabular-nums text-text-secondary">{formatPercentage(band.rate)}</td>
              <td className="py-2 text-right tabular-nums text-text-primary">{formatPenceCurrency(band.income)}</td>
              <td className="py-2 text-right tabular-nums text-text-primary">{formatPenceCurrency(band.tax_amount)}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="py-2 text-text-primary" colSpan={2}>Total Income Tax</td>
            <td className="py-2 text-right tabular-nums text-text-primary">{formatPenceCurrency(result.taxable_income)}</td>
            <td className="py-2 text-right tabular-nums text-text-primary">{formatPenceCurrency(result.income_tax)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
