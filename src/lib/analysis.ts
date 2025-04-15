import {
  Kline,
  OrderBookStats,
  FundingTrendAnalysis,
  AnomalyDetection,
  FundingPressureAnalysis,
  Anomaly,
} from "@/types/funding-flow"

/**
 * 线性回归计算
 * 模拟 Python中的stats.linregress 函数
 */
function linearRegression(
  x: number[],
  y: number[]
): {
  slope: number
  intercept: number
  rValue: number
  pValue: number
  stdErr: number
} {
  const n = x.length
  if (n !== y.length || n === 0) {
    return {
      slope: 0,
      intercept: 0,
      rValue: 0,
      pValue: 0,
      stdErr: 0,
    }
  }

  // 计算平均值
  const xMean = x.reduce((sum, val) => sum + val, 0) / n
  const yMean = y.reduce((sum, val) => sum + val, 0) / n

  // 计算各种总和
  let xxSum = 0,
    yySum = 0,
    xySum = 0
  for (let i = 0; i < n; i++) {
    const xDiff = x[i] - xMean
    const yDiff = y[i] - yMean
    xxSum += xDiff * xDiff
    yySum += yDiff * yDiff
    xySum += xDiff * yDiff
  }

  // 计算斜率和截距
  const slope = xxSum === 0 ? 0 : xySum / xxSum
  const intercept = yMean - slope * xMean

  // 计算相关系数r
  const rValue =
    Math.sqrt(xxSum * yySum) === 0 ? 0 : xySum / Math.sqrt(xxSum * yySum)

  // 简化的 p 值和标准误差计算（实际上需要t分布等更复杂的计算）
  const pValue = 0 // 简化，实际计算较复杂
  const stdErr = 0 // 简化，实际计算较复杂

  return { slope, intercept, rValue, pValue, stdErr }
}

/**
 * 计算两个数组的相关系数
 * 模拟 Python 中的 np.corrcoef 函数
 */
function correlationCoefficient(x: number[], y: number[]): number {
  const n = x.length
  if (n !== y.length || n === 0) {
    return 0
  }

  // 计算平均值
  const xMean = x.reduce((sum, val) => sum + val, 0) / n
  const yMean = y.reduce((sum, val) => sum + val, 0) / n

  // 计算分子和分母
  let numerator = 0
  let xDenominator = 0
  let yDenominator = 0

  for (let i = 0; i < n; i++) {
    const xDiff = x[i] - xMean
    const yDiff = y[i] - yMean
    numerator += xDiff * yDiff
    xDenominator += xDiff * xDiff
    yDenominator += yDiff * yDiff
  }

  // 计算相关系数
  return Math.sqrt(xDenominator * yDenominator) === 0
    ? 0
    : numerator / Math.sqrt(xDenominator * yDenominator)
}

/**
 * 计算标准差
 * 模拟Python中的np.std函数
 */
function standardDeviation(values: number[]): number {
  const n = values.length
  if (n === 0) return 0

  const mean = values.reduce((sum, val) => sum + val, 0) / n
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n
  return Math.sqrt(variance)
}

/**
 * 按照 Python 代码分析资金流向趋势
 */
export function analyzeFundingFlowTrend(klinesData: Kline[]): FundingTrendAnalysis {
  if (!klinesData || klinesData.length < 10) {
    return {
      trend: "unknown",
      confidence: 0,
      netInflowTotal: 0,
      netInflowRecent: 0,
      priceStage: "数据不足，无法分析",
    }
  }

  // 按照时间排序 (假设已排序)
  const sortedData = [...klinesData]

  // 提取价格和资金流向数据
  const prices = sortedData.map((k) => k.close)
  const netInflows = sortedData.map((k) => k.netInflow)
  const volumes = sortedData.map((k) => k.quoteVolume)

  // 计算总净流入
  const netInflowTotal = netInflows.reduce((sum, inflow) => sum + inflow, 0)

  // 计算最近的净流入 (最后10个周期)
  const netInflowRecent = netInflows
    .slice(-10)
    .reduce((sum, inflow) => sum + inflow, 0)

  // 计算价格趋势
  const priceChanges = []
  for (let i = 1; i < prices.length; i++) {
    priceChanges.push(prices[i] - prices[i - 1])
  }
  const priceTrend =
    priceChanges.filter((change) => change > 0).length / priceChanges.length

  // 计算资金流向趋势
  const inflowChanges = []
  for (let i = 1; i < netInflows.length; i++) {
    inflowChanges.push(netInflows[i] - netInflows[i - 1])
  }
  const inflowTrend =
    inflowChanges.filter((change) => change > 0).length / inflowChanges.length

  // 计算成交量趋势
  const volumeChanges = []
  for (let i = 1; i < volumes.length; i++) {
    volumeChanges.push(volumes[i] - volumes[i - 1])
  }
  const volumeTrend =
    volumeChanges.filter((change) => change > 0).length / volumeChanges.length

  // 计算价格与资金流向的相关性
  const correlation = correlationCoefficient(prices, netInflows)

  // 计算资金流向与成交量的相关性
  const inflowVolumeCorr = correlationCoefficient(netInflows, volumes)

  // 计算价格波动率
  const priceVolatility =
    prices.length > 0 &&
    Math.abs(prices.reduce((sum, p) => sum + p, 0) / prices.length) > 0
      ? standardDeviation(priceChanges) /
        (prices.reduce((sum, p) => sum + p, 0) / prices.length)
      : 0

  // 使用线性回归分析价格趋势
  const x = Array.from({ length: prices.length }, (_, i) => i)
  const priceRegression = linearRegression(x, prices)
  const priceTrendStrength = Math.abs(priceRegression.rValue)
  const priceTrendDirection = priceRegression.slope > 0 ? "up" : "down"

  // 使用线性回归分析资金流向趋势
  const inflowRegression = linearRegression(x, netInflows)
  const inflowTrendStrength = Math.abs(inflowRegression.rValue)
  const inflowTrendDirection =
    inflowRegression.slope > 0 ? "increasing" : "decreasing"

  // 分析最近的资金流向变化
  const recentInflows = netInflows.slice(-10)
  let recentInflowTrend = 0
  if (recentInflows.length > 1) {
    let increasingCount = 0
    for (let i = 1; i < recentInflows.length; i++) {
      if (recentInflows[i] > recentInflows[i - 1]) {
        increasingCount++
      }
    }
    recentInflowTrend = increasingCount / (recentInflows.length - 1)
  }

  // 根据各种指标判断价格所处阶段
  let stage = "unknown"
  let confidence = 0
  let reasons: string[] = []

  // 顶部特征
  if (priceTrend > 0.7 && inflowTrend < 0.3 && correlation < -0.3) {
    stage = "顶部"
    confidence = Math.min(0.7 + priceTrend - inflowTrend - correlation, 0.95)
    reasons = [
      "价格持续上涨但资金流入减少",
      "价格与资金流向呈负相关",
      `价格趋势强度: ${priceTrendStrength.toFixed(
        2
      )}, 资金流向趋势强度: ${inflowTrendStrength.toFixed(2)}`,
    ]
  }
  // 底部特征
  else if (priceTrend < 0.3 && inflowTrend > 0.7 && correlation < -0.3) {
    stage = "底部"
    confidence = Math.min(0.7 - priceTrend + inflowTrend - correlation, 0.95)
    reasons = [
      "价格持续下跌但资金流入增加",
      "价格与资金流向呈负相关",
      `价格趋势强度: ${priceTrendStrength.toFixed(
        2
      )}, 资金流向趋势强度: ${inflowTrendStrength.toFixed(2)}`,
    ]
  }
  // 上涨中特征
  else if (priceTrend > 0.6 && inflowTrend > 0.6 && correlation > 0.3) {
    stage = "上涨中"
    confidence = Math.min(priceTrend + inflowTrend + correlation - 1.0, 0.95)
    reasons = [
      "价格与资金流入同步增加",
      "价格与资金流向呈正相关",
      `价格趋势强度: ${priceTrendStrength.toFixed(
        2
      )}, 资金流向趋势强度: ${inflowTrendStrength.toFixed(2)}`,
    ]
  }
  // 下跌中特征
  else if (priceTrend < 0.4 && inflowTrend < 0.4 && correlation > 0.3) {
    stage = "下跌中"
    confidence = Math.min(1.0 - priceTrend - inflowTrend + correlation, 0.95)
    reasons = [
      "价格与资金流入同步减少",
      "价格与资金流向呈正相关",
      `价格趋势强度: ${priceTrendStrength.toFixed(
        2
      )}, 资金流向趋势强度: ${inflowTrendStrength.toFixed(2)}`,
    ]
  }
  // 整理阶段特征
  else if (Math.abs(priceTrend - 0.5) < 0.15 && priceVolatility < 0.01) {
    stage = "整理中"
    confidence = 0.5 + (0.15 - Math.abs(priceTrend - 0.5)) * 3
    reasons = [
      "价格波动率低",
      "无明显趋势",
      `价格波动率: ${priceVolatility.toFixed(4)}`,
    ]
  }
  // 其他情况，根据趋势强度判断
  else {
    if (priceTrend > 0.5) {
      if (inflowTrend > 0.5) {
        stage = "上涨中"
        confidence = (priceTrend + inflowTrend) / 2
        reasons = ["价格和资金流向均呈上升趋势"]
      } else {
        stage = "减弱上涨"
        confidence = priceTrend * (1 - inflowTrend)
        reasons = ["价格上升但资金流向减弱"]
      }
    } else {
      if (inflowTrend < 0.5) {
        stage = "下跌中"
        confidence = (1 - priceTrend + 1 - inflowTrend) / 2
        reasons = ["价格和资金流向均呈下降趋势"]
      } else {
        stage = "减弱下跌"
        confidence = (1 - priceTrend) * inflowTrend
        reasons = ["价格下降但资金流向增强"]
      }
    }
  }

  // 确定资金流向趋势方向
  let trend: FundingTrendAnalysis["trend"] = "neutral"
  if (inflowTrendDirection === "increasing" && inflowTrendStrength > 0.5) {
    trend = "increasing"
  } else if (inflowTrendDirection === "increasing" && inflowTrendStrength > 0.3) {
    trend = "slightly_increasing"
  } else if (inflowTrendDirection === "decreasing" && inflowTrendStrength > 0.5) {
    trend = "decreasing"
  } else if (
    inflowTrendDirection === "decreasing" &&
    inflowTrendStrength > 0.3
  ) {
    trend = "slightly_decreasing"
  }

  // 返回结果，包含详细信息
  return {
    trend,
    confidence,
    netInflowTotal,
    netInflowRecent,
    priceStage: stage,
    reasons, // 添加到类型定义中
    metrics: {
      // 添加到类型定义中
      priceTrend,
      priceTrendDirection,
      priceTrendStrength,
      priceTrendPValue: priceRegression.pValue,
      inflowTrend,
      inflowTrendDirection,
      inflowTrendStrength,
      inflowTrendPValue: inflowRegression.pValue,
      correlation,
      inflowVolumeCorrelation: inflowVolumeCorr,
      priceVolatility,
      recentInflowTrend,
    },
  } as FundingTrendAnalysis
}

/**
 * 按照 Python 代码检测资金流向和价格变动的异常
 */
export function detectAnomalies(klinesData: Kline[]): AnomalyDetection {
  if (!klinesData || klinesData.length < 5) {
    return {
      hasAnomalies: false,
      anomalies: [],
    }
  }

  const anomalies: Anomaly[] = []

  // 按时间排序 (假设已排序)
  const sortedData = [...klinesData]

  // 计算成交量和价格变化的均值和标准差
  const volumes = sortedData.map((k) => k.quoteVolume)
  const priceChanges = sortedData.map(
    (k, i) => Math.abs(k.close - k.open) / k.open
  )

  const volMean = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length
  const volStd = standardDeviation(volumes)
  const priceChangeMean =
    priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length
  const priceChangeStd = standardDeviation(priceChanges)

  // 检测异常
  for (let i = 0; i < sortedData.length; i++) {
    const k = sortedData[i]
    const priceChange = priceChanges[i]

    // 成交量异常高但价格变化不大
    if (
      k.quoteVolume > volMean + 2 * volStd &&
      priceChange < priceChangeMean + 0.5 * priceChangeStd
    ) {
      const anomaly: Partial<Anomaly> = {
        time: k.openTime,
        volume: {
          value: k.quoteVolume,
          zScore: (k.quoteVolume - volMean) / (volStd || 1),
          direction: "high",
        },
        type: "high_volume_low_price_change",
      }
      anomalies.push(anomaly as Anomaly)
    }

    // 价格变化异常大但成交量不高
    if (
      priceChange > priceChangeMean + 2 * priceChangeStd &&
      k.quoteVolume < volMean + 0.5 * volStd
    ) {
      const anomaly: Partial<Anomaly> = {
        time: k.openTime,
        priceVolumeMismatch: {
          priceChange: priceChange * 100, // 转为百分比
          volumeZScore: (k.quoteVolume - volMean) / (volStd || 1),
        },
        type: "high_price_change_low_volume",
      }
      anomalies.push(anomaly as Anomaly)
    }

    // 资金净流入异常大
    if (k.netInflow > 0 && k.netInflow > 0.7 * k.quoteVolume) {
      const anomaly: Partial<Anomaly> = {
        time: k.openTime,
        netInflow: {
          value: k.netInflow,
          zScore: 2.0, // 简化计算
          direction: "high",
        },
        type: "extreme_net_inflow",
        inflowRatio: k.quoteVolume > 0 ? k.netInflow / k.quoteVolume : 0,
      }
      anomalies.push(anomaly as Anomaly)
    }

    // 资金净流出异常大
    if (k.netInflow < 0 && Math.abs(k.netInflow) > 0.7 * k.quoteVolume) {
      const anomaly: Partial<Anomaly> = {
        time: k.openTime,
        netInflow: {
          value: k.netInflow,
          zScore: -2.0, // 简化计算
          direction: "low",
        },
        type: "extreme_net_outflow",
        outflowRatio:
          k.quoteVolume > 0 ? Math.abs(k.netInflow) / k.quoteVolume : 0,
      }
      anomalies.push(anomaly as Anomaly)
    }
  }

  return {
    hasAnomalies: anomalies.length > 0,
    anomalies,
  }
}

/**
 * 按照 Python 代码分析资金压力
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

  // 按时间排序 (假设已排序)
  const sortedData = [...klinesData]

  // 提取最近的资金流向数据 (最后10个周期)
  const recentInflows = sortedData.slice(-10).map((k) => k.netInflow)
  const recentVolumes = sortedData.slice(-10).map((k) => k.quoteVolume)

  // 计算资金流向占成交量的比例
  const inflowRatios: number[] = []
  for (let i = 0; i < recentInflows.length; i++) {
    const ratio = recentVolumes[i] > 0 ? recentInflows[i] / recentVolumes[i] : 0
    inflowRatios.push(ratio)
  }
  const avgInflowRatio =
    inflowRatios.reduce((sum, ratio) => sum + ratio, 0) / inflowRatios.length

  // 结合订单簿数据
  const volumeImbalance = orderbookStats.imbalance
  const valueImbalance =
    orderbookStats.bidPressure /
      (orderbookStats.bidPressure + orderbookStats.askPressure) -
    0.5

  // 理想情况下计算近区域不平衡，但我们简化为使用整体不平衡
  const nearVolumeImbalance = volumeImbalance

  // 计算综合压力指标
  const pressureScore =
    avgInflowRatio * 0.4 +
    volumeImbalance * 0.2 +
    valueImbalance * 0.2 +
    nearVolumeImbalance * 0.2

  // 判断压力方向和强度
  let pressure = "balanced"
  let direction: FundingPressureAnalysis["pressureDirection"] = "neutral"
  let strength = 0

  if (pressureScore > 0.1) {
    pressure = "buying"
    direction = "upward"
    strength = Math.min(pressureScore * 5, 1.0)

    if (strength > 0.7) {
      direction = "upward_strong"
    }
  } else if (pressureScore < -0.1) {
    pressure = "selling"
    direction = "downward"
    strength = Math.min(Math.abs(pressureScore) * 5, 1.0)

    if (strength > 0.7) {
      direction = "downward_strong"
    }
  } else {
    pressure = "balanced"
    direction = "neutral"
    strength = Math.abs(pressureScore) * 5
  }

  // 检查反转信号
  const recentPriceChanges = sortedData.slice(-5).map((k) => k.priceChangePct)
  const avgPriceChange =
    recentPriceChanges.reduce((sum, change) => sum + change, 0) /
    recentPriceChanges.length

  // 价格下跌但买压力大，可能向上反转
  if (avgPriceChange < -1.0 && volumeImbalance > 0.1) {
    direction = "potential_reversal_up"
  }
  // 价格上涨但卖压力大，可能向下反转
  else if (avgPriceChange > 1.0 && volumeImbalance < -0.1) {
    direction = "potential_reversal_down"
  }

  return {
    pressureDirection: direction,
    confidence: strength,
    imbalance: volumeImbalance,
    bidAskRatio: orderbookStats.pressureRatio,
    metrics: {
      avgInflowRatio,
      volumeImbalance,
      valueImbalance,
      nearVolumeImbalance,
      pressureScore,
    },
  } as FundingPressureAnalysis
}
