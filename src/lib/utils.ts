import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format number to a more readable format with appropriate decimal places
 */
export function formatNumber(num: number): string {
  if (typeof num !== "number") return String(num)
  return formatNumberWithCommas(num)
}

export function formatNumberWithCommas(num: number): string {
  return num.toLocaleString("en-US", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
