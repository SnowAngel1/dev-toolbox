import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip } from "@/components/ui/tooltip"
import { X, Undo2, ChevronUp, ChevronDown, CaseSensitive, WholeWord, Regex } from "lucide-react"

interface ReplacePanelProps {
  text: string
  onReplace: (newText: string) => void
  onClose: () => void
  onMatchFocus?: (start: number, end: number) => void
}

export function ReplacePanel({ text, onReplace, onClose, onMatchFocus }: ReplacePanelProps) {
  const [search, setSearch] = useState("")
  const [replace, setReplace] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)
  const [prevText, setPrevText] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const pendingFocusRef = useRef(false)

  // 搜索选项
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [useRegex, setUseRegex] = useState(false)

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  const matches = useMemo(() => {
    if (!search) return []
    const result: { start: number; end: number }[] = []
    try {
      if (useRegex) {
        const flags = caseSensitive ? "g" : "gi"
        const re = new RegExp(search, flags)
        let m: RegExpExecArray | null
        while ((m = re.exec(text)) !== null) {
          if (m[0].length === 0) { re.lastIndex++; continue }
          const start = m.index
          const end = start + m[0].length
          if (wholeWord) {
            const before = start > 0 ? text[start - 1] : " "
            const after = end < text.length ? text[end] : " "
            if (/\w/.test(before) || /\w/.test(after)) continue
          }
          result.push({ start, end })
        }
      } else {
        const src = caseSensitive ? text : text.toLowerCase()
        const needle = caseSensitive ? search : search.toLowerCase()
        let pos = 0
        while ((pos = src.indexOf(needle, pos)) !== -1) {
          const end = pos + search.length
          if (wholeWord) {
            const before = pos > 0 ? text[pos - 1] : " "
            const after = end < text.length ? text[end] : " "
            if (/\w/.test(before) || /\w/.test(after)) { pos++; continue }
          }
          result.push({ start: pos, end })
          pos += search.length
        }
      }
    } catch {
      // 正则语法错误时返回空
    }
    return result
  }, [text, search, caseSensitive, wholeWord, useRegex])

  const matchCount = matches.length

  // 搜索词/选项变化时重置 currentIndex 并聚焦第一个匹配
  useEffect(() => {
    setCurrentIndex(0)
    if (matches.length > 0) {
      onMatchFocus?.(matches[0].start, matches[0].end)
    }
  }, [search, caseSensitive, wholeWord, useRegex]) // eslint-disable-line react-hooks/exhaustive-deps

  // matches 变化时钳制 currentIndex，并处理单次替换后自动聚焦
  useEffect(() => {
    if (matchCount === 0) {
      pendingFocusRef.current = false
      return
    }
    setCurrentIndex((prev) => {
      const clamped = Math.min(prev, matchCount - 1)
      if (pendingFocusRef.current) {
        pendingFocusRef.current = false
        onMatchFocus?.(matches[clamped].start, matches[clamped].end)
      }
      return clamped
    })
  }, [matches]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = useCallback(() => {
    if (matchCount === 0) return
    const next = (currentIndex + 1) % matchCount
    setCurrentIndex(next)
    onMatchFocus?.(matches[next].start, matches[next].end)
  }, [currentIndex, matchCount, matches, onMatchFocus])

  const handlePrev = useCallback(() => {
    if (matchCount === 0) return
    const prev = (currentIndex - 1 + matchCount) % matchCount
    setCurrentIndex(prev)
    onMatchFocus?.(matches[prev].start, matches[prev].end)
  }, [currentIndex, matchCount, matches, onMatchFocus])

  const handleReplaceSingle = useCallback(() => {
    if (matchCount === 0) return
    const match = matches[currentIndex]
    setPrevText(text)
    const newText = text.substring(0, match.start) + replace + text.substring(match.end)
    pendingFocusRef.current = true
    onReplace(newText)
  }, [text, replace, matchCount, matches, currentIndex, onReplace])

  const handleReplaceAll = useCallback(() => {
    if (!search || matchCount === 0) return
    setPrevText(text)
    // 从后往前替换以保持位置正确
    let newText = text
    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i]
      newText = newText.substring(0, m.start) + replace + newText.substring(m.end)
    }
    onReplace(newText)
  }, [text, search, replace, matchCount, matches, onReplace])

  const handleUndo = useCallback(() => {
    if (prevText === null) return
    onReplace(prevText)
    setPrevText(null)
  }, [prevText, onReplace])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        onClose()
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleNext()
      }
      if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault()
        handlePrev()
      }
    },
    [onClose, handleNext, handlePrev]
  )

  const toggleBtnClass = (active: boolean) =>
    `h-6 w-6 shrink-0 rounded-sm ${active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`

  return (
    <div
      className="absolute top-12 left-2 right-2 z-20 bg-background/95 backdrop-blur-sm rounded-md border border-border/50 p-2 shadow-sm animate-fade-in"
      onKeyDown={handleKeyDown}
    >
      {/* 第一行：搜索 */}
      <div className="flex items-center gap-1.5">
        <div className="flex-1 flex items-center gap-0 h-7 rounded-md border border-border bg-editor focus-within:ring-2 focus-within:ring-ring/30 focus-within:border-primary/50">
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索"
            className="flex-1 h-full px-2 text-sm font-mono bg-transparent text-editor-foreground outline-none min-w-0"
          />
          <div className="flex items-center gap-0.5 pr-1">
            <Tooltip content="区分大小写" position="bottom">
              <button className={toggleBtnClass(caseSensitive)} onClick={() => setCaseSensitive((v) => !v)}>
                <CaseSensitive className="h-3.5 w-3.5 mx-auto" />
              </button>
            </Tooltip>
            <Tooltip content="全字匹配" position="bottom">
              <button className={toggleBtnClass(wholeWord)} onClick={() => setWholeWord((v) => !v)}>
                <WholeWord className="h-3.5 w-3.5 mx-auto" />
              </button>
            </Tooltip>
            <Tooltip content="正则表达式" position="bottom">
              <button className={toggleBtnClass(useRegex)} onClick={() => setUseRegex((v) => !v)}>
                <Regex className="h-3.5 w-3.5 mx-auto" />
              </button>
            </Tooltip>
          </div>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 w-16 text-center">
          {search
            ? matchCount > 0
              ? `${currentIndex + 1}/${matchCount}`
              : "0 结果"
            : ""}
        </span>
        <Tooltip content="上一个 (Shift+Enter)" position="bottom">
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" disabled={matchCount === 0} onClick={handlePrev}>
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
        </Tooltip>
        <Tooltip content="下一个 (Enter)" position="bottom">
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" disabled={matchCount === 0} onClick={handleNext}>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </Tooltip>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* 第二行：替换 */}
      <div className="flex items-center gap-1.5 mt-1.5">
        <div className="flex-1 h-7 rounded-md border border-border bg-editor focus-within:ring-2 focus-within:ring-ring/30 focus-within:border-primary/50">
          <input
            type="text"
            value={replace}
            onChange={(e) => setReplace(e.target.value)}
            placeholder="替换"
            className="w-full h-full px-2 text-sm font-mono bg-transparent text-editor-foreground outline-none"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs shrink-0 px-3"
          disabled={matchCount === 0}
          onClick={handleReplaceSingle}
        >
          替换
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs shrink-0 px-3"
          disabled={matchCount === 0}
          onClick={handleReplaceAll}
        >
          全部替换
        </Button>
        <Tooltip content="还原" position="bottom">
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" disabled={prevText === null} onClick={handleUndo}>
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
        </Tooltip>
      </div>
    </div>
  )
}
