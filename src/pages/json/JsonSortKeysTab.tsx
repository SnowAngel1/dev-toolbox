import { useState, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { copyToClipboard } from "@/lib/clipboard"
import { usePersistedState } from "@/hooks/usePersistedState"
import { CodeEditor } from "@/components/CodeEditor"
import { Copy, FileDown, Trash2 } from "lucide-react"

function sortKeysRecursive(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value
  if (Array.isArray(value)) return value.map(sortKeysRecursive)
  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[key] = sortKeysRecursive((value as Record<string, unknown>)[key])
  }
  return sorted
}

export function JsonSortKeysTab() {
  const { toast } = useToast()
  const [input, setInput] = usePersistedState("json-sort:input", "")
  const [output, setOutput] = useState("")
  const [error, setError] = useState<string | undefined>()
  const [errorLine, setErrorLine] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const doSort = useCallback((text: string) => {
    if (!text.trim()) {
      setOutput("")
      setError(undefined)
      setErrorLine(null)
      return
    }
    try {
      const parsed = JSON.parse(text)
      const sorted = sortKeysRecursive(parsed)
      setOutput(JSON.stringify(sorted, null, 2))
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
    timerRef.current = setTimeout(() => doSort(input), 300)
    return () => clearTimeout(timerRef.current)
  }, [input, doSort])

  const handleCopy = useCallback(() => {
    if (!output) return
    copyToClipboard(output).then(() => toast("已复制到剪贴板", "success"))
  }, [output, toast])

  const handleDownload = useCallback(() => {
    if (!output) return
    const blob = new Blob([output], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "sorted.json"
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
          输入
        </label>
        <CodeEditor
          value={input}
          onChange={setInput}
          placeholder={'粘贴 JSON 内容，Key 将按字母序排列...\n例如: {"b": 2, "a": 1, "c": {"z": 1, "y": 2}}'}
          error={error}
          errorLine={errorLine}
        />
      </div>

      {/* 分隔线 */}
      <div className="w-px bg-border mx-4 shrink-0" />

      {/* 输出区 */}
      <div className="flex-1 flex flex-col min-w-0">
        <label className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
          排序结果
        </label>
        <div className="relative flex-1 flex flex-col min-h-0">
          {/* 浮动工具栏 */}
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md border border-border/50 p-1 shadow-sm">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy} title="复制排序结果">
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload} title="下载为 JSON 文件">
              <FileDown className="h-3.5 w-3.5" />
            </Button>
            <div className="w-px h-4 bg-border" />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClear} title="清空">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <CodeEditor value={output} readOnly placeholder="排序结果将显示在这里..." />
        </div>
      </div>
    </div>
  )
}
