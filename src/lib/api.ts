import {
  Interval,
  Kline,
  OrderBookStats,
  AnalysisResult,
} from "@/types/funding-flow"

const BINANCE_API_URL = "https://api.binance.com"
const BINANCE_FUTURES_API_URL = "https://fapi.binance.com"

// Random delay to simulate real network conditions and avoid rate limits
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Random delay between 100ms and 500ms
const randomDelay = () => delay(Math.floor(Math.random() * 400) + 100)

/**
 * Make an API request with retry logic
 */
async function makeApiRequest<T>(
  url: string,
  params?: Record<string, string | number>,
  options?: RequestInit
): Promise<T> {
  const queryParams = params
    ? "?" +
      new URLSearchParams(
        Object.entries(params).map(([key, value]) => [key, String(value)])
      ).toString()
    : ""

  const fullUrl = `${url}${queryParams}`

  // Add a small random delay to avoid rate limiting
  await randomDelay()

  let retries = 5
  let lastError: Error | null = null

  while (retries > 0) {
    try {
      const response = await fetch(fullUrl, options)

      if (!response.ok) {
        throw new Error(
          `API request failed with status ${
            response.status
          }: ${await response.text()}`
        )
      }

      return (await response.json()) as T
    } catch (error) {
      lastError = error as Error
      retries--

      // Exponential backoff
      if (retries > 0) {
        const backoffTime = Math.pow(2, 5 - retries) * 100 + Math.random() * 100
        await delay(backoffTime)
      }
    }
  }

  throw lastError || new Error("API request failed after multiple retries")
}

/**
 * Get klines (candlestick) data from Binance
 */
export async function getKlinesData(
  symbol: string,
  interval: Interval = "5m",
  limit: number = 50,
  isFutures: boolean = false
): Promise<Kline[]> {
  const baseUrl = isFutures ? BINANCE_FUTURES_API_URL : BINANCE_API_URL
  const endpoint = isFutures ? "/fapi/v1/klines" : "/api/v3/klines"

  try {
    const klines = await makeApiRequest<any[][]>(`${baseUrl}${endpoint}`, {
      symbol,
      interval,
      limit: limit + 1, // +1 to handle the incomplete last candle
    })

    // Remove the last incomplete candle
    const completedKlines = klines.slice(0, -1)

    return completedKlines.map((kline) => {
      const openTime = new Date(kline[0]).toISOString()
      const closeTime = new Date(kline[6]).toISOString()

      const openPrice = parseFloat(kline[1])
      const highPrice = parseFloat(kline[2])
      const lowPrice = parseFloat(kline[3])
      const closePrice = parseFloat(kline[4])
      const volume = parseFloat(kline[5])
      const quoteVolume = parseFloat(kline[7])

      // Simple estimation of buy/sell volume based on price action
      let buyVolume: number
      let sellVolume: number

      if (closePrice >= openPrice) {
        // Bullish candle, assume 60% is buying
        buyVolume = volume * 0.6
        sellVolume = volume * 0.4
      } else {
        // Bearish candle, assume 40% is buying
        buyVolume = volume * 0.4
        sellVolume = volume * 0.6
      }

      // Calculate net inflow (approximation)
      const netInflow = (buyVolume - sellVolume) * closePrice

      // Calculate price change percentage
      const priceChangePct = ((closePrice - openPrice) / openPrice) * 100

      return {
        openTime,
        closeTime,
        open: openPrice,
        high: highPrice,
        low: lowPrice,
        close: closePrice,
        volume,
        quoteVolume,
        buyVolume,
        sellVolume,
        netInflow,
        priceChangePct,
      }
    })
  } catch (error) {
    console.error(`Error fetching klines for ${symbol}:`, error)
    throw new Error(
      `Failed to fetch ${symbol} ${interval} klines data: ${
        (error as Error).message
      }`
    )
  }
}

/**
 * Get order book data from Binance
 */
export async function getOrderBookStats(
  symbol: string,
  isFutures: boolean = false,
  limit: number = 1000
): Promise<OrderBookStats> {
  const baseUrl = isFutures ? BINANCE_FUTURES_API_URL : BINANCE_API_URL
  const endpoint = isFutures ? "/fapi/v1/depth" : "/api/v3/depth"

  try {
    const orderbook = await makeApiRequest<{
      bids: string[][]
      asks: string[][]
    }>(`${baseUrl}${endpoint}`, {
      symbol,
      limit,
    })

    // Process orderbook data
    const bids = orderbook.bids.map(([price, qty]) => [
      parseFloat(price),
      parseFloat(qty),
    ])
    const asks = orderbook.asks.map(([price, qty]) => [
      parseFloat(price),
      parseFloat(qty),
    ])

    // Calculate total quantities
    const totalBidQty = bids.reduce((sum, [, qty]) => sum + qty, 0)
    const totalAskQty = asks.reduce((sum, [, qty]) => sum + qty, 0)

    // Calculate imbalance
    const imbalance =
      (totalBidQty - totalAskQty) / (totalBidQty + totalAskQty) || 0

    // Calculate buying and selling pressure
    const bidPressure = bids.reduce((sum, [price, qty]) => sum + price * qty, 0)
    const askPressure = asks.reduce((sum, [price, qty]) => sum + price * qty, 0)

    // Calculate pressure ratio
    const pressureRatio =
      askPressure > 0 ? bidPressure / askPressure : Number.POSITIVE_INFINITY

    // Get price ranges
    const bidPrices = bids.map(([price]) => price)
    const askPrices = asks.map(([price]) => price)

    const highestBid = Math.max(...bidPrices)
    const lowestAsk = Math.min(...askPrices)
    const spread = lowestAsk - highestBid
    const spreadPct = (spread / highestBid) * 100

    return {
      totalBidQty,
      totalAskQty,
      imbalance,
      bidPressure,
      askPressure,
      pressureRatio,
      priceRange: {
        highestBid,
        lowestAsk,
        spread,
        spreadPct,
      },
    }
  } catch (error) {
    console.error(`Error fetching orderbook for ${symbol}:`, error)
    throw new Error(
      `Failed to fetch ${symbol} orderbook data: ${(error as Error).message}`
    )
  }
}

/**
 * Get AI analysis from DeepSeek API
 */
export async function getAIAnalysis(
  analysisData: AnalysisResult,
  apiKey: string,
  apiUrl: string,
  aiModel: string = "deepseek/deepseek-chat-v3-0324:free"
): Promise<string> {
  if (!apiKey) {
    throw new Error("API密钥是进行AI分析所必需的")
  }

  if (!apiUrl) {
    throw new Error("API URL是进行AI分析所必需的")
  }

  if (!aiModel) {
    throw new Error("AI模型名称是进行AI分析所必需的")
  }

  // Configure interval specific analysis parameters
  const intervalSettings: Record<
    Interval,
    {
      forecastPeriod: string
      tradeHorizon: string
      stopLossRange: string
      analysisDepth: string
      positionSizing: string
    }
  > = {
    "5m": {
      forecastPeriod: "未来 2-6 小时",
      tradeHorizon: "短线（数小时内）",
      stopLossRange: "较小（0.5%-1.5%）",
      analysisDepth: "微观市场结构和短期波动",
      positionSizing: "建议小仓位（5%-15%）",
    },
    "15m": {
      forecastPeriod: "未来 6-12 小时",
      tradeHorizon: "短线至中短线（半天至 1 天）",
      stopLossRange: "中小（1%-2%）",
      analysisDepth: "短期趋势和支撑阻力位",
      positionSizing: "建议小至中等仓位（10%-20%）",
    },
    "30m": {
      forecastPeriod: "未来 12-24 小时",
      tradeHorizon: "中短线（1-2 天）",
      stopLossRange: "中等（1.5%-3%）",
      analysisDepth: "日内趋势和关键价格区间",
      positionSizing: "建议中等仓位（15%-25%）",
    },
    "1h": {
      forecastPeriod: "未来 1-3 天",
      tradeHorizon: "中线（2-5 天）",
      stopLossRange: "中等（2%-4%）",
      analysisDepth: "中期趋势和市场结构转换",
      positionSizing: "建议中等仓位（20%-30%）",
    },
    "4h": {
      forecastPeriod: "未来 3-7 天",
      tradeHorizon: "中长线（1-2 周）",
      stopLossRange: "中大（3%-6%）",
      analysisDepth: "中长期趋势和市场周期",
      positionSizing: "建议中至大仓位（25%-40%）",
    },
    "1d": {
      forecastPeriod: "未来 1-4 周",
      tradeHorizon: "长线（2 周 - 1 个月）",
      stopLossRange: "较大（5%-10%）",
      analysisDepth: "长期趋势、市场周期和宏观因素影响",
      positionSizing: "建议大仓位或分批建仓（30%-50%）",
    },
  }

  const interval = analysisData.metadata.interval
  const settings = intervalSettings[interval]

  // Create the prompt for DeepSeek
  const prompt = `## Binance资金流向专业分析任务 (K线周期: ${interval})

我已收集了Binance现货和期货市场过去${
    analysisData.metadata.klinesCount
  }根 ${interval} K 线的资金流向数据，包括：
- 各交易对的资金流向趋势分析
- 价格所处阶段预测（顶部、底部、上涨中、下跌中、整理中）
- 订单簿数据（买卖盘不平衡度）
- 资金压力分析
- 异常交易检测

请从专业交易员和机构投资者角度，针对 ${interval} 周期特点进行深度分析：

1. **主力资金行为解读**：
   - 通过资金流向趋势变化，识别主力资金的建仓、出货行为
   - 结合订单簿数据，分析主力资金的意图（吸筹、出货、洗盘等）
   - 特别关注资金流向与价格变化不匹配的异常情况
   - 重点分析 ${settings.analysisDepth}

2. **价格阶段判断**：
   - 根据资金流向趋势和价格关系，判断各交易对处于什么阶段（顶部、底部、上涨中、下跌中、整理中）
   - 提供判断的置信度和依据
   - 对比不同交易对的阶段差异，分析可能的轮动关系
   - 结合 ${interval} 周期特有的市场结构特征

3. **趋势预判**：
   - 基于资金流向和资金压力分析，预判 ${settings.forecastPeriod} 可能的价格走势
   - 识别可能的反转信号或趋势延续信号
   - 关注异常交易数据可能暗示的行情变化
   - 给出具体的价格目标区间和时间预期

4. **交易策略建议**：
   - 针对每个交易对，给出具体的交易建议（观望、做多、做空、减仓等）
   - 提供适合 ${settings.tradeHorizon} 的入场点位和止损位
   - 建议止损范围：${settings.stopLossRange}
   - ${settings.positionSizing}
   - 评估风险和回报比

请使用专业术语，保持分析简洁但深入，避免泛泛而谈。数据如下：

${JSON.stringify(analysisData, null, 2)}

回复格式要求：中文，使用 markdown 格式，中英文、数字之间增加空格，重点突出，适当使用表格对比分析。`

  try {
    const response = await makeApiRequest<{
      choices: Array<{ message: { content: string } }>
    }>(
      apiUrl,
      {},
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: aiModel,
          messages: [{ role: "user", content: prompt }],
        }),
      }
    )

    return response.choices[0].message.content
  } catch (error) {
    console.error("AI API error:", error)
    throw new Error(`AI 分析失败: ${(error as Error).message}`)
  }
}
