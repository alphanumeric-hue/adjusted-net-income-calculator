import { describe, it, expect } from 'vitest'
import {
  formatPence,
  formatPenceCurrency,
  penceToPounds,
  poundsToPence,
  formatPercentage,
  formatBPS,
} from './format'

describe('formatPence', () => {
  it('formats zero', () => {
    expect(formatPence(0)).toBe('0.00')
  })

  it('formats small values', () => {
    expect(formatPence(100)).toBe('1.00')
    expect(formatPence(150)).toBe('1.50')
    expect(formatPence(99)).toBe('0.99')
  })

  it('formats large values with comma separators', () => {
    expect(formatPence(5000000)).toBe('50,000.00')
    expect(formatPence(8500000)).toBe('85,000.00')
    expect(formatPence(12570000)).toBe('125,700.00')
  })
})

describe('formatPenceCurrency', () => {
  it('prepends £ symbol', () => {
    expect(formatPenceCurrency(5000000)).toBe('£50,000.00')
    expect(formatPenceCurrency(0)).toBe('£0.00')
  })
})

describe('penceToPounds', () => {
  it('converts pence to pounds', () => {
    expect(penceToPounds(0)).toBe(0)
    expect(penceToPounds(100)).toBe(1)
    expect(penceToPounds(8500000)).toBe(85000)
    expect(penceToPounds(150)).toBe(1.5)
  })
})

describe('poundsToPence', () => {
  it('converts pounds to pence', () => {
    expect(poundsToPence(0)).toBe(0)
    expect(poundsToPence(1)).toBe(100)
    expect(poundsToPence(85000)).toBe(8500000)
  })

  it('rounds to nearest pence', () => {
    expect(poundsToPence(1.006)).toBe(101)
    expect(poundsToPence(99.999)).toBe(10000)
  })
})

describe('formatPercentage', () => {
  it('converts basis points to percentage string', () => {
    expect(formatPercentage(2000)).toBe('20.00%')
    expect(formatPercentage(4000)).toBe('40.00%')
    expect(formatPercentage(4500)).toBe('45.00%')
    expect(formatPercentage(0)).toBe('0.00%')
  })

  it('handles fractional percentages', () => {
    expect(formatPercentage(800)).toBe('8.00%')
    expect(formatPercentage(200)).toBe('2.00%')
    expect(formatPercentage(3350)).toBe('33.50%')
  })
})

describe('formatBPS', () => {
  it('converts basis points to decimal percentage', () => {
    expect(formatBPS(2000)).toBe('20.0')
    expect(formatBPS(4500)).toBe('45.0')
    expect(formatBPS(0)).toBe('0.0')
  })
})
