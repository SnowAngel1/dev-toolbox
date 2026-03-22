import { useState, useRef, type ReactNode } from "react"

interface TooltipProps {
  content: string
  children: ReactNode
  delay?: number
}

export function Tooltip({ content, children, delay = 200 }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState<"top" | "bottom">("top")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const show = () => {
    timerRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        setPosition(rect.top < 50 ? "bottom" : "top")
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
          className={`absolute left-1/2 -translate-x-1/2 z-50 px-2 py-1 text-xs rounded-md whitespace-nowrap bg-foreground text-background shadow-md pointer-events-none ${
            position === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
        >
          {content}
        </div>
      )}
    </div>
  )
}
