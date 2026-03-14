import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// cn merges Tailwind CSS class names, resolving conflicts via tailwind-merge.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
