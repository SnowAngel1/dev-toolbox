import { useState, useEffect, useRef, type Dispatch, type SetStateAction } from "react"

const PREFIX = "devtoolbox:"

/**
 * Like useState, but persists the value to localStorage.
 * On first render, reads from localStorage; on every change, writes back.
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const storageKey = PREFIX + key

  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored !== null) {
        return JSON.parse(stored)
      }
    } catch {
      // ignore parse errors
    }
    return defaultValue
  })

  // Track whether this is the initial render to avoid writing the default back
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(state))
    } catch {
      // ignore quota errors
    }
  }, [storageKey, state])

  return [state, setState]
}
