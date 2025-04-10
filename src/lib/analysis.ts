import {
  Kline,
  OrderBookStats,
  FundingTrendAnalysis,
  AnomalyDetection,
  FundingPressureAnalysis,
  Anomaly,
} from "@/types/funding-flow"

/**
 * Analyze funding flow trend
 */
export function analyzeFundingFlowTrend(
  klinesData: Kline[],
  windowSize: number = 10
): FundingTrendAnalysis {
  if (!klinesData || klinesData.length < windowSize) {
    return {
      trend: "unknown",
      confidence: 0,
      netInflowTotal: 0,
      netInflowRecent: 0,
      priceStage: "unknown",
    }
  }

  // Calculate total net inflow
  const netInflowTotal = klinesData.reduce((sum, k) => sum + k.netInflow, 0)

  // Calculate recent window net inflow
  const netInflowRecent = klinesData
    .slice(-windowSize)
    .reduce((sum, k) => sum + k.netInflow, 0)

  // Calculate the moving average of net inflows
  const windowInflows: number[] = []
  for (let i = 0; i <= klinesData.length - windowSize; i++) {
    const windowInflow = klinesData
      .slice(i, i + windowSize)
      .reduce((sum, k) => sum + k.netInflow, 0)
    windowInflows.push(windowInflow)
  }

  // Determine trend
  let trend: FundingTrendAnalysis["trend"] = "neutral"
  if (windowInflows.length >= 3) {
    const recentInflows = windowInflows.slice(-3)

    if (
      recentInflows.every((x) => x > 0) &&
      recentInflows[2] > recentInflows[1]
    ) {
      trend = "increasing"
    } else if (
      recentInflows.every((x) => x < 0) &&
      recentInflows[2] < recentInflows[1]
    ) {
      trend = "decreasing"
    } else if (recentInflows.filter((x) => x > 0).length >= 2) {
      trend = "slightly_increasing"
    } else if (recentInflows.filter((x) => x < 0).length >= 2) {
      trend = "slightly_decreasing"
    }
  }

  // Calculate confidence
  let confidence = 0.4 // Default for neutral
  if (trend === "increasing" || trend === "decreasing") {
    confidence = 0.8
  } else if (
    trend === "slightly_increasing" ||
    trend === "slightly_decreasing"
  ) {
    confidence = 0.6
  }

  // Determine price stage
  let priceStage = "unknown"
  if (klinesData.length >= 20) {
    const recentPrices = klinesData.slice(-20).map((k) => k.close)
    const priceChanges = recentPrices
      .slice(1)
      .map((price, i) => price - recentPrices[i])

    // Calculate price moving average
    const priceMA =
      recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length
    const latestPrice = recentPrices[recentPrices.length - 1]

    // Calculate price volatility (standard deviation)
    const priceMean =
      priceChanges.reduce((sum, change) => sum + change, 0) /
      priceChanges.length
    const priceVariance =
      priceChanges.reduce(
        (sum, change) => sum + Math.pow(change - priceMean, 2),
        0
      ) / priceChanges.length
    const priceStdDev = Math.sqrt(priceVariance)

    const priceVolatility = priceMA > 0 ? priceStdDev / priceMA : 0

    // Determine price stage based on price relation to MA and trend
    if (
      latestPrice > priceMA * 1.05 &&
      (trend === "increasing" || trend === "slightly_increasing")
    ) {
      priceStage = "上涨中"
    } else if (
      latestPrice < priceMA * 0.95 &&
      (trend === "decreasing" || trend === "slightly_decreasing")
    ) {
      priceStage = "下跌中"
    } else if (
      priceVolatility < 0.01 &&
      Math.abs(latestPrice - priceMA) / priceMA < 0.02
    ) {
      priceStage = "整理中"
    } else if (
      latestPrice > priceMA * 1.08 &&
      (trend === "decreasing" || trend === "slightly_decreasing")
    ) {
      priceStage = "可能顶部"
    } else if (
      latestPrice < priceMA * 0.92 &&
      (trend === "increasing" || trend === "slightly_increasing")
    ) {
      priceStage = "可能底部"
    } else {
      priceStage = "波动中"
    }
  }

  return {
    trend,
    confidence,
    netInflowTotal,
    netInflowRecent,
    priceStage,
  }
}

/**
 * Detect anomalies in trading data
 */
export function detectAnomalies(
  klinesData: Kline[],
  windowSize: number = 10,
  threshold: number = 2.0
): AnomalyDetection {
  if (!klinesData || klinesData.length < windowSize * 2) {
    return {
      hasAnomalies: false,
      anomalies: [],
    }
  }

  const anomalies: Anomaly[] = []

  // Calculate volume and net inflow statistics
  const volumes = klinesData.map((k) => k.volume)
  const inflows = klinesData.map((k) => k.netInflow)

  // Calculate mean and standard deviation
  const volumeMean = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length
  const inflowMean =
    inflows.reduce((sum, inflow) => sum + inflow, 0) / inflows.length

  // Calculate standard deviations
  const volumeVariance =
    volumes.reduce((sum, vol) => sum + Math.pow(vol - volumeMean, 2), 0) /
    volumes.length
  const inflowVariance =
    inflows.reduce((sum, inflow) => sum + Math.pow(inflow - inflowMean, 2), 0) /
    inflows.length

  const volumeStdDev = Math.sqrt(volumeVariance)
  const inflowStdDev = Math.sqrt(inflowVariance)

  // Check each kline for anomalies
  klinesData.forEach((kline, i) => {
    const anomaly: Partial<Anomaly> = {}

    // Detect volume anomalies
    const volumeZScore =
      volumeStdDev > 0 ? (kline.volume - volumeMean) / volumeStdDev : 0
    if (Math.abs(volumeZScore) > threshold) {
      anomaly.volume = {
        value: kline.volume,
        zScore: volumeZScore,
        direction: volumeZScore > 0 ? "high" : "low",
      }
    }

    // Detect net inflow anomalies
    const inflowZScore =
      inflowStdDev > 0 ? (kline.netInflow - inflowMean) / inflowStdDev : 0
    if (Math.abs(inflowZScore) > threshold) {
      anomaly.netInflow = {
        value: kline.netInflow,
        zScore: inflowZScore,
        direction: inflowZScore > 0 ? "high" : "low",
      }
    }

    // Detect price-volume mismatch
    if (Math.abs(kline.priceChangePct) > 1.0 && volumeZScore < 0) {
      anomaly.priceVolumeMismatch = {
        priceChange: kline.priceChangePct,
        volumeZScore,
      }
    }

    // If anomalies were found, add to list
    if (Object.keys(anomaly).length > 0) {
      anomalies.push({
        ...anomaly,
        time: kline.closeTime,
      } as Anomaly)
    }
  })

  // Return only the most recent 5 anomalies
  return {
    hasAnomalies: anomalies.length > 0,
    anomalies: anomalies.slice(-5),
  }
}

/**
 * Analyze funding pressure
 */
export function analyzeFundingPressure(
  klinesData: Kline[],
  orderbookStats: OrderBookStats
): FundingPressureAnalysis {
  if (!klinesData || !orderbookStats || klinesData.length === 0) {
    return {
      pressureDirection: "unknown",
      confidence: 0,
      imbalance: 0,
      bidAskRatio: 0,
    }
  }

  // Get orderbook imbalance
  const imbalance = orderbookStats.imbalance

  // Get recent price changes
  const recentKlines = klinesData.slice(-5)
  const recentPriceChanges = recentKlines.map((k) => k.priceChangePct)
  const avgPriceChange =
    recentPriceChanges.reduce((sum, change) => sum + change, 0) /
      recentPriceChanges.length || 0

  // Determine pressure direction
  let pressureDirection: FundingPressureAnalysis["pressureDirection"] =
    "neutral"

  if (imbalance > 0.2 && avgPriceChange > 0) {
    pressureDirection = "upward_strong"
  } else if (imbalance > 0.1 && avgPriceChange > 0) {
    pressureDirection = "upward"
  } else if (imbalance < -0.2 && avgPriceChange < 0) {
    pressureDirection = "downward_strong"
  } else if (imbalance < -0.1 && avgPriceChange < 0) {
    pressureDirection = "downward"
  } else if (imbalance > 0.1 && avgPriceChange < 0) {
    pressureDirection = "potential_reversal_up"
  } else if (imbalance < -0.1 && avgPriceChange > 0) {
    pressureDirection = "potential_reversal_down"
  }

  // Calculate confidence
  const confidence = Math.min(Math.abs(imbalance) * 2, 1.0)

  return {
    pressureDirection,
    confidence,
    imbalance,
    bidAskRatio: orderbookStats.pressureRatio,
  }
}
