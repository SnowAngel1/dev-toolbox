import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { copyToClipboard } from "@/lib/clipboard"
import {
  Clock,
  ArrowRightLeft,
  Copy,
  RefreshCw,
} from "lucide-react"

type ConvertDirection = "toDate" | "toTimestamp"

const DATE_FORMATS = [
  { label: "YYYY-MM-DD HH:mm:ss", format: formatFullDate },
  { label: "YYYY/MM/DD HH:mm:ss", format: formatSlashDate },
  { label: "YYYY-MM-DD", format: formatDateOnly },
  { label: "HH:mm:ss", format: formatTimeOnly },
  { label: "ISO 8601", format: formatISO },
  { label: "UTC 字符串", format: formatUTC },
]

function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function formatFullDate(d: Date): string {
  return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())} ${padZero(d.getHours())}:${padZero(d.getMinutes())}:${padZero(d.getSeconds())}`
}

function formatSlashDate(d: Date): string {
  return `${d.getFullYear()}/${padZero(d.getMonth() + 1)}/${padZero(d.getDate())} ${padZero(d.getHours())}:${padZero(d.getMinutes())}:${padZero(d.getSeconds())}`
}

function formatDateOnly(d: Date): string {
  return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`
}

function formatTimeOnly(d: Date): string {
  return `${padZero(d.getHours())}:${padZero(d.getMinutes())}:${padZero(d.getSeconds())}`
}

function formatISO(d: Date): string {
  return d.toISOString()
}

function formatUTC(d: Date): string {
  return d.toUTCString()
}

export function TimestampConverter() {
  const [direction, setDirection] = useState<ConvertDirection>("toDate")
  const [input, setInput] = useState("")
  const [results, setResults] = useState<{ label: string; value: string }[]>([])
  const [error, setError] = useState("")
  const [now, setNow] = useState(Date.now())
  const { toast } = useToast()

  // 实时时钟
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const currentDate = new Date(now)

  const handleConvert = useCallback(() => {
    setError("")
    setResults([])

    if (!input.trim()) {
      setError("请输入要转换的内容")
      return
    }

    if (direction === "toDate") {
      // 时间戳 -> 日期
      let ts = Number(input.trim())
      if (isNaN(ts)) {
        setError("请输入有效的时间戳（数字）")
        return
      }
      // 自动检测秒级/毫秒级时间戳
      if (ts < 1e12) {
        ts = ts * 1000 // 秒级转毫秒
      }
      const date = new Date(ts)
      if (isNaN(date.getTime())) {
        setError("无效的时间戳")
        return
      }
      setResults(
        DATE_FORMATS.map((f) => ({
          label: f.label,
          value: f.format(date),
        }))
      )
      toast("转换成功", "success")
    } else {
      // 日期 -> 时间戳
      const date = new Date(input.trim())
      if (isNaN(date.getTime())) {
        setError("无法解析日期格式，请使用标准格式如 2024-01-15 12:30:00")
        return
      }
      setResults([
        { label: "秒级时间戳", value: String(Math.floor(date.getTime() / 1000)) },
        { label: "毫秒级时间戳", value: String(date.getTime()) },
      ])
      toast("转换成功", "success")
    }
  }, [input, direction, toast])

  const copyValue = useCallback(
    (value: string) => {
      copyToClipboard(value).then(() => {
        toast("已复制到剪贴板", "success")
      })
    },
    [toast]
  )

  const fillNow = useCallback(() => {
    if (direction === "toDate") {
      setInput(String(Math.floor(Date.now() / 1000)))
    } else {
      setInput(formatFullDate(new Date()))
    }
  }, [direction])

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* 头部 */}
      <header className="shrink-0 px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{ background: "var(--gradient-primary)" }}
              >
                <Clock className="h-4 w-4 text-primary-foreground" />
              </div>
              时间转换
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              时间戳与日期格式互相转换
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* 实时时钟卡片 */}
        <div className="tool-panel p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse-soft" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              当前时间
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">本地时间</p>
              <p className="text-sm font-mono text-foreground">
                {formatFullDate(currentDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">秒级时间戳</p>
              <p className="text-sm font-mono text-foreground">
                {Math.floor(now / 1000)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">毫秒级时间戳</p>
              <p className="text-sm font-mono text-foreground">{now}</p>
            </div>
          </div>
        </div>

        {/* 转换方向切换 */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setDirection("toDate")
              setInput("")
              setResults([])
              setError("")
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              direction === "toDate"
                ? "bg-primary text-primary-foreground shadow-elegant"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            时间戳 → 日期
          </button>
          <button
            onClick={() => setDirection(direction === "toDate" ? "toTimestamp" : "toDate")}
            className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition-all duration-200"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setDirection("toTimestamp")
              setInput("")
              setResults([])
              setError("")
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              direction === "toTimestamp"
                ? "bg-primary text-primary-foreground shadow-elegant"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            日期 → 时间戳
          </button>
        </div>

        {/* 输入区 */}
        <div className="tool-panel p-5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 block">
            {direction === "toDate" ? "输入时间戳" : "输入日期"}
          </label>
          <div className="flex gap-3">
            <div className="code-editor flex-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConvert()}
                placeholder={
                  direction === "toDate"
                    ? "例如: 1705286400 或 1705286400000"
                    : "例如: 2024-01-15 12:00:00"
                }
                className="w-full bg-transparent px-4 py-2.5 outline-none font-mono text-sm"
                spellCheck={false}
              />
            </div>
            <Button variant="outline" size="icon" onClick={fillNow} title="填入当前时间">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={handleConvert}>转换</Button>
          </div>

          {error && (
            <p className="mt-3 text-sm text-destructive animate-fade-in">{error}</p>
          )}
        </div>

        {/* 结果区 */}
        {results.length > 0 && (
          <div className="tool-panel p-5 animate-fade-in">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 block">
              转换结果
            </label>
            <div className="space-y-2">
              {results.map((r) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between py-2.5 px-3 rounded-md bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{r.label}</p>
                    <p className="text-sm font-mono text-foreground mt-0.5 truncate">
                      {r.value}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 ml-3"
                    onClick={() => copyValue(r.value)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
