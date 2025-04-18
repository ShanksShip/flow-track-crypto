"use client"

import { useState, useCallback, useEffect } from "react"
import { Interval, AnalysisResult } from "@/types/funding-flow"
import { getKlinesData, getOrderBookStats, getAIAnalysis } from "@/lib/api"
import {
  analyzeFundingFlowTrend,
  detectAnomalies,
  analyzeFundingPressure,
} from "@/lib/analysis"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SymbolPill } from "@/components/symbol-pill"
import { AnalysisResults } from "@/components/analysis-results"

export function FundingFlowAnalyzer() {
  const [symbols, setSymbols] = useState<string[]>(["BTCUSDT", "ETHUSDT"])
  const [newSymbol, setNewSymbol] = useState<string>("")
  const [interval, setInterval] = useState<Interval>("1h")
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [analysisResults, setAnalysisResults] = useState<any | null>(null)
  const [startedAnalysis, setStartedAnalysis] = useState<boolean>(false)
  const [apiKey, setApiKey] = useState<string>("")
  const [apiUrl, setApiUrl] = useState<string>(
    "https://openrouter.ai/api/v1/chat/completions"
  )
  const [aiModel, setAiModel] = useState<string>(
    "deepseek/deepseek-chat-v3-0324:free"
  )
  const [useAI, setUseAI] = useState<boolean>(false)
  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false)

  // Load API key, API URL and model from localStorage on initial load
  useEffect(() => {
    const savedApiKey = localStorage.getItem("aiApiKey")
    const savedApiUrl = localStorage.getItem("aiApiUrl")
    const savedAiModel = localStorage.getItem("aiModel")
    if (savedApiKey) {
      setApiKey(savedApiKey)
    }
    if (savedApiUrl) {
      setApiUrl(savedApiUrl)
    }
    if (savedAiModel) {
      setAiModel(savedAiModel)
    }
  }, [])

  // Save API key, API URL and model to localStorage when changed
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem("aiApiKey", apiKey)
    }
    if (apiUrl) {
      localStorage.setItem("aiApiUrl", apiUrl)
    }
    if (aiModel) {
      localStorage.setItem("aiModel", aiModel)
    }
  }, [apiKey, apiUrl, aiModel])

  // Add a new symbol
  const addSymbol = useCallback(() => {
    if (newSymbol && newSymbol.trim()) {
      const formattedSymbol = newSymbol.trim().toUpperCase()
      if (!symbols.includes(formattedSymbol)) {
        setSymbols((prev) => [...prev, formattedSymbol])
      }
      setNewSymbol("")
    }
  }, [newSymbol, symbols])

  // Remove a symbol
  const removeSymbol = useCallback((symbolToRemove: string) => {
    setSymbols((prev) => prev.filter((symbol) => symbol !== symbolToRemove))
  }, [])

  // Handle Enter key press in the input field
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        addSymbol()
      }
    },
    [addSymbol]
  )

  // Start the analysis
  const startAnalysis = useCallback(async () => {
    setErrorMessage(null)

    if (symbols.length === 0) {
      setErrorMessage("请至少添加一个交易对")
      return
    }

    setIsAnalyzing(true)
    setStartedAnalysis(true)

    try {
      const results = await runAnalysis(symbols, interval)

      // If AI analysis is requested
      if (useAI && apiKey) {
        setIsLoadingAI(true)
        try {
          const aiAnalysisResult = await getAIAnalysis(
            results,
            apiKey,
            apiUrl,
            aiModel
          )
          results.aiAnalysis = aiAnalysisResult
        } catch (aiError) {
          console.error("AI analysis error:", aiError)
          setErrorMessage(`AI 分析错误: ${(aiError as Error).message}`)
        } finally {
          setIsLoadingAI(false)
        }
      }

      setAnalysisResults(results)
    } catch (error) {
      setErrorMessage(`分析错误: ${(error as Error).message}`)
      console.error("Analysis error:", error)
    } finally {
      setIsAnalyzing(false)
    }
  }, [symbols, interval, useAI, apiKey, apiUrl, aiModel])

  // The main analysis function
  const runAnalysis = async (
    symbols: string[],
    interval: Interval
  ): Promise<AnalysisResult> => {
    const analysisData: Record<string, any> = {}

    // Process each symbol
    for (const symbol of symbols) {
      // Fetch spot and futures data
      const spotKlines = await getKlinesData(symbol, interval, 50, false)
      const futuresKlines = await getKlinesData(symbol, interval, 50, true)

      // Fetch orderbook data
      const spotOrderBook = await getOrderBookStats(symbol, false)
      const futuresOrderBook = await getOrderBookStats(symbol, true)

      // Analyze funding flow trends
      const spotTrendAnalysis = analyzeFundingFlowTrend(spotKlines)
      const futuresTrendAnalysis = analyzeFundingFlowTrend(futuresKlines)

      // Detect anomalies
      const spotAnomalies = detectAnomalies(spotKlines)
      const futuresAnomalies = detectAnomalies(futuresKlines)

      // Analyze funding pressure
      const spotPressureAnalysis = analyzeFundingPressure(
        spotKlines,
        spotOrderBook
      )
      const futuresPressureAnalysis = analyzeFundingPressure(
        futuresKlines,
        futuresOrderBook
      )

      // Compile results for this symbol
      analysisData[symbol] = {
        spot: {
          klinesSummary: {
            firstTime: spotKlines[0]?.openTime || null,
            lastTime: spotKlines[spotKlines.length - 1]?.closeTime || null,
            priceChange:
              spotKlines.length > 0
                ? ((spotKlines[spotKlines.length - 1].close -
                    spotKlines[0].open) /
                    spotKlines[0].open) *
                  100
                : 0,
            currentPrice: spotKlines[spotKlines.length - 1]?.open || 0,
            totalVolume: spotKlines.reduce((sum, k) => sum + k.volume, 0),
            totalQuoteVolume: spotKlines.reduce(
              (sum, k) => sum + k.quoteVolume,
              0
            ),
          },
          fundingTrend: spotTrendAnalysis,
          anomalies: spotAnomalies,
          orderBook: spotOrderBook,
          fundingPressure: spotPressureAnalysis,
        },
        futures: {
          klinesSummary: {
            firstTime: futuresKlines[0]?.openTime || null,
            lastTime:
              futuresKlines[futuresKlines.length - 1]?.closeTime || null,
            priceChange:
              futuresKlines.length > 0
                ? ((futuresKlines[futuresKlines.length - 1].close -
                    futuresKlines[0].open) /
                    futuresKlines[0].open) *
                  100
                : 0,
            currentPrice: futuresKlines[futuresKlines.length - 1]?.open || 0,
            totalVolume: futuresKlines.reduce((sum, k) => sum + k.volume, 0),
            totalQuoteVolume: futuresKlines.reduce(
              (sum, k) => sum + k.quoteVolume,
              0
            ),
          },
          fundingTrend: futuresTrendAnalysis,
          anomalies: futuresAnomalies,
          orderBook: futuresOrderBook,
          fundingPressure: futuresPressureAnalysis,
        },
        comparison: {
          spotVsFuturesPriceDiff:
            spotKlines.length > 0 && futuresKlines.length > 0
              ? ((spotKlines[spotKlines.length - 1].close -
                  futuresKlines[futuresKlines.length - 1].close) /
                  spotKlines[spotKlines.length - 1].close) *
                100
              : 0,
          spotVsFuturesVolumeRatio:
            spotKlines.reduce((sum, k) => sum + k.volume, 0) /
            (futuresKlines.reduce((sum, k) => sum + k.volume, 0) || 1),
          spotVsFuturesNetInflowDiff:
            spotTrendAnalysis.netInflowTotal -
            futuresTrendAnalysis.netInflowTotal,
        },
      }
    }

    // Metadata about the analysis
    const metadata = {
      analysisTime: new Date().toISOString(),
      interval,
      symbolsAnalyzed: symbols,
      klinesCount: 50,
      dataSourceName: "Binance",
    }

    return {
      metadata,
      analysis: analysisData,
      aiAnalysis: undefined as string | undefined,
    }
  }

  // Render
  return (
    <div className="container mx-auto">
      <div className="flex flex-col">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            币安资金流向分析
          </h1>
          <p className="text-muted-foreground mt-2">
            分析资金流向趋势，检测异常，发现市场洞察
          </p>
        </div>

        {/* Analysis settings */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>分析设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Interval selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">时间间隔</label>
              <Select
                value={interval}
                onValueChange={(value) => setInterval(value as Interval)}
                disabled={isAnalyzing}
              >
                <SelectTrigger className="w-full md:w-52">
                  <SelectValue placeholder="选择间隔" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5m">5 分钟</SelectItem>
                  <SelectItem value="15m">15 分钟</SelectItem>
                  <SelectItem value="30m">30 分钟</SelectItem>
                  <SelectItem value="1h">1 小时</SelectItem>
                  <SelectItem value="4h">4 小时</SelectItem>
                  <SelectItem value="1d">1 天</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Trading pair input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">添加交易对</label>
              <div className="flex gap-2">
                <Input
                  placeholder="输入交易对(例如: BTCUSDT)"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isAnalyzing}
                />
                <Button
                  onClick={addSymbol}
                  disabled={isAnalyzing || !newSymbol}
                >
                  添加
                </Button>
              </div>
            </div>

            {/* Selected trading pairs */}
            <div className="space-y-2">
              <label className="text-sm font-medium">已选交易对</label>
              <div className="flex flex-wrap gap-2">
                {symbols.length === 0 ? (
                  <p className="text-sm text-muted-foreground">未选择交易对</p>
                ) : (
                  symbols.map((symbol) => (
                    <SymbolPill
                      key={symbol}
                      symbol={symbol}
                      onRemove={() => removeSymbol(symbol)}
                      disabled={isAnalyzing}
                    />
                  ))
                )}
              </div>
            </div>

            {/* AI Analysis options */}
            <div className="space-y-2 border-t pt-4 mt-4">
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={useAI}
                  onChange={(e) => setUseAI(e.target.checked)}
                  disabled={isAnalyzing}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium">
                  启用 AI 分析（需要 API 密钥）
                </span>
              </label>

              {useAI && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">API 密钥</label>
                  <Input
                    type="password"
                    placeholder="输入你的 API 密钥"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    disabled={isAnalyzing}
                  />

                  <label className="text-sm font-medium">API 接口地址</label>
                  <Input
                    type="text"
                    placeholder="AI服务的API URL"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    disabled={isAnalyzing}
                  />

                  <label className="text-sm font-medium">AI 模型名称</label>
                  <Input
                    type="text"
                    placeholder="例如：deepseek/deepseek-chat-v3-0324:free"
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    disabled={isAnalyzing}
                  />

                  <p className="text-xs text-muted-foreground">
                    你的 API
                    密钥、接口地址和模型名称将保存在本地浏览器中，不会发送到我们的服务器。
                    默认使用 DeepSeek, 也可以设置为其他支持类似格式的 AI 服务。
                  </p>
                </div>
              )}
            </div>

            {/* Start analysis button */}
            <div className="pt-2">
              <Button
                onClick={startAnalysis}
                disabled={
                  isAnalyzing ||
                  isLoadingAI ||
                  symbols.length === 0 ||
                  (useAI && (!apiKey || !apiUrl || !aiModel))
                }
                className="w-full md:w-auto"
              >
                {isAnalyzing
                  ? "分析中..."
                  : isLoadingAI
                  ? "生成 AI 分析中..."
                  : "开始分析"}
              </Button>
            </div>

            {/* Error message */}
            {errorMessage && (
              <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
                {errorMessage}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Display the welcome screen or analysis results */}
        {!startedAnalysis ? (
          <WelcomeScreen />
        ) : (
          analysisResults && <AnalysisResults results={analysisResults} />
        )}
      </div>
    </div>
  )
}

function WelcomeScreen() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>欢迎使用币安资金流向分析工具</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>
          本工具帮助您分析币安交易所的资金流向，识别市场趋势，检测异常，从而做出更明智的交易决策。
        </p>

        <div className="space-y-2">
          <h3 className="text-lg font-medium">主要功能</h3>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>资金流向趋势分析：追踪现货和期货市场的资金流动</li>
            <li>市场阶段检测：识别市场是否处于积累、分配或趋势阶段</li>
            <li>异常检测：发现可能预示价格变动的不寻常交易活动</li>
            <li>订单簿分析：分析买卖压力</li>
            <li>智能趋势预测：获取对未来价格方向的见解</li>
            <li>AI驱动分析：可选的使用 AI 进行深度市场分析</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-medium">使用方法</h3>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>添加您想要分析的交易对（例如：BTCUSDT、ETHUSDT）</li>
            <li>选择分析的时间间隔（5 分钟、15 分钟、30 分钟等）</li>
            <li>可选择启用 AI 分析（需要 API 密钥）</li>
            <li>点击"开始分析"并等待结果</li>
            <li>探索每个交易对的详细洞察</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}
