import { useState, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { copyToClipboard } from "@/lib/clipboard"
import { CodeEditor } from "@/components/CodeEditor"
import { Copy, FileDown, Trash2 } from "lucide-react"
import yaml from "js-yaml"

export function JsonToYamlTab() {
  const { toast } = useToast()
  const [input, setInput] = useState("")
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
      const parsed = JSON.parse(text)
      const yamlStr = yaml.dump(parsed, { indent: 2, lineWidth: -1 })
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
