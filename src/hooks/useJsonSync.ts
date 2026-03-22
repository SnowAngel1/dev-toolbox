import { useState, useCallback, useRef } from "react"
import { useDebouncedCallback } from "./useDebounce"

const SYNC_DELAY = 300

/** 从 JSON.parse 错误信息中提取字符位置，再根据文本计算行号（1-based） */
function parseErrorLine(errorMsg: string, text: string): number | null {
  // V8 新格式: "... at position 42 (line 3 column 5)"
  const lineMatch = errorMsg.match(/\(line (\d+)/)
  if (lineMatch) return parseInt(lineMatch[1], 10)

  // V8 旧格式: "... at position 42"
  const posMatch = errorMsg.match(/at position (\d+)/)
  if (posMatch) {
    const pos = parseInt(posMatch[1], 10)
    const before = text.substring(0, pos)
    return before.split("\n").length
  }

  // Firefox: "... at line 3 column 5"
  const ffMatch = errorMsg.match(/at line (\d+)/)
  if (ffMatch) return parseInt(ffMatch[1], 10)

  return null
}

/** 将 JSON.parse 英文错误翻译为中文 */
function translateJsonError(msg: string): string {
  if (/Unexpected end of JSON input/.test(msg)) return "JSON 不完整，输入意外结束"
  if (/Unexpected token/.test(msg)) {
    const m = msg.match(/Unexpected token\s+'?(.+?)'?\s*,?\s*/)
    const token = m?.[1] || ""
    return `遇到意外的字符 '${token}'`
  }
  if (/Expected property name/.test(msg)) return "期望属性名称（key 必须用双引号包裹）"
  if (/Expected ',' or '}'/.test(msg)) return "期望 ',' 或 '}'"
  if (/Expected ',' or ']'/.test(msg)) return "期望 ',' 或 ']'"
  if (/Expected double-quoted property name/.test(msg)) return "属性名称必须用双引号包裹"
  if (/Bad control character/.test(msg)) return "包含非法控制字符"
  if (/Bad string/.test(msg)) return "字符串格式错误"
  if (/Bad number/.test(msg)) return "数字格式错误"
  if (/Bad escaped character/.test(msg)) return "包含非法转义字符"
  if (/Unexpected non-whitespace/.test(msg)) return "JSON 值之后存在多余内容"
  // 兜底：保留原文
  return msg
}

interface JsonSyncResult {
  input: string
  output: string
  parsedJson: unknown | null
  error: string
  errorLine: number | null
  /** 标记错误来源在哪个编辑器 */
  errorSource: "input" | "output" | null
  handleInputChange: (text: string) => void
  handleOutputChange: (text: string) => void
  handleFormat: () => void
  handleCompress: () => void
  handleClear: () => void
  /** 转义：把特殊字符转成转义序列 */
  handleEscape: () => void
  /** 反转义：把转义序列还原成实际字符 */
  handleUnescape: () => void
  /** 字符串化：把 JSON 包装成 JSON 字符串 */
  handleStringify: () => void
  /** 反字符串化：解包 JSON 字符串 */
  handleUnstringify: () => void
  /** 树编辑：直接更新 parsedJson 和 output */
  handleTreeEdit: (updatedJson: unknown) => void
}

export function useJsonSync(
  onSuccess?: (msg: string) => void,
  onError?: (msg: string) => void
): JsonSyncResult {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [parsedJson, setParsedJson] = useState<unknown | null>(null)
  const [error, setError] = useState("")
  const [errorLine, setErrorLine] = useState<number | null>(null)
  const [errorSource, setErrorSource] = useState<"input" | "output" | null>(null)

  const isSyncingRef = useRef(false)

  const setErrorState = (msg: string, text: string, source: "input" | "output") => {
    const translated = translateJsonError(msg)
    setError(translated)
    setErrorLine(parseErrorLine(msg, text))
    setErrorSource(source)
  }

  const clearError = () => {
    setError("")
    setErrorLine(null)
    setErrorSource(null)
  }

  // Input → Output: parse input, format to output
  const [syncInputToOutput, cancelInputSync] = useDebouncedCallback(
    (text: string) => {
      if (!text.trim()) {
        setParsedJson(null)
        setOutput("")
        clearError()
        return
      }
      try {
        const parsed = JSON.parse(text)
        isSyncingRef.current = true
        setParsedJson(parsed)
        setOutput(JSON.stringify(parsed, null, 2))
        clearError()
        requestAnimationFrame(() => {
          isSyncingRef.current = false
        })
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Invalid JSON"
        setErrorState(msg, text, "input")
      }
    },
    SYNC_DELAY
  )

  // Output → Input: parse output, format to input
  const [syncOutputToInput, cancelOutputSync] = useDebouncedCallback(
    (text: string) => {
      if (!text.trim()) {
        setParsedJson(null)
        setInput("")
        clearError()
        return
      }
      try {
        const parsed = JSON.parse(text)
        isSyncingRef.current = true
        setParsedJson(parsed)
        setInput(JSON.stringify(parsed, null, 2))
        clearError()
        requestAnimationFrame(() => {
          isSyncingRef.current = false
        })
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Invalid JSON"
        setErrorState(msg, text, "output")
      }
    },
    SYNC_DELAY
  )

  const handleInputChange = useCallback(
    (text: string) => {
      setInput(text)
      if (isSyncingRef.current) return
      cancelOutputSync()
      syncInputToOutput(text)
    },
    [syncInputToOutput, cancelOutputSync]
  )

  const handleOutputChange = useCallback(
    (text: string) => {
      setOutput(text)
      if (isSyncingRef.current) return
      cancelInputSync()
      syncOutputToInput(text)
    },
    [syncOutputToInput, cancelInputSync]
  )

  // 以下操作均针对 output
  const handleFormat = useCallback(() => {
    cancelInputSync()
    cancelOutputSync()
    // 优先从输出区读取，为空则从输入区读取
    const source = output.trim() ? output : input
    if (!source.trim()) {
      setError("没有可格式化的内容")
      setErrorLine(null)
      setErrorSource(null)
      return
    }
    try {
      const parsed = JSON.parse(source)
      const formatted = JSON.stringify(parsed, null, 2)
      setParsedJson(parsed)
      isSyncingRef.current = true
      setOutput(formatted)
      clearError()
      requestAnimationFrame(() => { isSyncingRef.current = false })
      onSuccess?.("JSON 格式化成功")
    } catch (e) {
      const msg = e instanceof Error ? e.message : "无效的 JSON"
      const errorSrc = output.trim() ? "output" : "input"
      setErrorState(msg, source, errorSrc)
      onError?.("JSON 格式错误")
    }
  }, [input, output, cancelInputSync, cancelOutputSync, onSuccess, onError])

  const handleCompress = useCallback(() => {
    cancelInputSync()
    cancelOutputSync()
    const source = output.trim() ? output : input
    if (!source.trim()) {
      setError("没有可压缩的内容")
      setErrorLine(null)
      setErrorSource(null)
      return
    }
    try {
      const parsed = JSON.parse(source)
      const compressed = JSON.stringify(parsed)
      setParsedJson(parsed)
      isSyncingRef.current = true
      setOutput(compressed)
      clearError()
      requestAnimationFrame(() => { isSyncingRef.current = false })
      onSuccess?.("JSON 压缩成功")
    } catch (e) {
      const msg = e instanceof Error ? e.message : "无效的 JSON"
      const errorSrc = output.trim() ? "output" : "input"
      setErrorState(msg, source, errorSrc)
      onError?.("JSON 格式错误")
    }
  }, [input, output, cancelInputSync, cancelOutputSync, onSuccess, onError])

  const handleClear = useCallback(() => {
    cancelInputSync()
    cancelOutputSync()
    setInput("")
    setOutput("")
    setParsedJson(null)
    clearError()
  }, [cancelInputSync, cancelOutputSync])

  // 转义：把特殊字符转成转义序列（\n, \t, \", \\）
  const handleEscape = useCallback(() => {
    cancelInputSync()
    cancelOutputSync()
    if (!output.trim()) {
      setError("输出区没有内容")
      setErrorLine(null)
      setErrorSource(null)
      return
    }
    const escaped = output
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t")
      .replace(/"/g, '\\"')
    setOutput(escaped)
    isSyncingRef.current = true
    setInput(escaped)
    clearError()
    requestAnimationFrame(() => { isSyncingRef.current = false })
    onSuccess?.("转义成功")
  }, [output, cancelInputSync, cancelOutputSync, onSuccess])

  // 反转义：把转义序列还原成实际字符
  const handleUnescape = useCallback(() => {
    cancelInputSync()
    cancelOutputSync()
    if (!output.trim()) {
      setError("输出区没有内容")
      setErrorLine(null)
      setErrorSource(null)
      return
    }
    try {
      // 尝试用 JSON.parse 解析字符串来处理转义
      const unescaped = JSON.parse(`"${output.replace(/^"|"$/g, "")}"`)
      setOutput(unescaped)
      isSyncingRef.current = true
      setInput(unescaped)
      clearError()
      requestAnimationFrame(() => { isSyncingRef.current = false })
      onSuccess?.("反转义成功")
    } catch {
      // 手动处理常见转义序列
      const unescaped = output
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\")
      setOutput(unescaped)
      isSyncingRef.current = true
      setInput(unescaped)
      clearError()
      requestAnimationFrame(() => { isSyncingRef.current = false })
      onSuccess?.("反转义成功")
    }
  }, [output, cancelInputSync, cancelOutputSync, onSuccess])

  // 字符串化：把整个内容包装成 JSON 字符串
  const handleStringify = useCallback(() => {
    cancelInputSync()
    cancelOutputSync()
    if (!output.trim()) {
      setError("输出区没有内容")
      setErrorLine(null)
      setErrorSource(null)
      return
    }
    const stringified = JSON.stringify(output)
    setOutput(stringified)
    isSyncingRef.current = true
    setInput(stringified)
    clearError()
    requestAnimationFrame(() => { isSyncingRef.current = false })
    onSuccess?.("字符串化成功")
  }, [output, cancelInputSync, cancelOutputSync, onSuccess])

  // 反字符串化：解包 JSON 字符串
  const handleUnstringify = useCallback(() => {
    cancelInputSync()
    cancelOutputSync()
    if (!output.trim()) {
      setError("输出区没有内容")
      setErrorLine(null)
      setErrorSource(null)
      return
    }
    try {
      const parsed = JSON.parse(output)
      if (typeof parsed !== "string") {
        setError("内容不是一个 JSON 字符串")
        setErrorLine(null)
        setErrorSource(null)
        onError?.("内容不是字符串")
        return
      }
      setOutput(parsed)
      isSyncingRef.current = true
      setInput(parsed)
      clearError()
      requestAnimationFrame(() => { isSyncingRef.current = false })
      onSuccess?.("反字符串化成功")
    } catch (e) {
      const msg = e instanceof Error ? e.message : "解析失败"
      setErrorState(msg, output, "output")
      onError?.("反字符串化失败")
    }
  }, [output, cancelInputSync, cancelOutputSync, onSuccess, onError])

  // 树编辑：直接更新 parsedJson、output 和 input，不触发 debounced sync
  const handleTreeEdit = useCallback((updatedJson: unknown) => {
    cancelInputSync()
    cancelOutputSync()
    isSyncingRef.current = true
    setParsedJson(updatedJson)
    setOutput(JSON.stringify(updatedJson, null, 2))
    setInput(JSON.stringify(updatedJson, null, 2))
    clearError()
    requestAnimationFrame(() => { isSyncingRef.current = false })
  }, [cancelInputSync, cancelOutputSync])

  return {
    input,
    output,
    parsedJson,
    error,
    errorLine,
    errorSource,
    handleInputChange,
    handleOutputChange,
    handleFormat,
    handleCompress,
    handleClear,
    handleEscape,
    handleUnescape,
    handleStringify,
    handleUnstringify,
    handleTreeEdit,
  }
}
