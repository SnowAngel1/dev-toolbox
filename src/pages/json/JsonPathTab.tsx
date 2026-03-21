import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { CodeEditor } from "@/components/CodeEditor"
import { JSONPath } from "jsonpath-plus"
import { Search, Copy, Trash2, BookOpen } from "lucide-react"

const EXAMPLE_JSON = JSON.stringify(
  {
    store: {
      book: [
        { category: "reference", author: "Nigel Rees", title: "Sayings of the Century", price: 8.95 },
        { category: "fiction", author: "Evelyn Waugh", title: "Sword of Honour", price: 12.99 },
        { category: "fiction", author: "Herman Melville", title: "Moby Dick", price: 8.99 },
        { category: "fiction", author: "J. R. R. Tolkien", title: "The Lord of the Rings", price: 22.99 },
      ],
      bicycle: { color: "red", price: 19.95 },
    },
  },
  null,
  2
)
const EXAMPLE_PATH = "$.store.book[*].author"

export function JsonPathTab() {
  const { toast } = useToast()
  const [jsonInput, setJsonInput] = useState("")
  const [expression, setExpression] = useState("")
  const [result, setResult] = useState("")
  const [matchCount, setMatchCount] = useState<number | null>(null)
  const [jsonError, setJsonError] = useState<string | undefined>()
  const [pathError, setPathError] = useState("")

  const handleQuery = useCallback(() => {
    setPathError("")
    setJsonError(undefined)
    setResult("")
    setMatchCount(null)

    if (!jsonInput.trim()) {
      toast("请输入 JSON 数据", "error")
      return
    }
    if (!expression.trim()) {
      toast("请输入 JSONPath 表达式", "error")
      return
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(jsonInput)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "JSON 解析失败"
      setJsonError(msg)
      toast("JSON 格式错误", "error")
      return
    }

    try {
      const results = JSONPath({ path: expression, json: parsed as object })
      setMatchCount(results.length)
      setResult(JSON.stringify(results, null, 2))
      toast(`查询完成，匹配 ${results.length} 条`, "success")
    } catch (e) {
      const msg = e instanceof Error ? e.message : "JSONPath 表达式错误"
      setPathError(msg)
      toast("JSONPath 表达式错误", "error")
    }
  }, [jsonInput, expression, toast])

  const handleLoadExample = useCallback(() => {
    setJsonInput(EXAMPLE_JSON)
    setExpression(EXAMPLE_PATH)
    setResult("")
    setMatchCount(null)
    setJsonError(undefined)
    setPathError("")
    toast("已加载示例数据", "success")
  }, [toast])

  const handleCopy = useCallback(() => {
    if (!result) return
    navigator.clipboard.writeText(result).then(() => toast("已复制到剪贴板", "success"))
  }, [result, toast])

  const handleClear = useCallback(() => {
    setJsonInput("")
    setExpression("")
    setResult("")
    setMatchCount(null)
    setJsonError(undefined)
    setPathError("")
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleQuery()
    },
    [handleQuery]
  )

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* 查询栏 */}
      <div className="shrink-0 px-6 py-3 border-b border-border flex items-center gap-3">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider shrink-0">
          JSONPath
        </label>
        <div className="flex-1 relative">
          <input
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-8 px-3 text-sm font-mono rounded-md border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary/50"
            placeholder="$.store.book[*].author"
          />
          {pathError && (
            <div className="absolute top-full left-0 mt-1 text-xs text-destructive bg-destructive/10 px-2 py-1 rounded z-10">
              {pathError}
            </div>
          )}
        </div>
        <Button size="sm" onClick={handleQuery}>
          <Search className="h-3.5 w-3.5 mr-1.5" />
          查询
        </Button>
        <Button variant="outline" size="sm" onClick={handleLoadExample}>
          <BookOpen className="h-3.5 w-3.5 mr-1.5" />
          示例
        </Button>
        <Button variant="outline" size="sm" onClick={handleClear}>
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          清空
        </Button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 flex gap-0 min-h-0 p-6 pt-4">
        {/* JSON 输入 */}
        <div className="flex-1 flex flex-col min-w-0">
          <label className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
            JSON 数据
          </label>
          <CodeEditor
            value={jsonInput}
            onChange={setJsonInput}
            placeholder={'粘贴 JSON 数据...\n点击"示例"按钮加载示例数据'}
            error={jsonError}
          />
        </div>

        {/* 分隔线 */}
        <div className="w-px bg-border mx-4 shrink-0" />

        {/* 查询结果 */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              查询结果
            </label>
            <div className="flex items-center gap-2">
              {matchCount !== null && (
                <span className="text-xs text-muted-foreground">
                  匹配 <span className="text-foreground font-medium">{matchCount}</span> 条
                </span>
              )}
              {result && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy} title="复制结果">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
          <CodeEditor value={result} readOnly placeholder="查询结果将显示在这里..." />
        </div>
      </div>
    </div>
  )
}
