import { useMemo, useRef, useCallback, useState } from "react"
import { cn } from "@/lib/utils"
import { flattenJsonToLines, type JsonLine, type JsonToken } from "@/lib/jsonTree"

interface JsonTreeViewProps {
  data: unknown
  foldedPaths: Set<string>
  onToggleFold: (path: string) => void
  onValueChange?: (path: string, newValue: unknown) => void
  className?: string
}

function TokenSpan({ token }: { token: JsonToken }) {
  const classMap: Record<JsonToken["type"], string> = {
    key: "json-key",
    string: "json-string",
    number: "json-number",
    boolean: "json-boolean",
    null: "json-null",
    bracket: "json-bracket",
    punctuation: "json-bracket",
    "fold-indicator": "json-fold-indicator",
  }
  return <span className={classMap[token.type]}>{token.text}</span>
}

/** 解析编辑后的值，完全按照用户输入 */
function parseEditedValue(text: string): unknown {
  const trimmed = text.trim()
  
  // null
  if (trimmed === "null") return null
  
  // boolean
  if (trimmed === "true") return true
  if (trimmed === "false") return false
  
  // number（不带引号的纯数字）
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) {
    return Number(trimmed)
  }
  
  // string（带引号的，去掉引号）
  if (/^".*"$/.test(trimmed) && trimmed.length >= 2) {
    return trimmed.slice(1, -1)
  }
  
  // 其他情况作为字符串返回
  return trimmed
}

/** 获取编辑时显示的原始文本，包含引号 */
function getEditText(rawValue: unknown): string {
  if (rawValue === null) return "null"
  if (typeof rawValue === "boolean") return String(rawValue)
  if (typeof rawValue === "number") return String(rawValue)
  if (typeof rawValue === "string") return `"${rawValue}"`
  return String(rawValue)
}

function EditableTokens({
  line,
  editingPath,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
}: {
  line: JsonLine
  editingPath: string | null
  onStartEdit: (path: string, rawValue: unknown, tokenType: string) => void
  onCommitEdit: (text: string) => void
  onCancelEdit: () => void
}) {
  const isEditing = line.valuePath != null && editingPath === line.valuePath
  const hasEditableValue = line.valuePath != null

  if (!hasEditableValue) {
    return (
      <>
        {line.tokens.map((token, i) => (
          <TokenSpan key={i} token={token} />
        ))}
      </>
    )
  }

  // 找到值 token 的范围（排除 key、冒号、逗号）
  const valueTokenTypes = new Set(["string", "number", "boolean", "null"])
  const firstValueIdx = line.tokens.findIndex((t) => valueTokenTypes.has(t.type))
  const lastValueIdx = line.tokens.reduce(
    (last, t, i) => (valueTokenTypes.has(t.type) ? i : last),
    -1
  )

  // 获取值的 token 类型
  const valueToken = line.tokens.find((t) => valueTokenTypes.has(t.type))
  const tokenType = (valueToken?.type as "string" | "number" | "boolean" | "null") ?? "string"

  if (isEditing) {
    return (
      <>
        {/* key + 冒号部分 */}
        {line.tokens.slice(0, firstValueIdx).map((token, i) => (
          <TokenSpan key={i} token={token} />
        ))}
        {/* 编辑输入框 */}
        <InlineEditor
          initialValue={getEditText(line.rawValue)}
          tokenType={tokenType}
          onCommit={onCommitEdit}
          onCancel={onCancelEdit}
        />
        {/* 逗号部分 */}
        {line.tokens.slice(lastValueIdx + 1).map((token, i) => (
          <TokenSpan key={`after-${i}`} token={token} />
        ))}
      </>
    )
  }

  return (
    <>
      {line.tokens.map((token, i) => {
        if (i >= firstValueIdx && i <= lastValueIdx) {
          return (
            <span
              key={i}
              className={`${
                token.type === "string"
                  ? "json-string"
                  : token.type === "number"
                  ? "json-number"
                  : token.type === "boolean"
                  ? "json-boolean"
                  : "json-null"
              } cursor-pointer hover:outline hover:outline-1 hover:outline-primary/50 hover:rounded-sm`}
              onDoubleClick={() => onStartEdit(line.valuePath!, line.rawValue, token.type)}
              title="双击编辑"
            >
              {token.text}
            </span>
          )
        }
        return <TokenSpan key={i} token={token} />
      })}
    </>
  )
}

function InlineEditor({
  initialValue,
  tokenType,
  onCommit,
  onCancel,
}: {
  initialValue: string
  tokenType: "string" | "number" | "boolean" | "null"
  onCommit: (text: string) => void
  onCancel: () => void
}) {
  const [text, setText] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)

  // 根据 token 类型获取对应的样式类名
  const getTokenClass = () => {
    switch (tokenType) {
      case "string":
        return "json-string"
      case "number":
        return "json-number"
      case "boolean":
        return "json-boolean"
      case "null":
        return "json-null"
      default:
        return ""
    }
  }

  return (
    <span className="inline-edit-wrapper">
      <input
        ref={inputRef}
        autoFocus
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => onCommit(text)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            onCommit(text)
          }
          if (e.key === "Escape") onCancel()
        }}
        onFocus={(e) => e.target.select()}
        className={`inline-edit-input-inline ${getTokenClass()}`}
      />
    </span>
  )
}

function TreeLine({
  line,
  onToggleFold,
  editingPath,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
}: {
  line: JsonLine
  onToggleFold: (path: string) => void
  editingPath: string | null
  onStartEdit: (path: string, rawValue: unknown, tokenType: string) => void
  onCommitEdit: (text: string) => void
  onCancelEdit: () => void
}) {
  return (
    <div className="json-line group">
      {/* Indent guides */}
      {Array.from({ length: line.indent }, (_, i) => (
        <span key={i} className="json-indent-guide" />
      ))}
      {line.foldable && line.path ? (
        <button
          className="json-fold-toggle"
          onClick={() => onToggleFold(line.path!)}
          aria-label={line.folded ? "展开" : "折叠"}
        >
          {line.folded ? "▶" : "▼"}
        </button>
      ) : (
        <span className="json-fold-spacer" />
      )}
      {/* Tokens with editing support */}
      <EditableTokens
        line={line}
        editingPath={editingPath}
        onStartEdit={onStartEdit}
        onCommitEdit={onCommitEdit}
        onCancelEdit={onCancelEdit}
      />
    </div>
  )
}

export function JsonTreeView({
  data,
  foldedPaths,
  onToggleFold,
  onValueChange,
  className,
}: JsonTreeViewProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const lineNumberRef = useRef<HTMLDivElement>(null)
  const [editingPath, setEditingPath] = useState<string | null>(null)
  const editingRawValueRef = useRef<unknown>(null)
  const editingTokenTypeRef = useRef<string>("string")

  const lines = useMemo(
    () => flattenJsonToLines(data, foldedPaths),
    [data, foldedPaths]
  )

  const handleScroll = useCallback(() => {
    if (contentRef.current && lineNumberRef.current) {
      lineNumberRef.current.scrollTop = contentRef.current.scrollTop
    }
  }, [])

  const handleStartEdit = useCallback((path: string, rawValue: unknown, tokenType: string) => {
    if (!onValueChange) return
    setEditingPath(path)
    editingRawValueRef.current = rawValue
    editingTokenTypeRef.current = tokenType
  }, [onValueChange])

  const handleCommitEdit = useCallback((text: string) => {
    if (editingPath && onValueChange) {
      const newValue = parseEditedValue(text)
      onValueChange(editingPath, newValue)
    }
    setEditingPath(null)
    editingRawValueRef.current = null
    editingTokenTypeRef.current = "string"
  }, [editingPath, onValueChange])

  const handleCancelEdit = useCallback(() => {
    setEditingPath(null)
    editingRawValueRef.current = null
    editingTokenTypeRef.current = "string"
  }, [])

  return (
    <div
      className={cn("code-editor flex flex-1 min-h-0 overflow-hidden", className)}
      tabIndex={0}
    >
      {/* Line numbers */}
      <div
        ref={lineNumberRef}
        className="shrink-0 py-4 pl-3 pr-2 text-right select-none overflow-hidden border-r border-border/50"
        aria-hidden="true"
      >
        {lines.map((line) => (
          <div
            key={line.lineNumber}
            className="text-muted-foreground/40 text-xs font-mono"
            style={{ height: 22.4, lineHeight: '22.4px' }}
          >
            {line.lineNumber}
          </div>
        ))}
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto p-4 font-mono text-sm leading-[1.6] min-w-0"
      >
        {lines.map((line) => (
          <TreeLine
            key={line.lineNumber}
            line={line}
            onToggleFold={onToggleFold}
            editingPath={editingPath}
            onStartEdit={handleStartEdit}
            onCommitEdit={handleCommitEdit}
            onCancelEdit={handleCancelEdit}
          />
        ))}
      </div>
    </div>
  )
}
