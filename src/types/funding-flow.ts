export type Interval = "5m" | "15m" | "30m" | "1h" | "4h" | "1d"

export interface Kline {
  openTime: string
  closeTime: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  quoteVolume: number
  buyVolume: number
  sellVolume: number
  takerBuyBaseVolume: number
  takerBuyQuoteVolume: number
  netInflow: number
  priceChangePct: number
}

export interface PriceRange {
  highestBid: number
  lowestAsk: number
  spread: number
  spreadPct: number
}

export interface OrderBookStats {
  totalBidQty: number
  totalAskQty: number
  imbalance: number
  bidPressure: number
  askPressure: number
  pressureRatio: number
  priceRange: PriceRange
}

export interface FundingTrendAnalysis {
  trend:
    | "increasing"
    | "slightly_increasing"
    | "neutral"
    | "slightly_decreasing"
    | "decreasing"
    | "unknown"
  confidence: number
  netInflowTotal: number
  netInflowRecent: number
  priceStage: string
  reasons?: string[]
  metrics?: {
    priceTrend: number
    priceTrendDirection: string
    priceTrendStrength: number
    priceTrendPValue: number
    inflowTrend: number
    inflowTrendDirection: string
    inflowTrendStrength: number
    inflowTrendPValue: number
    correlation: number
    inflowVolumeCorrelation: number
    priceVolatility: number
    recentInflowTrend: number
  }
}

export interface Anomaly {
  volume?: {
    value: number
    zScore: number
    direction: "high" | "low"
  }
  netInflow?: {
    value: number
    zScore: number
    direction: "high" | "low"
  }
  priceVolumeMismatch?: {
    priceChange: number
    volumeZScore: number
  }
  time: string
  type?:
    | "high_volume_low_price_change"
    | "high_price_change_low_volume"
    | "extreme_net_inflow"
    | "extreme_net_outflow"
  inflowRatio?: number
  outflowRatio?: number
}

export interface AnomalyDetection {
  hasAnomalies: boolean
  anomalies: Anomaly[]
}

export interface FundingPressureAnalysis {
  pressureDirection:
    | "upward_strong"
    | "upward"
    | "neutral"
    | "downward"
    | "downward_strong"
    | "potential_reversal_up"
    | "potential_reversal_down"
    | "unknown"
  confidence: number
  imbalance: number
  bidAskRatio: number
  metrics?: {
    avgInflowRatio: number
    volumeImbalance: number
    valueImbalance: number
    nearVolumeImbalance: number
    pressureScore: number
  }
}

export interface KlinesSummary {
  firstTime: string | null
  lastTime: string | null
  priceChange: number
  currentPrice: number
  totalVolume: number
  totalQuoteVolume: number
}

export interface MarketAnalysis {
  klinesSummary: KlinesSummary
  fundingTrend: FundingTrendAnalysis
  anomalies: AnomalyDetection
  orderBook: OrderBookStats
  fundingPressure: FundingPressureAnalysis
}

export interface SymbolComparison {
  spotVsFuturesPriceDiff: number
  spotVsFuturesVolumeRatio: number
  spotVsFuturesNetInflowDiff: number
}

export interface SymbolAnalysis {
  spot: MarketAnalysis
  futures: MarketAnalysis
  comparison: SymbolComparison
}

export interface AnalysisMetadata {
  analysisTime: string
  symbolsAnalyzed: string[]
  interval: Interval
  dataSourceName: string
  klinesCount: number
}

export interface AnalysisResult {
  metadata: AnalysisMetadata
  analysis: Record<string, SymbolAnalysis>
  aiAnalysis?: string
}
