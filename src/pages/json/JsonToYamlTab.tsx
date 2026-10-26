import { useState, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { copyToClipboard } from "@/lib/clipboard"
import { usePersistedState } from "@/hooks/usePersistedState"
import { CodeEditor } from "@/components/CodeEditor"
import { Copy, FileDown, Trash2 } from "lucide-react"
import yaml from "js-yaml"
import { isLosslessNumber, isSafeNumber } from "lossless-json"
import { parseJson } from "@/lib/jsonLossless"

/** 安全数字转 number；超出 double 精度的先用占位符，dump 后回填原始字面量 */
function toYamlValue(value: unknown, rawNumbers: string[], token: string): unknown {
  if (isLosslessNumber(value)) {
    const raw = value.toString()
    if (isSafeNumber(raw)) return Number(raw)
    rawNumbers.push(raw)
    return `${token}${rawNumbers.length - 1}__`
  }
  if (Array.isArray(value)) {
    return value.map((item) => toYamlValue(item, rawNumbers, token))
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      result[key] = toYamlValue(item, rawNumbers, token)
    }
    return result
  }
  return value
}

function dumpYaml(value: unknown): string {
  const rawNumbers: string[] = []
  const token = `__dt_raw_${Math.random().toString(36).slice(2)}_`
  let text = yaml.dump(toYamlValue(value, rawNumbers, token), { indent: 2, lineWidth: -1 })
  rawNumbers.forEach((raw, index) => {
    text = text.replace(`${token}${index}__`, raw)
  })
  return text
}

export function JsonToYamlTab() {
  const { toast } = useToast()
  const [input, setInput] = usePersistedState("json-yaml:input", "")
  const [output, setOutput] = useState("")
  const [error, setError] = useState<string | undefined>()
  const [errorLine, setErrorLine] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const doConvert = useCallback((text: string) => {
    if (!text.trim()) {
      setOutput("")
      setError(undefined)
      setErrorLine(null)
      return
    }
    try {
      const parsed = parseJson(text)
      const yamlStr = dumpYaml(parsed)
      setOutput(yamlStr)
      setError(undefined)
      setErrorLine(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "JSON 解析失败"
      setError(msg)
      setOutput("")
    }
  }, [])

  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doConvert(input), 300)
    return () => clearTimeout(timerRef.current)
  }, [input, doConvert])

  const handleCopy = useCallback(() => {
    if (!output) return
    copyToClipboard(output).then(() => toast("已复制到剪贴板", "success"))
  }, [output, toast])

  const handleDownload = useCallback(() => {
    if (!output) return
    const blob = new Blob([output], { type: "text/yaml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "data.yaml"
    a.click()
    URL.revokeObjectURL(url)
    toast("文件已下载", "success")
  }, [output, toast])

  const handleClear = useCallback(() => {
    setInput("")
    setOutput("")
    setError(undefined)
    setErrorLine(null)
  }, [])

  return (
    <div className="h-full flex gap-0 min-h-0 p-6 pt-4">
      {/* 输入区 */}
      <div className="flex-1 flex flex-col min-w-0">
        <label className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
          JSON 输入
        </label>
        <CodeEditor
          value={input}
          onChange={setInput}
          placeholder={'粘贴 JSON 内容，将自动转换为 YAML...\n例如: {"name": "test", "items": [1, 2, 3]}'}
          error={error}
          errorLine={errorLine}
        />
      </div>

      {/* 分隔线 */}
      <div className="w-px bg-border mx-4 shrink-0" />

      {/* 输出区 */}
      <div className="flex-1 flex flex-col min-w-0">
        <label className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
          YAML 输出
        </label>
        <div className="relative flex-1 flex flex-col min-h-0">
          {/* 浮动工具栏 */}
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md border border-border/50 p-1 shadow-sm">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy} title="复制 YAML">
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload} title="下载为 YAML 文件">
              <FileDown className="h-3.5 w-3.5" />
            </Button>
            <div className="w-px h-4 bg-border" />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClear} title="清空">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <CodeEditor value={output} readOnly placeholder="YAML 结果将显示在这里..." />
        </div>
      </div>
    </div>
  )
}
