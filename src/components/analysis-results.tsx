"use client"

import { useState } from "react"
import { format, parseISO } from "date-fns"
import { AnalysisResult, Interval } from "@/types/funding-flow"
import { formatNumber } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface AnalysisResultsProps {
  results: AnalysisResult
}

export function AnalysisResults({ results }: AnalysisResultsProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<string>(
    results.metadata.symbolsAnalyzed[0] || ""
  )
  const [activeTab, setActiveTab] = useState<"data" | "ai">("data")

  const symbolData = selectedSymbol ? results.analysis[selectedSymbol] : null
  const { metadata } = results
  const hasAIAnalysis = !!results.aiAnalysis

  if (!symbolData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">暂无分析数据</p>
        </CardContent>
      </Card>
    )
  }

  const formatTimeInterval = (interval: Interval) => {
    switch (interval) {
      case "5m":
        return "5 分钟"
      case "15m":
        return "15 分钟"
      case "30m":
        return "30 分钟"
      case "1h":
        return "1 小时"
      case "4h":
        return "4 小时"
      case "1d":
        return "1 天"
      default:
        return interval
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>分析结果</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">交易对：</span>
              <Select
                value={selectedSymbol}
                onValueChange={(value) => setSelectedSymbol(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="选择交易对" />
                </SelectTrigger>
                <SelectContent>
                  {metadata.symbolsAnalyzed.map((symbol) => (
                    <SelectItem key={symbol} value={symbol}>
                      {symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <div>
              <span className="font-medium">分析时间：</span>{" "}
              {format(parseISO(metadata.analysisTime), "yyyy-MM-dd HH:mm:ss")}
            </div>
            <div>
              <span className="font-medium">时间间隔：</span>{" "}
              {formatTimeInterval(metadata.interval)}
            </div>
            <div>
              <span className="font-medium">样本数量：</span>{" "}
              {metadata.klinesCount} 根 K 线
            </div>
          </div>

          {/* Tab Navigation */}
          {hasAIAnalysis && (
            <div className="border-b mt-6">
              <div className="flex space-x-4">
                <button
                  onClick={() => setActiveTab("data")}
                  className={`py-2 border-b-2 text-sm font-medium ${
                    activeTab === "data"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                  }`}
                >
                  数据分析
                </button>
                <button
                  onClick={() => setActiveTab("ai")}
                  className={`py-2 border-b-2 text-sm font-medium ${
                    activeTab === "ai"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                  }`}
                >
                  AI 分析
                </button>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {activeTab === "data" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Price Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">价格概览</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <PriceInfoCard
                        title="现货开盘价格"
                        value={formatNumber(
                          symbolData.spot.klinesSummary.currentPrice
                        )}
                        change={symbolData.spot.klinesSummary.priceChange}
                      />
                      <PriceInfoCard
                        title="期货开盘价格"
                        value={formatNumber(
                          symbolData.futures.klinesSummary.currentPrice
                        )}
                        change={symbolData.futures.klinesSummary.priceChange}
                      />
                    </div>
                    <DataItem
                      label="现货与期货差异"
                      value={`${formatNumber(
                        symbolData.comparison.spotVsFuturesPriceDiff
                      )}%`}
                      positive={
                        symbolData.comparison.spotVsFuturesPriceDiff > 0
                      }
                    />
                    <DataItem
                      label="价格阶段（现货）"
                      value={symbolData.spot.fundingTrend.priceStage}
                      highlight
                    />
                    <DataItem
                      label="价格阶段（期货）"
                      value={symbolData.futures.fundingTrend.priceStage}
                      highlight
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Funding Flow */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">资金流向</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FlowInfoCard
                        title="现货流向"
                        trend={symbolData.spot.fundingTrend.trend}
                        value={formatNumber(
                          symbolData.spot.fundingTrend.netInflowTotal
                        )}
                        confidence={symbolData.spot.fundingTrend.confidence}
                      />
                      <FlowInfoCard
                        title="期货流向"
                        trend={symbolData.futures.fundingTrend.trend}
                        value={formatNumber(
                          symbolData.futures.fundingTrend.netInflowTotal
                        )}
                        confidence={symbolData.futures.fundingTrend.confidence}
                      />
                    </div>
                    <DataItem
                      label="近期现货流入"
                      value={formatNumber(
                        symbolData.spot.fundingTrend.netInflowRecent
                      )}
                      positive={
                        symbolData.spot.fundingTrend.netInflowRecent > 0
                      }
                    />
                    <DataItem
                      label="近期期货流入"
                      value={formatNumber(
                        symbolData.futures.fundingTrend.netInflowRecent
                      )}
                      positive={
                        symbolData.futures.fundingTrend.netInflowRecent > 0
                      }
                    />
                    <DataItem
                      label="现货与期货流向差异"
                      value={formatNumber(
                        symbolData.comparison.spotVsFuturesNetInflowDiff
                      )}
                      positive={
                        symbolData.comparison.spotVsFuturesNetInflowDiff > 0
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Order Book Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">订单簿分析</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <PressureInfoCard
                        title="现货压力"
                        direction={
                          symbolData.spot.fundingPressure.pressureDirection
                        }
                        imbalance={symbolData.spot.fundingPressure.imbalance}
                        confidence={symbolData.spot.fundingPressure.confidence}
                      />
                      <PressureInfoCard
                        title="期货压力"
                        direction={
                          symbolData.futures.fundingPressure.pressureDirection
                        }
                        imbalance={symbolData.futures.fundingPressure.imbalance}
                        confidence={
                          symbolData.futures.fundingPressure.confidence
                        }
                      />
                    </div>
                    <DataItem
                      label="现货买卖比率"
                      value={formatNumber(
                        symbolData.spot.fundingPressure.bidAskRatio
                      )}
                      positive={symbolData.spot.fundingPressure.bidAskRatio > 1}
                    />
                    <DataItem
                      label="期货买卖比率"
                      value={formatNumber(
                        symbolData.futures.fundingPressure.bidAskRatio
                      )}
                      positive={
                        symbolData.futures.fundingPressure.bidAskRatio > 1
                      }
                    />
                    <DataItem
                      label="现货订单簿不平衡度"
                      value={`${(
                        symbolData.spot.fundingPressure.imbalance * 100
                      ).toFixed(2)}%`}
                      positive={symbolData.spot.fundingPressure.imbalance > 0}
                    />
                    <DataItem
                      label="期货订单簿不平衡度"
                      value={`${(
                        symbolData.futures.fundingPressure.imbalance * 100
                      ).toFixed(2)}%`}
                      positive={
                        symbolData.futures.fundingPressure.imbalance > 0
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Anomaly Detection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">异常检测</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <AnomalyInfoCard
                        title="现货市场异常"
                        hasAnomalies={symbolData.spot.anomalies.hasAnomalies}
                        anomalies={symbolData.spot.anomalies.anomalies}
                      />
                      <AnomalyInfoCard
                        title="期货市场异常"
                        hasAnomalies={symbolData.futures.anomalies.hasAnomalies}
                        anomalies={symbolData.futures.anomalies.anomalies}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {/* AI Analysis Content */}
              <AIAnalysisContent content={results.aiAnalysis || ""} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function AIAnalysisContent({ content }: { content: string }) {
  // To safely render markdown content, we need to use a simple markdown renderer
  // Since we don't have a markdown library installed, we'll use a basic approach
  // for line breaks and headers
  const formattedContent = content
    .split("\n")
    .map((line) => {
      // Format headers
      if (line.startsWith("# ")) {
        return `<h1 class="text-2xl font-bold mt-6 mb-4">${line.substring(
          2
        )}</h1>`
      } else if (line.startsWith("## ")) {
        return `<h2 class="text-xl font-bold mt-5 mb-3">${line.substring(
          3
        )}</h2>`
      } else if (line.startsWith("### ")) {
        return `<h3 class="text-lg font-bold mt-4 mb-2">${line.substring(
          4
        )}</h3>`
      }

      // Format bold text
      let formattedLine = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")

      // Format italic text
      formattedLine = formattedLine.replace(/\*(.*?)\*/g, "<em>$1</em>")

      // Format inline code
      formattedLine = formattedLine.replace(
        /`(.*?)`/g,
        '<code class="text-sm bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">$1</code>'
      )

      return formattedLine ? `<p class="mb-3">${formattedLine}</p>` : "<br />"
    })
    .join("")

  return (
    <div
      dangerouslySetInnerHTML={{ __html: formattedContent }}
      className="overflow-auto"
    />
  )
}

interface PriceInfoCardProps {
  title: string
  value: string
  change: number
}

function PriceInfoCard({ title, value, change }: PriceInfoCardProps) {
  return (
    <div className="rounded-lg border p-3">
      <h4 className="text-sm font-medium text-muted-foreground mb-1">
        {title}
      </h4>
      <div className="text-xl font-bold">{value}</div>
      <div
        className={`text-xs font-medium mt-1 ${
          change >= 0 ? "text-green-500" : "text-red-500"
        }`}
      >
        {change >= 0 ? "+" : ""}
        {change.toFixed(2)}%
      </div>
    </div>
  )
}

interface FlowInfoCardProps {
  title: string
  trend: string
  value: string
  confidence: number
}

function FlowInfoCard({ title, trend, value, confidence }: FlowInfoCardProps) {
  const getTrendColor = () => {
    switch (trend) {
      case "increasing":
      case "slightly_increasing":
        return "text-green-500"
      case "decreasing":
      case "slightly_decreasing":
        return "text-red-500"
      default:
        return "text-gray-500"
    }
  }

  const getTrendText = () => {
    switch (trend) {
      case "increasing":
        return "明显增加"
      case "slightly_increasing":
        return "轻微增加"
      case "decreasing":
        return "明显减少"
      case "slightly_decreasing":
        return "轻微减少"
      case "neutral":
        return "持平"
      default:
        return "未知"
    }
  }

  return (
    <div className="rounded-lg border p-3">
      <h4 className="text-sm font-medium text-muted-foreground mb-1">
        {title}
      </h4>
      <div className="text-lg font-bold">{value}</div>
      <div className={`text-xs font-medium mt-1 ${getTrendColor()}`}>
        {getTrendText()}
        <span className="text-muted-foreground ml-1">
          ({(confidence * 100).toFixed(0)}%)
        </span>
      </div>
    </div>
  )
}

interface PressureInfoCardProps {
  title: string
  direction: string
  imbalance: number
  confidence: number
}

function PressureInfoCard({
  title,
  direction,
  imbalance,
  confidence,
}: PressureInfoCardProps) {
  const getDirectionColor = () => {
    switch (direction) {
      case "upward_strong":
      case "upward":
      case "potential_reversal_up":
        return "text-green-500"
      case "downward_strong":
      case "downward":
      case "potential_reversal_down":
        return "text-red-500"
      default:
        return "text-gray-500"
    }
  }

  const getDirectionText = () => {
    switch (direction) {
      case "upward_strong":
        return "强烈上行"
      case "upward":
        return "上行"
      case "downward_strong":
        return "强烈下行"
      case "downward":
        return "下行"
      case "potential_reversal_up":
        return "潜在向上反转"
      case "potential_reversal_down":
        return "潜在向下反转"
      case "neutral":
        return "中性"
      default:
        return "未知"
    }
  }

  return (
    <div className="rounded-lg border p-3">
      <h4 className="text-sm font-medium text-muted-foreground mb-1">
        {title}
      </h4>
      <div className={`text-sm font-medium ${getDirectionColor()}`}>
        {getDirectionText()}
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        不平衡度: {(imbalance * 100).toFixed(2)}%
        <span className="text-muted-foreground ml-1">
          ({(confidence * 100).toFixed(0)}%)
        </span>
      </div>
    </div>
  )
}

interface AnomalyInfoCardProps {
  title: string
  hasAnomalies: boolean
  anomalies: any[]
}

function AnomalyInfoCard({
  title,
  hasAnomalies,
  anomalies,
}: AnomalyInfoCardProps) {
  return (
    <div className="rounded-lg border p-3">
      <h4 className="text-sm font-medium text-muted-foreground mb-2">
        {title}
      </h4>
      {!hasAnomalies ? (
        <div className="text-sm text-muted-foreground">未检测到异常</div>
      ) : (
        <div className="space-y-2">
          {anomalies.map((anomaly, index) => (
            <div
              key={index}
              className="text-xs border-l-2 border-yellow-500 pl-2 py-1"
            >
              <div className="font-medium">
                {format(parseISO(anomaly.time), "yyyy-MM-dd HH:mm")}
              </div>
              {anomaly.volume && (
                <div
                  className={
                    anomaly.volume.direction === "high"
                      ? "text-green-500"
                      : "text-red-500"
                  }
                >
                  {anomaly.volume.direction === "high" ? "异常高" : "异常低"}{" "}
                  成交量 (z值: {anomaly.volume.zScore.toFixed(2)})
                </div>
              )}
              {anomaly.netInflow && (
                <div
                  className={
                    anomaly.netInflow.direction === "high"
                      ? "text-green-500"
                      : "text-red-500"
                  }
                >
                  {anomaly.netInflow.direction === "high" ? "异常高" : "异常低"}{" "}
                  净流入 (z值: {anomaly.netInflow.zScore.toFixed(2)})
                </div>
              )}
              {anomaly.priceVolumeMismatch && (
                <div className="text-yellow-500">
                  价格-成交量不匹配:{" "}
                  {anomaly.priceVolumeMismatch.priceChange.toFixed(2)}%
                  价格变化伴随低成交量 (z值:{" "}
                  {anomaly.priceVolumeMismatch.volumeZScore.toFixed(2)})
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface DataItemProps {
  label: string
  value: string | number
  positive?: boolean
  negative?: boolean
  highlight?: boolean
}

function DataItem({
  label,
  value,
  positive,
  negative,
  highlight,
}: DataItemProps) {
  let textColorClass = ""

  if (highlight) {
    textColorClass = "font-semibold text-primary"
  } else if (positive) {
    textColorClass = "text-green-500"
  } else if (negative) {
    textColorClass = "text-red-500"
  }

  return (
    <div className="flex justify-between items-center py-1 text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <span className={textColorClass}>{value}</span>
    </div>
  )
}
