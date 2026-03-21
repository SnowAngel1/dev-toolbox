import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { GitCompare, Trash2, ArrowLeftRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface DiffLine {
  lineNumber: number
  type: "equal" | "added" | "removed" | "modified"
  left?: string
  right?: string
}

/** 尝试格式化 JSON，如果不是有效 JSON 则返回原文 */
function tryFormatJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return text
  }
}

function computeDiff(left: string, right: string): DiffLine[] {
  const leftLines = left.split("\n")
  const rightLines = right.split("\n")
  const maxLen = Math.max(leftLines.length, rightLines.length)
  const result: DiffLine[] = []

  for (let i = 0; i < maxLen; i++) {
    const l = leftLines[i]
    const r = rightLines[i]

    if (l === undefined && r !== undefined) {
      result.push({ lineNumber: i + 1, type: "added", right: r })
    } else if (l !== undefined && r === undefined) {
      result.push({ lineNumber: i + 1, type: "removed", left: l })
    } else if (l === r) {
      result.push({ lineNumber: i + 1, type: "equal", left: l, right: r })
    } else {
      result.push({ lineNumber: i + 1, type: "modified", left: l, right: r })
    }
  }

  return result
}

export function JsonDiffTab() {
  const { toast } = useToast()
  const [leftInput, setLeftInput] = useState("")
  const [rightInput, setRightInput] = useState("")
  const [showDiff, setShowDiff] = useState(false)

  const diffResult = useMemo(() => {
    if (!showDiff) return []
    // 如果是 JSON 则格式化后对比，否则直接对比原文
    const formattedLeft = tryFormatJson(leftInput)
    const formattedRight = tryFormatJson(rightInput)
    return computeDiff(formattedLeft, formattedRight)
  }, [leftInput, rightInput, showDiff])

  const stats = useMemo(() => {
    const added = diffResult.filter((d) => d.type === "added").length
    const removed = diffResult.filter((d) => d.type === "removed").length
    const modified = diffResult.filter((d) => d.type === "modified").length
    return { added, removed, modified, total: diffResult.length }
  }, [diffResult])

  const handleCompare = useCallback(() => {
    if (!leftInput.trim() || !rightInput.trim()) {
      toast("请在两侧都输入内容", "error")
      return
    }
    setShowDiff(true)
    toast("对比完成", "success")
  }, [leftInput, rightInput, toast])

  const handleSwap = useCallback(() => {
    setLeftInput(rightInput)
    setRightInput(leftInput)
    setShowDiff(false)
  }, [leftInput, rightInput])

  const handleClear = useCallback(() => {
    setLeftInput("")
    setRightInput("")
    setShowDiff(false)
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="shrink-0 px-6 py-3 border-b border-border flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleSwap}>
          <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" />
          交换
        </Button>
        <Button variant="outline" size="sm" onClick={handleClear}>
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          清空
        </Button>
        <Button size="sm" onClick={handleCompare}>
          <GitCompare className="h-3.5 w-3.5 mr-1.5" />
          对比
        </Button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 flex flex-col min-h-0 p-6 pt-4 gap-4">
        {/* 输入区域 */}
        <div className="flex gap-4 min-h-0" style={{ flex: showDiff ? "0 0 40%" : "1" }}>
          {/* 左侧输入 */}
          <div className="flex-1 flex flex-col min-w-0">
            <label className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              原始文本
            </label>
            <textarea
              value={leftInput}
              onChange={(e) => {
                setLeftInput(e.target.value)
                setShowDiff(false)
              }}
              placeholder="粘贴第一段文本或 JSON..."
              className="flex-1 code-editor p-4 resize-none outline-none focus-within:ring-2 focus-within:ring-ring/30"
              spellCheck={false}
            />
          </div>

          {/* 右侧输入 */}
          <div className="flex-1 flex flex-col min-w-0">
            <label className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              目标文本
            </label>
            <textarea
              value={rightInput}
              onChange={(e) => {
                setRightInput(e.target.value)
                setShowDiff(false)
              }}
              placeholder="粘贴第二段文本或 JSON..."
              className="flex-1 code-editor p-4 resize-none outline-none focus-within:ring-2 focus-within:ring-ring/30"
              spellCheck={false}
            />
          </div>
        </div>

        {/* 对比结果 */}
        {showDiff && (
          <div className="flex-1 flex flex-col min-h-0 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                对比结果
              </label>
              <div className="flex items-center gap-3 text-xs">
                {stats.modified > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-warning" />
                    修改 {stats.modified}
                  </span>
                )}
                {stats.added > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    新增 {stats.added}
                  </span>
                )}
                {stats.removed > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-destructive" />
                    删除 {stats.removed}
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 code-editor overflow-auto">
              <div className="flex min-h-full">
                {/* 左侧 */}
                <div className="flex-1 border-r border-border/50">
                  <div className="p-2">
                    {diffResult.map((line, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex font-mono text-sm leading-6 px-2 rounded-sm",
                          line.type === "removed" && "bg-destructive/15 text-destructive",
                          line.type === "modified" && "bg-warning/15",
                          line.type === "added" && "opacity-30"
                        )}
                      >
                        <span className="w-8 shrink-0 text-muted-foreground/40 text-right pr-2 select-none">
                          {line.left !== undefined ? line.lineNumber : ""}
                        </span>
                        <span className="whitespace-pre">{line.left ?? ""}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 右侧 */}
                <div className="flex-1">
                  <div className="p-2">
                    {diffResult.map((line, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex font-mono text-sm leading-6 px-2 rounded-sm",
                          line.type === "added" && "bg-success/15 text-success",
                          line.type === "modified" && "bg-warning/15",
                          line.type === "removed" && "opacity-30"
                        )}
                      >
                        <span className="w-8 shrink-0 text-muted-foreground/40 text-right pr-2 select-none">
                          {line.right !== undefined ? line.lineNumber : ""}
                        </span>
                        <span className="whitespace-pre">{line.right ?? ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
