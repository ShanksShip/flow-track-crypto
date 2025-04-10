import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface SymbolPillProps {
  symbol: string
  onRemove: () => void
  disabled?: boolean
  className?: string
}

export function SymbolPill({
  symbol,
  onRemove,
  disabled = false,
  className,
}: SymbolPillProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {symbol}
      <button
        onClick={onRemove}
        disabled={disabled}
        className="ml-1 rounded-full p-0.5 text-primary hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:pointer-events-none"
        aria-label={`Remove ${symbol}`}
      >
        <XIcon size={14} />
      </button>
    </div>
  )
}
