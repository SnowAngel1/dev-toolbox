import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { X, ArrowRight, Undo2, ChevronUp, ChevronDown } from "lucide-react"

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

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  const matches = useMemo(() => {
    if (!search) return []
    const result: { start: number; end: number }[] = []
    let pos = 0
    while ((pos = text.indexOf(search, pos)) !== -1) {
      result.push({ start: pos, end: pos + search.length })
      pos += search.length
    }
    return result
  }, [text, search])

  const matchCount = matches.length

  // 搜索词变化时重置 currentIndex 并聚焦第一个匹配
  useEffect(() => {
    setCurrentIndex(0)
    if (matches.length > 0) {
      onMatchFocus?.(matches[0].start, matches[0].end)
    }
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

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
    const newText = text.split(search).join(replace)
    onReplace(newText)
  }, [text, search, replace, matchCount, onReplace])

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
      if (e.key === "Enter") {
        e.preventDefault()
        handleReplaceAll()
      }
      if (e.key === "ArrowDown") {
        e.preventDefault()
        handleNext()
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        handlePrev()
      }
    },
    [onClose, handleReplaceAll, handleNext, handlePrev]
  )

  return (
    <div
      className="absolute top-12 left-2 right-2 z-20 flex items-center gap-2 bg-background/95 backdrop-blur-sm rounded-md border border-border/50 p-2 shadow-sm animate-fade-in"
      onKeyDown={handleKeyDown}
    >
      <input
        ref={searchRef}
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜索内容"
        className="flex-1 h-7 px-2 text-sm font-mono rounded-md border border-border bg-editor text-editor-foreground outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary/50"
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        disabled={matchCount === 0}
        onClick={handlePrev}
        title="上一个"
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        disabled={matchCount === 0}
        onClick={handleNext}
        title="下一个"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <input
        type="text"
        value={replace}
        onChange={(e) => setReplace(e.target.value)}
        placeholder="替换内容"
        className="flex-1 h-7 px-2 text-sm font-mono rounded-md border border-border bg-editor text-editor-foreground outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary/50"
      />
      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
        {search
          ? matchCount > 0
            ? `${currentIndex + 1}/${matchCount} 匹配`
            : "0 匹配"
          : ""}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs shrink-0"
        disabled={matchCount === 0}
        onClick={handleReplaceSingle}
      >
        替换
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs shrink-0"
        disabled={matchCount === 0}
        onClick={handleReplaceAll}
      >
        全部替换
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        disabled={prevText === null}
        onClick={handleUndo}
        title="还原"
      >
        <Undo2 className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={onClose}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
