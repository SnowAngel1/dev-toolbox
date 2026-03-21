import { useMemo, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { flattenJsonToLines, type JsonLine, type JsonToken } from "@/lib/jsonTree"

interface JsonTreeViewProps {
  data: unknown
  foldedPaths: Set<string>
  onToggleFold: (path: string) => void
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

function TreeLine({
  line,
  onToggleFold,
}: {
  line: JsonLine
  onToggleFold: (path: string) => void
}) {
  const indentStr = "  ".repeat(line.indent)

  return (
    <div className="json-line group">
      {/* Indent + fold toggle */}
      <span className="json-bracket">{indentStr}</span>
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
      {/* Tokens */}
      {line.tokens.map((token, i) => (
        <TokenSpan key={i} token={token} />
      ))}
    </div>
  )
}

export function JsonTreeView({
  data,
  foldedPaths,
  onToggleFold,
  className,
}: JsonTreeViewProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const lineNumberRef = useRef<HTMLDivElement>(null)

  const lines = useMemo(
    () => flattenJsonToLines(data, foldedPaths),
    [data, foldedPaths]
  )

  const handleScroll = useCallback(() => {
    if (contentRef.current && lineNumberRef.current) {
      lineNumberRef.current.scrollTop = contentRef.current.scrollTop
    }
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
            className="text-muted-foreground/40 text-xs leading-[1.6] font-mono"
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
          />
        ))}
      </div>
    </div>
  )
}
