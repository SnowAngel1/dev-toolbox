import { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip } from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/toast"
import { CodeEditor } from "@/components/CodeEditor"
import { JsonTreeView } from "@/components/JsonTreeView"
import { ReplacePanel } from "@/components/ReplacePanel"
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
  Replace,
  ChevronRight,
  ChevronLeft,
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
  const [showReplace, setShowReplace] = useState(false)
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false)
  const [activeSelection, setActiveSelection] = useState<{ start: number; end: number; rev: number } | null>(null)
  const selectionRevRef = useRef(0)

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

  const handleReplaceAll = useCallback(
    (newText: string) => {
      handleOutputChange(newText)
      setOutputMode("edit")
    },
    [handleOutputChange]
  )

  const handleMatchFocus = useCallback(
    (start: number, end: number) => {
      selectionRevRef.current += 1
      setActiveSelection({ start, end, rev: selectionRevRef.current })
      setOutputMode("edit")
    },
    []
  )

  const onClear = useCallback(() => {
    handleClear()
    setFoldedPaths(new Set())
    setIsEscaped(false)
    setShowReplace(false)
    setActiveSelection(null)
  }, [handleClear])

  // 树编辑：更新指定路径的值
  const handleValueChange = useCallback((path: string, newValue: unknown) => {
    if (parsedJson === null) return
    const updated = setValueAtPath(parsedJson, path, newValue)
    handleTreeEdit(updated)
  }, [parsedJson, handleTreeEdit])

  // 错误信息统一显示在输出侧，输入侧仅保留行号高亮
  const inputErrorLine = errorSource === "input" ? errorLine : undefined
  const outputError = error || undefined
  const outputErrorLine = errorSource === "output" ? errorLine : undefined

  return (
    <div className="h-full flex gap-0 min-h-0 p-6 pt-4">
      {/* 输入区 */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            输入
          </label>
        </div>
        <CodeEditor
          value={input}
          onChange={handleInputChange}
          placeholder={'粘贴 JSON 内容...\n例如: {"name": "DevToolbox", "version": "1.0"}'}
          errorLine={inputErrorLine}
        />
      </div>

      {/* 分隔线 */}
      <div className="w-px bg-border mx-4 shrink-0" />

      {/* 输出区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 输出标签行 - 与输入侧对齐 */}
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            输出
          </label>
        </div>

        {/* 输出内容容器 */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          {/* 浮动工具栏 */}
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md border border-border/50 p-1 shadow-sm">
            {toolbarCollapsed ? (
              <Tooltip content="展开工具栏" position="bottom">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary hover:bg-primary/10"
                  onClick={() => setToolbarCollapsed(false)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </Tooltip>
            ) : (
              <>
                {/* 模式切换 */}
                <Tooltip content="树视图" position="bottom">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 ${outputMode === "tree" ? "bg-primary/10 text-primary" : ""}`}
                    onClick={switchToTree}
                  >
                    <ListTree className="h-3.5 w-3.5" />
                  </Button>
                </Tooltip>
                <Tooltip content="编辑模式" position="bottom">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 ${outputMode === "edit" ? "bg-primary/10 text-primary" : ""}`}
                    onClick={switchToEdit}
                  >
                    <Code2 className="h-3.5 w-3.5" />
                  </Button>
                </Tooltip>
                {/* 折叠控制 - 仅在树模式显示 */}
                {outputMode === "tree" && parsedJson !== null && (
                  <>
                    <Tooltip content="全部折叠" position="bottom">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleFoldAll}
                      >
                        <ChevronsDownUp className="h-3.5 w-3.5" />
                      </Button>
                    </Tooltip>
                    <Tooltip content="全部展开" position="bottom">
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
                <div className="w-px h-4 bg-border" />
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
                <Tooltip content="批量替换" position="bottom">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 ${showReplace ? "bg-primary/10 text-primary" : ""}`}
                    onClick={() => setShowReplace((v) => !v)}
                  >
                    <Replace className="h-3.5 w-3.5" />
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
                <div className="w-px h-4 bg-border" />
                <Tooltip content="收起工具栏" position="bottom">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary hover:bg-primary/10"
                    onClick={() => setToolbarCollapsed(true)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Tooltip>
              </>
            )}
          </div>

          {/* 批量替换面板 */}
          {showReplace && (
            <ReplacePanel
              text={output}
              onReplace={handleReplaceAll}
              onClose={() => { setShowReplace(false); setActiveSelection(null) }}
              onMatchFocus={handleMatchFocus}
            />
          )}

          {/* 输出内容 */}
          {errorSource === "input" && error ? (
            <div className="flex-1 flex flex-col min-h-0 rounded-lg border bg-editor p-4">
              <div className="flex items-start gap-2 text-destructive text-sm">
                <span className="shrink-0 mt-0.5">&#9888;</span>
                <span>
                  {errorLine && <strong className="mr-1">第 {errorLine} 行：</strong>}
                  {error}
                </span>
              </div>
            </div>
          ) : outputMode === "tree" && parsedJson !== null ? (
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
              activeSelection={activeSelection}
            />
          )}
        </div>
      </div>
    </div>
  )
}
