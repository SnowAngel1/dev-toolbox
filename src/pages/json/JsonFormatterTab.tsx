import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { CodeEditor } from "@/components/CodeEditor"
import { JsonTreeView } from "@/components/JsonTreeView"
import { useJsonSync } from "@/hooks/useJsonSync"
import { collectAllFoldablePaths, getValueAtPath } from "@/lib/jsonTree"
import {
  Braces,
  Minimize2,
  Copy,
  Trash2,
  FileDown,
  ListTree,
  Code2,
  ChevronsDownUp,
  ChevronsUpDown,
  WrapText,
  Quote,
} from "lucide-react"

type OutputMode = "tree" | "edit"

export function JsonFormatterTab() {
  const { toast } = useToast()
  const {
    input,
    output,
    parsedJson,
    error,
    errorLine,
    errorSource,
    handleInputChange,
    handleOutputChange,
    handleFormat,
    handleCompress,
    handleClear,
    handleEscape,
    handleUnescape,
    handleStringify,
    handleUnstringify,
  } = useJsonSync(
    (msg) => toast(msg, "success"),
    (msg) => toast(msg, "error")
  )

  const [outputMode, setOutputMode] = useState<OutputMode>("tree")
  const [foldedPaths, setFoldedPaths] = useState<Set<string>>(new Set())

  const handleToggleFold = useCallback((path: string) => {
    setFoldedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        const subValue = getValueAtPath(parsedJson, path)
        const descendantPaths = collectAllFoldablePaths(subValue, path)
        for (const p of descendantPaths) {
          next.add(p)
        }
      }
      return next
    })
  }, [parsedJson])

  const handleFoldAll = useCallback(() => {
    if (parsedJson === null) return
    const allPaths = collectAllFoldablePaths(parsedJson)
    setFoldedPaths(new Set(allPaths))
  }, [parsedJson])

  const handleExpandAll = useCallback(() => {
    setFoldedPaths(new Set())
  }, [])

  const handleCopy = useCallback(() => {
    const text = output || input
    if (!text) return
    navigator.clipboard.writeText(text).then(() => {
      toast("已复制到剪贴板", "success")
    })
  }, [output, input, toast])

  const handleDownload = useCallback(() => {
    if (!output) return
    const blob = new Blob([output], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "formatted.json"
    a.click()
    URL.revokeObjectURL(url)
    toast("文件已下载", "success")
  }, [output, toast])

  const switchToTree = useCallback(() => {
    if (output.trim()) {
      try {
        JSON.parse(output)
        setOutputMode("tree")
      } catch {
        toast("JSON 无效，请先修正后切换", "error")
        return
      }
    }
    setOutputMode("tree")
  }, [output, toast])

  const switchToEdit = useCallback(() => {
    setOutputMode("edit")
  }, [])

  const onClear = useCallback(() => {
    handleClear()
    setFoldedPaths(new Set())
  }, [handleClear])

  // 根据 errorSource 分别传错误给对应编辑器
  const inputError = errorSource === "input" ? error : undefined
  const inputErrorLine = errorSource === "input" ? errorLine : undefined
  const outputError = errorSource === "output" ? error : undefined
  const outputErrorLine = errorSource === "output" ? errorLine : undefined

  return (
    <div className="h-full flex gap-0 min-h-0 p-6 pt-4">
      {/* 输入区 */}
      <div className="flex-1 flex flex-col min-w-0">
        <label className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
          输入
        </label>
        <CodeEditor
          value={input}
          onChange={handleInputChange}
          placeholder={'粘贴 JSON 内容...\n例如: {"name": "DevToolbox", "version": "1.0"}'}
          error={inputError}
          errorLine={inputErrorLine}
        />
      </div>

      {/* 分隔线 */}
      <div className="w-px bg-border mx-4 shrink-0" />

      {/* 输出区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 输出标签行 */}
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            输出
          </label>
          <div className="flex items-center gap-1">
            {/* 模式切换 */}
            <button
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                outputMode === "tree"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
              onClick={switchToTree}
              title="树视图：支持折叠/展开 JSON 结构"
            >
              <ListTree className="h-3.5 w-3.5" />
              树视图
            </button>
            <button
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                outputMode === "edit"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
              onClick={switchToEdit}
              title="编辑模式：直接修改格式化后的 JSON 文本"
            >
              <Code2 className="h-3.5 w-3.5" />
              编辑
            </button>

            {/* 折叠控制 - 仅在树模式显示 */}
            {outputMode === "tree" && parsedJson !== null && (
              <>
                <div className="w-px h-4 bg-border mx-1" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleFoldAll}
                  title="全部折叠"
                >
                  <ChevronsDownUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleExpandAll}
                  title="全部展开"
                >
                  <ChevronsUpDown className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 输出内容容器 */}
        <div className="relative flex-1 flex flex-col min-h-0">
          {/* 浮动工具栏 - 放在输出框内右上角 */}
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md border border-border/50 p-1 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleFormat}
              title="格式化：将 JSON 格式化为带缩进的易读格式"
            >
              <Braces className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCompress}
              title="压缩：移除空格和换行，压缩为单行"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </Button>
            <div className="w-px h-4 bg-border" />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleEscape}
              title="转义：将换行、引号等转为转义字符"
            >
              <WrapText className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleUnescape}
              title="反转义：将转义字符还原为实际字符"
            >
              <WrapText className="h-3.5 w-3.5 rotate-180" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleStringify}
              title="字符串化：将内容包装成 JSON 字符串"
            >
              <Quote className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleUnstringify}
              title="反字符串化：解包 JSON 字符串"
            >
              <Quote className="h-3.5 w-3.5 opacity-50" />
            </Button>
            <div className="w-px h-4 bg-border" />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCopy}
              title="复制：将输出内容复制到剪贴板"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleDownload}
              title="下载：将输出内容保存为 JSON 文件"
            >
              <FileDown className="h-3.5 w-3.5" />
            </Button>
            <div className="w-px h-4 bg-border" />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClear}
              title="清空：清除输入和输出内容"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* 输出内容 */}
          {outputMode === "tree" && parsedJson !== null ? (
            <JsonTreeView
              data={parsedJson}
              foldedPaths={foldedPaths}
              onToggleFold={handleToggleFold}
            />
          ) : (
            <CodeEditor
              value={output}
              onChange={handleOutputChange}
              placeholder="格式化结果将显示在这里..."
              error={outputError}
              errorLine={outputErrorLine}
            />
          )}
        </div>
      </div>
    </div>
  )
}
