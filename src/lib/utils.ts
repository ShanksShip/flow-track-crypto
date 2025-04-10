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

  if (Math.abs(num) >= 1000) {
    return num.toFixed(2)
  } else if (Math.abs(num) >= 1) {
    return num.toFixed(4)
  } else {
    return num.toFixed(8)
  }
}
