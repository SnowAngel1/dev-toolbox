import { useRef, useCallback, useEffect } from "react"

export function useDebouncedCallback<T extends (...args: never[]) => void>(
  callback: T,
  delay: number
): [(...args: Parameters<T>) => void, () => void] {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const debouncedFn = useCallback(
    (...args: Parameters<T>) => {
      cancel()
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args)
        timerRef.current = null
      }, delay)
    },
    [delay, cancel]
  )

  useEffect(() => cancel, [cancel])

  return [debouncedFn, cancel]
}
