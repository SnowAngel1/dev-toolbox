import { CronExpressionParser } from "cron-parser"
import cronstrue from "cronstrue/i18n"

export type CronMode = "everyMinute" | "everyHour" | "everyDay" | "everyWeek" | "everyMonth" | "custom"

export interface CronConfig {
  mode: CronMode
  minute: number
  hour: number
  dayOfMonth: number
  daysOfWeek: number[]
  customFields: string[]
}

export interface CronParseResult {
  valid: boolean
  error?: string
}

export function getDefaultConfig(): CronConfig {
  return {
    mode: "everyDay",
    minute: 0,
    hour: 9,
    dayOfMonth: 1,
    daysOfWeek: [1],
    customFields: ["*", "*", "*", "*", "*"],
  }
}

/** 校验 Cron 表达式是否合法 */
export function parseCronExpression(expression: string): CronParseResult {
  try {
    CronExpressionParser.parse(expression.trim())
    return { valid: true }
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : "无效的 Cron 表达式" }
  }
}

/** 计算未来 N 次执行时间 */
export function getNextExecutions(expression: string, count: number): Date[] {
  try {
    const interval = CronExpressionParser.parse(expression.trim())
    const dates: Date[] = []
    for (let i = 0; i < count; i++) {
      dates.push(interval.next().toDate())
    }
    return dates
  } catch {
    return []
  }
}

/** 返回 Cron 表达式的中文自然语言描述 */
export function describeCron(expression: string): string {
  try {
    return cronstrue.toString(expression.trim(), { locale: "zh_CN" })
  } catch {
    return ""
  }
}

/** 根据可视化配置生成 Cron 表达式 */
export function buildCronExpression(config: CronConfig): string {
  switch (config.mode) {
    case "everyMinute":
      return "* * * * *"
    case "everyHour":
      return `${config.minute} * * * *`
    case "everyDay":
      return `${config.minute} ${config.hour} * * *`
    case "everyWeek": {
      const days = config.daysOfWeek.length > 0 ? config.daysOfWeek.sort().join(",") : "*"
      return `${config.minute} ${config.hour} * * ${days}`
    }
    case "everyMonth":
      return `${config.minute} ${config.hour} ${config.dayOfMonth} * *`
    case "custom":
      return config.customFields.join(" ")
  }
}

/** 格式化日期为 YYYY-MM-DD HH:mm:ss */
export function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** 计算相对时间描述 */
export function relativeTime(date: Date): string {
  const now = Date.now()
  const diff = date.getTime() - now
  if (diff < 0) return "已过去"
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}秒后`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}分钟后`
  const hours = Math.floor(minutes / 60)
  const remainMinutes = minutes % 60
  if (hours < 24) {
    return remainMinutes > 0 ? `${hours}小时${remainMinutes}分后` : `${hours}小时后`
  }
  const days = Math.floor(hours / 24)
  const remainHours = hours % 24
  return remainHours > 0 ? `${days}天${remainHours}小时后` : `${days}天后`
}

/** 常用 Cron 表达式 */
export const COMMON_EXPRESSIONS = [
  { name: "每分钟", expression: "* * * * *" },
  { name: "每5分钟", expression: "*/5 * * * *" },
  { name: "每10分钟", expression: "*/10 * * * *" },
  { name: "每30分钟", expression: "*/30 * * * *" },
  { name: "每小时整点", expression: "0 * * * *" },
  { name: "每天 0:00", expression: "0 0 * * *" },
  { name: "每天 9:00", expression: "0 9 * * *" },
  { name: "每天 12:00", expression: "0 12 * * *" },
  { name: "每天 18:00", expression: "0 18 * * *" },
  { name: "工作日 9:00", expression: "0 9 * * 1-5" },
  { name: "每周一 9:00", expression: "0 9 * * 1" },
  { name: "每月1号 0:00", expression: "0 0 1 * *" },
  { name: "每月15号 9:00", expression: "0 9 15 * *" },
  { name: "每年1月1日 0:00", expression: "0 0 1 1 *" },
]
