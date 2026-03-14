import { Card, CardContent } from '@/components/ui/card'
import { formatPenceCurrency, formatPercentage } from '@/lib/format'
import type { TaxResult } from '@/lib/schemas'

interface SummaryCardsProps {
  result: TaxResult
}

// SummaryCards renders the top-level summary figures: Adjusted Net Income,
// Total Tax, Net Income, and Effective Tax Rate.
export function SummaryCards({ result }: SummaryCardsProps) {
  const cards = [
    { label: 'Adjusted Net Income', value: formatPenceCurrency(result.adjusted_net_income), color: 'text-text-primary' },
    { label: 'Total Tax', value: formatPenceCurrency(result.total_tax), color: 'text-danger' },
    { label: 'Net Income', value: formatPenceCurrency(result.net_income), color: 'text-accent-green' },
    { label: 'Effective Rate', value: formatPercentage(result.effective_rate_bps), color: 'text-accent-blue' },
  ]

  return (
    <div className="grid grid-cols-2 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4">
            <p className="text-xs text-text-secondary font-medium mb-1">{card.label}</p>
            <p className={`text-lg sm:text-xl font-semibold tabular-nums ${card.color}`}>{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
