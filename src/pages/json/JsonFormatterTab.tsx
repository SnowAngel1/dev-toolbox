import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip } from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/toast"
import { CodeEditor } from "@/components/CodeEditor"
import { JsonTreeView } from "@/components/JsonTreeView"
import { useJsonSync } from "@/hooks/useJsonSync"
import { copyToClipboard } from "@/lib/clipboard"
import { collectAllFoldablePaths, getValueAtPath, setValueAtPath } from "@/lib/jsonTree"
import {
  Braces,
  Minimize2,
  Copy,
  Check,
  Trash2,
  FileDown,
  ListTree,
  Code2,
  ChevronsDownUp,
  ChevronsUpDown,
  WrapText,
  ArrowLeft,
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
    handleTreeEdit,
    applyOutputToInput,
  } = useJsonSync(
    (msg) => toast(msg, "success"),
    (msg) => toast(msg, "error")
  )

  const [outputMode, setOutputMode] = useState<OutputMode>("tree")
  const [foldedPaths, setFoldedPaths] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)
  const [isEscaped, setIsEscaped] = useState(false)

  // 判断输出是否已格式化（含换行即为格式化状态）
  const isOutputFormatted = output.includes("\n")

  const handleFormatToggle = useCallback(() => {
    if (isOutputFormatted) {
      handleCompress()
      setOutputMode("edit")
    } else {
      handleFormat()
      setOutputMode("tree")
    }
  }, [isOutputFormatted, handleCompress, handleFormat])

  const handleEscapeToggle = useCallback(() => {
    if (isEscaped) {
      handleUnescape()
      setIsEscaped(false)
    } else {
      handleEscape()
      setIsEscaped(true)
    }
    setOutputMode("edit")
  }, [isEscaped, handleEscape, handleUnescape])

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
    copyToClipboard(text).then(() => {
      toast("已复制到剪贴板", "success")
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
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
    setIsEscaped(false)
  }, [handleClear])

  // 树编辑：更新指定路径的值
  const handleValueChange = useCallback((path: string, newValue: unknown) => {
    if (parsedJson === null) return
    const updated = setValueAtPath(parsedJson, path, newValue)
    handleTreeEdit(updated)
  }, [parsedJson, handleTreeEdit])

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
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            输出
          </label>
          <div className="flex items-center gap-1">
            {/* 模式切换 */}
            <Tooltip content="树视图：折叠/展开，双击编辑">
              <button
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                  outputMode === "tree"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
                onClick={switchToTree}
              >
                <ListTree className="h-3.5 w-3.5" />
                树视图
              </button>
            </Tooltip>
            <Tooltip content="编辑模式：直接修改 JSON 文本">
              <button
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                  outputMode === "edit"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
                onClick={switchToEdit}
              >
                <Code2 className="h-3.5 w-3.5" />
                编辑
              </button>
            </Tooltip>

            {/* 折叠控制 - 仅在树模式显示 */}
            {outputMode === "tree" && parsedJson !== null && (
              <>
                <div className="w-px h-4 bg-border mx-1" />
                <Tooltip content="全部折叠">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleFoldAll}
                  >
                    <ChevronsDownUp className="h-3.5 w-3.5" />
                  </Button>
                </Tooltip>
                <Tooltip content="全部展开">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleExpandAll}
                  >
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                  </Button>
                </Tooltip>
              </>
            )}
          </div>
        </div>

        {/* 工具栏 */}
        <div className="flex items-center gap-1 mb-1 bg-muted/30 rounded-md border border-border/50 p-1">
          <Tooltip content="同步格式到输入侧" position="bottom">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={applyOutputToInput}
              disabled={!output.trim()}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </Tooltip>
          <div className="w-px h-4 bg-border" />
          <Tooltip content={isOutputFormatted ? "压缩为单行" : "格式化缩进"} position="bottom">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleFormatToggle}
            >
              {isOutputFormatted ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Braces className="h-3.5 w-3.5" />
              )}
            </Button>
          </Tooltip>
          <div className="w-px h-4 bg-border" />
          <Tooltip content={isEscaped ? "反转义" : "转义"} position="bottom">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleEscapeToggle}
            >
              {isEscaped ? (
                <WrapText className="h-3.5 w-3.5 rotate-180" />
              ) : (
                <WrapText className="h-3.5 w-3.5" />
              )}
            </Button>
          </Tooltip>
          <div className="w-px h-4 bg-border" />
          <Tooltip content={copied ? "已复制" : "复制"} position="bottom">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </Tooltip>
          <Tooltip content="下载" position="bottom">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleDownload}
            >
              <FileDown className="h-3.5 w-3.5" />
            </Button>
          </Tooltip>
          <div className="w-px h-4 bg-border" />
          <Tooltip content="清空" position="bottom">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClear}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </Tooltip>
        </div>

        {/* 输出内容容器 */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* 输出内容 */}
          {outputMode === "tree" && parsedJson !== null ? (
            <JsonTreeView
              data={parsedJson}
              foldedPaths={foldedPaths}
              onToggleFold={handleToggleFold}
              onValueChange={handleValueChange}
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
