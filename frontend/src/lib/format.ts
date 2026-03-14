// formatPence converts an integer pence value to a formatted pound string (e.g. "50,000.00").
export function formatPence(pence: number): string {
  const pounds = pence / 100
  return new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(pounds)
}

// formatPenceCurrency converts pence to a formatted pound string with £ symbol.
export function formatPenceCurrency(pence: number): string {
  return `£${formatPence(pence)}`
}

// penceToPounds converts an integer pence value to a decimal pounds value.
export function penceToPounds(pence: number): number {
  return pence / 100
}

// poundsToPence converts a decimal pounds value to integer pence.
export function poundsToPence(pounds: number): number {
  return Math.round(pounds * 100)
}

// formatPercentage converts basis points to a formatted percentage string (e.g. "20.00%").
export function formatPercentage(bps: number): string {
  const percent = bps / 100
  return `${percent.toFixed(2)}%`
}

// formatBPS converts basis points to a decimal percentage for display.
export function formatBPS(bps: number): string {
  return (bps / 100).toFixed(1)
}
