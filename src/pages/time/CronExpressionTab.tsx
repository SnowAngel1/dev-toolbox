import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { useToast } from "@/components/ui/toast"
import { Tooltip } from "@/components/ui/tooltip"
import { copyToClipboard } from "@/lib/clipboard"
import { Button } from "@/components/ui/button"
import {
  Copy,
  Trash2,
  ArrowUpToLine,
} from "lucide-react"
import {
  type CronConfig,
  type CronMode,
  getDefaultConfig,
  parseCronExpression,
  getNextExecutions,
  describeCron,
  buildCronExpression,
  formatDate,
  relativeTime,
  COMMON_EXPRESSIONS,
} from "@/lib/cronUtils"

const MODE_LABELS: { mode: CronMode; label: string }[] = [
  { mode: "everyMinute", label: "每分钟" },
  { mode: "everyHour", label: "每小时" },
  { mode: "everyDay", label: "每天" },
  { mode: "everyWeek", label: "每周" },
  { mode: "everyMonth", label: "每月" },
  { mode: "custom", label: "自定义" },
]

const WEEK_DAYS = [
  { value: 1, label: "一" },
  { value: 2, label: "二" },
  { value: 3, label: "三" },
  { value: 4, label: "四" },
  { value: 5, label: "五" },
  { value: 6, label: "六" },
  { value: 0, label: "日" },
]

export function CronExpressionTab() {
  const { toast } = useToast()
  const [expression, setExpression] = useState("0 9 * * *")
  const [description, setDescription] = useState("")
  const [error, setError] = useState("")
  const [nextExecs, setNextExecs] = useState<Date[]>([])
  const [execCount, setExecCount] = useState<5 | 10 | 20>(5)
  const [config, setConfig] = useState<CronConfig>(getDefaultConfig)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 防抖解析表达式
  const parseExpr = useCallback((expr: string) => {
    if (!expr.trim()) {
      setDescription("")
      setError("")
      setNextExecs([])
      return
    }
    const result = parseCronExpression(expr)
    if (result.valid) {
      setError("")
      setDescription(describeCron(expr))
      setNextExecs(getNextExecutions(expr, execCount))
    } else {
      setError(result.error || "无效的 Cron 表达式")
      setDescription("")
      setNextExecs([])
    }
  }, [execCount])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => parseExpr(expression), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [expression, parseExpr])

  // execCount 变化时刷新执行时间
  useEffect(() => {
    if (expression.trim() && parseCronExpression(expression).valid) {
      setNextExecs(getNextExecutions(expression, execCount))
    }
  }, [execCount, expression])

  // 可视化生成器生成的表达式
  const generatedExpr = useMemo(() => buildCronExpression(config), [config])

  const handleApplyGenerated = useCallback(() => {
    setExpression(generatedExpr)
  }, [generatedExpr])

  const handleCopy = useCallback(() => {
    if (!expression.trim()) return
    copyToClipboard(expression).then(() => {
      toast("已复制到剪贴板", "success")
    })
  }, [expression, toast])

  const handleClear = useCallback(() => {
    setExpression("")
    setDescription("")
    setError("")
    setNextExecs([])
  }, [])

  const handleUseCommon = useCallback((expr: string) => {
    setExpression(expr)
  }, [])

  const updateConfig = useCallback((partial: Partial<CronConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }))
  }, [])

  const updateCustomField = useCallback((index: number, value: string) => {
    setConfig((prev) => {
      const fields = [...prev.customFields]
      fields[index] = value
      return { ...prev, customFields: fields }
    })
  }, [])

  const toggleWeekDay = useCallback((day: number) => {
    setConfig((prev) => {
      const days = prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day]
      return { ...prev, daysOfWeek: days }
    })
  }, [])

  return (
    <div className="h-full overflow-auto p-6 pt-4">
      <div className="max-w-4xl mx-auto space-y-4">

        {/* ① 表达式输入区 */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-medium text-foreground">Cron 表达式</h3>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="输入 Cron 表达式，如 0 9 * * *"
              className="flex-1 h-10 px-3 rounded-md border border-border bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              onKeyDown={(e) => { if (e.key === "Enter") parseExpr(expression) }}
            />
            <Tooltip content="复制">
              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
              </Button>
            </Tooltip>
            <Tooltip content="清空">
              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={handleClear}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </Tooltip>
          </div>
          {/* 解析结果 */}
          {description && (
            <div className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5">
              <span className="shrink-0">✅</span>
              <span>{description}</span>
            </div>
          )}
          {error && (
            <div className="mt-2 text-sm text-red-500 flex items-center gap-1.5">
              <span className="shrink-0">❌</span>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* ② 可视化生成器 */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">可视化生成</h3>
          {/* 模式切换 */}
          <div className="flex flex-wrap gap-1 mb-4">
            {MODE_LABELS.map(({ mode, label }) => (
              <button
                key={mode}
                onClick={() => updateConfig({ mode })}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  config.mode === mode
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 参数区域 */}
          <div className="space-y-3">
            {config.mode === "everyMinute" && (
              <p className="text-xs text-muted-foreground">每分钟执行一次，无需额外参数</p>
            )}

            {config.mode === "everyHour" && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">每小时第</span>
                <select
                  value={config.minute}
                  onChange={(e) => updateConfig({ minute: Number(e.target.value) })}
                  className="h-8 px-2 rounded-md border border-border bg-background text-sm"
                >
                  {Array.from({ length: 60 }, (_, i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
                <span className="text-muted-foreground">分钟执行</span>
              </div>
            )}

            {config.mode === "everyDay" && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">每天</span>
                <select
                  value={config.hour}
                  onChange={(e) => updateConfig({ hour: Number(e.target.value) })}
                  className="h-8 px-2 rounded-md border border-border bg-background text-sm"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, "0")}</option>
                  ))}
                </select>
                <span className="text-muted-foreground">:</span>
                <select
                  value={config.minute}
                  onChange={(e) => updateConfig({ minute: Number(e.target.value) })}
                  className="h-8 px-2 rounded-md border border-border bg-background text-sm"
                >
                  {Array.from({ length: 60 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, "0")}</option>
                  ))}
                </select>
                <span className="text-muted-foreground">执行</span>
              </div>
            )}

            {config.mode === "everyWeek" && (
              <>
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <span className="text-muted-foreground shrink-0">星期</span>
                  {WEEK_DAYS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => toggleWeekDay(value)}
                      className={`w-8 h-8 rounded-md text-xs font-medium transition-all ${
                        config.daysOfWeek.includes(value)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">时间</span>
                  <select
                    value={config.hour}
                    onChange={(e) => updateConfig({ hour: Number(e.target.value) })}
                    className="h-8 px-2 rounded-md border border-border bg-background text-sm"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, "0")}</option>
                    ))}
                  </select>
                  <span className="text-muted-foreground">:</span>
                  <select
                    value={config.minute}
                    onChange={(e) => updateConfig({ minute: Number(e.target.value) })}
                    className="h-8 px-2 rounded-md border border-border bg-background text-sm"
                  >
                    {Array.from({ length: 60 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, "0")}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {config.mode === "everyMonth" && (
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="text-muted-foreground">每月第</span>
                <select
                  value={config.dayOfMonth}
                  onChange={(e) => updateConfig({ dayOfMonth: Number(e.target.value) })}
                  className="h-8 px-2 rounded-md border border-border bg-background text-sm"
                >
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
                <span className="text-muted-foreground">天</span>
                <select
                  value={config.hour}
                  onChange={(e) => updateConfig({ hour: Number(e.target.value) })}
                  className="h-8 px-2 rounded-md border border-border bg-background text-sm"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, "0")}</option>
                  ))}
                </select>
                <span className="text-muted-foreground">:</span>
                <select
                  value={config.minute}
                  onChange={(e) => updateConfig({ minute: Number(e.target.value) })}
                  className="h-8 px-2 rounded-md border border-border bg-background text-sm"
                >
                  {Array.from({ length: 60 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, "0")}</option>
                  ))}
                </select>
              </div>
            )}

            {config.mode === "custom" && (
              <div className="flex items-center gap-2 text-sm flex-wrap">
                {["分", "时", "日", "月", "周"].map((label, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <input
                      type="text"
                      value={config.customFields[idx]}
                      onChange={(e) => updateCustomField(idx, e.target.value)}
                      className="w-16 h-8 px-2 rounded-md border border-border bg-background text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 生成结果 */}
          <div className="mt-4 flex items-center gap-3 pt-3 border-t border-border/50">
            <span className="text-xs text-muted-foreground">生成结果：</span>
            <code className="px-2 py-1 rounded bg-muted font-mono text-sm">{generatedExpr}</code>
            <Tooltip content="应用到输入框">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleApplyGenerated}>
                <ArrowUpToLine className="h-3.5 w-3.5" />
              </Button>
            </Tooltip>
          </div>
        </div>

        {/* ③ 未来执行时间 */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-foreground">未来执行时间</h3>
            <div className="flex items-center gap-1">
              {([5, 10, 20] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => setExecCount(n)}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                    execCount === n
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {n}次
                </button>
              ))}
            </div>
          </div>
          {nextExecs.length > 0 ? (
            <div className="space-y-1.5 max-h-80 overflow-auto">
              {nextExecs.map((date, i) => (
                <div key={i} className="flex items-center gap-3 text-sm font-mono">
                  <span className="text-muted-foreground/60 w-6 text-right shrink-0">{i + 1}.</span>
                  <span className="text-foreground">{formatDate(date)}</span>
                  <span className="text-muted-foreground text-xs">({relativeTime(date)})</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {expression.trim() ? "表达式无效，无法计算执行时间" : "输入表达式后显示未来执行时间"}
            </p>
          )}
        </div>

        {/* ④ 常用表达式速查 */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">常用表达式</h3>
          <div className="grid grid-cols-2 gap-1.5">
            {COMMON_EXPRESSIONS.map((item) => (
              <div
                key={item.expression}
                className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent/50 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-muted-foreground w-24 shrink-0">{item.name}</span>
                  <code className="text-xs font-mono text-foreground">{item.expression}</code>
                </div>
                <button
                  onClick={() => handleUseCommon(item.expression)}
                  className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2"
                >
                  使用
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
