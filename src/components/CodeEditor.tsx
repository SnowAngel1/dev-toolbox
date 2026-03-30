import { useRef, useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
  placeholder?: string
  className?: string
  error?: string
  errorLine?: number | null
  activeSelection?: { start: number; end: number; rev: number } | null
}

const LINE_HEIGHT = 22.4 // 14px * 1.6
const PADDING_TOP = 16 // p-4

export function CodeEditor({
  value,
  onChange,
  readOnly = false,
  placeholder,
  className,
  error,
  errorLine,
  activeSelection,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumberRef = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const [lineCount, setLineCount] = useState(1)

  const updateLineCount = useCallback((text: string) => {
    const count = text ? text.split("\n").length : 1
    setLineCount(count)
  }, [])

  useEffect(() => {
    updateLineCount(value)
  }, [value, updateLineCount])

  // 匹配项选中与滚动定位
  useEffect(() => {
    if (!activeSelection) return
    const ta = textareaRef.current
    if (!ta) return
    ta.focus()
    ta.selectionStart = activeSelection.start
    ta.selectionEnd = activeSelection.end
    const lineNumber = value.substring(0, activeSelection.start).split("\n").length - 1
    const targetTop = lineNumber * LINE_HEIGHT
    const viewportTop = ta.scrollTop
    const viewportBottom = ta.scrollTop + ta.clientHeight
    if (targetTop < viewportTop || targetTop + LINE_HEIGHT > viewportBottom) {
      ta.scrollTop = Math.max(0, targetTop - ta.clientHeight / 2 + LINE_HEIGHT / 2)
    }
    if (lineNumberRef.current) {
      lineNumberRef.current.scrollTop = ta.scrollTop
    }
  }, [activeSelection]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumberRef.current) {
      lineNumberRef.current.scrollTop = textareaRef.current.scrollTop
    }
    // 更新高亮层位置，使其跟随滚动
    if (textareaRef.current && highlightRef.current && errorLine) {
      const scrollTop = textareaRef.current.scrollTop
      highlightRef.current.style.transform = `translateY(-${scrollTop}px)`
    }
  }, [errorLine])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e.target.value)
    },
    [onChange]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault()
        if (readOnly) return
        const ta = e.currentTarget
        const start = ta.selectionStart
        const end = ta.selectionEnd
        const newValue = value.substring(0, start) + "  " + value.substring(end)
        onChange?.(newValue)
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 2
        })
      }
    },
    [value, onChange, readOnly]
  )

  return (
    <div className={cn(
      "code-editor relative flex flex-1 min-h-0 overflow-hidden",
      className
    )}>
      {/* 行号 */}
      <div
        ref={lineNumberRef}
        className="shrink-0 py-4 pl-3 pr-2 text-right select-none overflow-hidden border-r border-border/50"
        aria-hidden="true"
      >
        {Array.from({ length: lineCount }, (_, i) => {
          const lineNum = i + 1
          const isErrorLine = errorLine === lineNum
          return (
            <div
              key={lineNum}
              className={cn(
                "text-xs font-mono px-1 -mx-1 rounded-sm",
                isErrorLine
                  ? "bg-destructive/20 text-destructive font-bold"
                  : "text-muted-foreground/40"
              )}
              style={{ height: LINE_HEIGHT, lineHeight: `${LINE_HEIGHT}px` }}
            >
              {lineNum}
            </div>
          )
        })}
      </div>

      {/* 文本区域容器 - 含高亮层 */}
      <div className="relative flex-1 min-w-0">
        {/* 错误行高亮背景层 */}
        {errorLine && (
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            aria-hidden="true"
          >
            <div
              ref={highlightRef}
              className="error-line-highlight"
              style={{
                position: "absolute",
                top: PADDING_TOP + (errorLine - 1) * LINE_HEIGHT,
                left: 0,
                right: 0,
                height: LINE_HEIGHT,
              }}
            />
          </div>
        )}

        {/* 编辑区 */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          placeholder={placeholder}
          spellCheck={false}
          className={cn(
            "absolute inset-0 bg-transparent resize-none outline-none p-4 font-mono text-sm leading-[1.6] w-full h-full",
            readOnly && "cursor-default"
          )}
        />
      </div>

      {/* 错误提示浮层 */}
      {error && (
        <div className="absolute bottom-3 left-3 right-3 px-3 py-2 rounded-lg bg-destructive/15 border border-destructive/25 text-destructive text-xs flex items-start gap-2 shadow-sm backdrop-blur-sm">
          <span className="shrink-0 mt-px">&#9888;</span>
          <span className="break-all">
            {errorLine && <strong className="mr-1">第 {errorLine} 行:</strong>}
            {error}
          </span>
        </div>
      )}
    </div>
  )
}
