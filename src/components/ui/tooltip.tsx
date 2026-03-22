import { useState, useRef, type ReactNode } from "react"

interface TooltipProps {
  content: string
  children: ReactNode
  delay?: number
  position?: "top" | "bottom"
}

export function Tooltip({ content, children, delay = 200, position: fixedPosition }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [autoPosition, setAutoPosition] = useState<"top" | "bottom">("bottom")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const pos = fixedPosition ?? autoPosition

  const show = () => {
    timerRef.current = setTimeout(() => {
      if (!fixedPosition && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        const viewH = window.innerHeight
        setAutoPosition(viewH - rect.bottom < 40 ? "top" : "bottom")
      }
      setVisible(true)
    }, delay)
  }

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
  }

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 z-50 px-2.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap bg-foreground text-background shadow-lg pointer-events-none ${
            pos === "top" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {content}
        </div>
      )}
    </div>
  )
}
