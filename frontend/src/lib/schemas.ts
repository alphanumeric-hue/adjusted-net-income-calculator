import { z } from 'zod'

// loginSchema validates the login form: email and password fields.
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})
export type LoginForm = z.infer<typeof loginSchema>

// registerSchema validates the registration form: email, password (min 10 chars), and confirmation.
export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(10, 'Password must be at least 10 characters'),
  password_confirm: z.string(),
}).refine((data) => data.password === data.password_confirm, {
  message: 'Passwords do not match',
  path: ['password_confirm'],
})
export type RegisterForm = z.infer<typeof registerSchema>

// incomeSourceSchema validates a single income row.
export const incomeSourceSchema = z.object({
  amount: z.number().min(0).default(0),
  description: z.string().default(''),
  income_type: z.enum(['employment', 'other']).default('employment'),
})

// pensionContributionsSchema validates pension contribution fields.
export const pensionContributionsSchema = z.object({
  sipp_gross: z.number().min(0).default(0),
  salary_sacrifice_pension: z.number().min(0).default(0),
})

// giftAidSchema validates Gift Aid donation fields.
export const giftAidSchema = z.object({
  donations_gross: z.number().min(0).default(0),
})

// childBenefitSchema validates child benefit claim fields.
export const childBenefitSchema = z.object({
  claimed: z.boolean().default(false),
  number_of_children: z.number().int().min(0).max(20).default(0),
})

// taxInputSchema validates the complete tax input form matching the backend TaxInput struct.
export const taxInputSchema = z.object({
  tax_year: z.string(),
  income_sources: z.array(incomeSourceSchema).default([
    { amount: 0, description: 'Salary', income_type: 'employment' },
  ]),
  pension_contributions: pensionContributionsSchema,
  gift_aid: giftAidSchema,
  trading_losses: z.number().min(0).default(0),
  child_benefit: childBenefitSchema,
})
export type TaxInput = z.infer<typeof taxInputSchema>

// taxBandSchema represents a single tax band in the calculation result.
export const taxBandSchema = z.object({
  name: z.string(),
  lower_bound: z.number(),
  upper_bound: z.number(),
  rate: z.number(),
  tax_amount: z.number(),
  income: z.number(),
})

// taxResultSchema validates the complete tax calculation result from the API.
export const taxResultSchema = z.object({
  gross_income: z.number(),
  total_deductions: z.number(),
  adjusted_net_income: z.number(),
  personal_allowance: z.number(),
  taxable_income: z.number(),
  income_tax: z.number(),
  tax_bands: z.array(taxBandSchema),
  national_insurance: z.number(),
  employee_ni_saved: z.number(),
  employer_ni_saved: z.number(),
  hicbc: z.number(),
  total_tax: z.number(),
  net_income: z.number(),
  effective_rate_bps: z.number(),
  marginal_rate_bps: z.number(),
  salary_sacrifice_reduction: z.number(),
  sipp_relief: z.number(),
  gift_aid_deduction: z.number(),
})
export type TaxResult = z.infer<typeof taxResultSchema>

// taxRecordSchema validates a tax record response from the API.
export const taxRecordSchema = z.object({
  id: z.string(),
  tax_year: z.string(),
  label: z.string(),
  input_data: taxInputSchema,
  result_data: taxResultSchema.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})
export type TaxRecord = z.infer<typeof taxRecordSchema>

// taxYearSummarySchema validates a tax year summary from the API.
export const taxYearSummarySchema = z.object({
  tax_year: z.string(),
  scenario_count: z.number(),
  last_updated: z.string().nullable(),
})
export type TaxYearSummary = z.infer<typeof taxYearSummarySchema>

// userSchema validates the user response from the API.
export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  is_admin: z.boolean(),
  force_password_reset: z.boolean(),
})
export type User = z.infer<typeof userSchema>

// adminUserSchema validates a single user entry returned by the admin user list endpoint.
export const adminUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  is_admin: z.boolean(),
  force_password_reset: z.boolean(),
  created_at: z.string(),
})
export type AdminUser = z.infer<typeof adminUserSchema>

// userUpdateSchema validates a single user update payload for the admin bulk-update endpoint.
export const userUpdateSchema = z.object({
  id: z.string(),
  is_admin: z.boolean(),
  force_password_reset: z.boolean(),
})
export type UserUpdate = z.infer<typeof userUpdateSchema>

// resetPasswordSchema validates the password reset form with confirmation matching.
export const resetPasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(10, 'New password must be at least 10 characters'),
  new_password_confirm: z.string(),
}).refine((data) => data.new_password === data.new_password_confirm, {
  message: 'Passwords do not match',
  path: ['new_password_confirm'],
})
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

// defaultTaxInput returns a TaxInput with all fields set to their default zero values.
export function defaultTaxInput(taxYear: string): TaxInput {
  return {
    tax_year: taxYear,
    income_sources: [{ amount: 0, description: 'Salary', income_type: 'employment' }],
    pension_contributions: { sipp_gross: 0, salary_sacrifice_pension: 0 },
    gift_aid: { donations_gross: 0 },
    trading_losses: 0,
    child_benefit: { claimed: false, number_of_children: 0 },
  }
}
