import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatPenceCurrency, formatPercentage } from '@/lib/format'
import { SummaryCards } from './SummaryCards'
import { TaxBandBreakdown } from './TaxBandBreakdown'
import type { TaxResult } from '@/lib/schemas'

interface ResultsPanelProps {
  result: TaxResult
  isPreview?: boolean
}

// ResultsPanel renders the complete tax calculation breakdown including
// summary cards, income breakdown, deductions, tax bands, NI, and HICBC.
export function ResultsPanel({ result, isPreview = false }: ResultsPanelProps) {
  return (
    <div className="space-y-6">
      {isPreview && (
        <p className="text-xs text-text-muted">Live preview — save for authoritative calculation</p>
      )}

      <SummaryCards result={result} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Income Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <Row label="Gross Income" value={result.gross_income} />
            <Row label="Total Deductions" value={-result.total_deductions} />
            <Divider />
            <Row label="Adjusted Net Income" value={result.adjusted_net_income} bold />
            <Row label="Personal Allowance" value={-result.personal_allowance} />
            <Divider />
            <Row label="Taxable Income" value={result.taxable_income} bold />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Income Tax by Band</CardTitle>
        </CardHeader>
        <CardContent>
          <TaxBandBreakdown result={result} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Other Charges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <Row label="National Insurance" value={result.national_insurance} />
            {result.hicbc > 0 && (
              <Row label="High Income Child Benefit Charge" value={result.hicbc} />
            )}
            <Divider />
            <Row label="Total Tax & NI" value={result.total_tax} bold />
            <Row label="Marginal Rate" valueStr={formatPercentage(result.marginal_rate_bps)} />
          </div>
        </CardContent>
      </Card>

      {(result.salary_sacrifice_reduction > 0 || result.employee_ni_saved > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Salary Sacrifice Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <Row label="Salary Sacrifice Amount" value={result.salary_sacrifice_reduction} />
              <Row label="Employee NI Saved" value={result.employee_ni_saved} className="text-accent-green" />
              <Row label="Employer NI Saved" value={result.employer_ni_saved} className="text-accent-green" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Row renders a single label-value row in the results breakdown.
function Row({ label, value, valueStr, bold, className }: {
  label: string
  value?: number
  valueStr?: string
  bold?: boolean
  className?: string
}) {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold' : ''}`}>
      <span className="text-text-secondary">{label}</span>
      <span className={`tabular-nums ${className || 'text-text-primary'}`}>
        {valueStr ?? (value !== undefined ? formatPenceCurrency(value) : '')}
      </span>
    </div>
  )
}

// Divider renders a horizontal line between result sections.
function Divider() {
  return <div className="border-t border-border my-1" />
}
