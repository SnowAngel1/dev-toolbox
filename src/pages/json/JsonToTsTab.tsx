import { useState, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { CodeEditor } from "@/components/CodeEditor"
import { Copy, FileDown, Trash2 } from "lucide-react"

// ---- JSON → TypeScript 转换核心逻辑 ----

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^[a-z]/, (c) => c.toUpperCase())
    .replace(/^[^a-zA-Z]/, (c) => "_" + c)
}

function needsQuote(key: string): boolean {
  return !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)
}

function formatKey(key: string): string {
  return needsQuote(key) ? `'${key}'` : key
}

interface InterfaceEntry {
  name: string
  body: string
}

function jsonToTypeScript(data: unknown, rootName: string): string {
  const interfaces: InterfaceEntry[] = []
  const usedNames = new Set<string>()

  function getUniqueName(base: string): string {
    let name = base
    let i = 2
    while (usedNames.has(name)) {
      name = `${base}${i++}`
    }
    usedNames.add(name)
    return name
  }

  function inferType(value: unknown, suggestedName: string): string {
    if (value === null) return "null"
    if (typeof value === "string") return "string"
    if (typeof value === "number") return "number"
    if (typeof value === "boolean") return "boolean"

    if (Array.isArray(value)) {
      return inferArrayType(value, suggestedName)
    }

    if (typeof value === "object") {
      return inferObjectType(value as Record<string, unknown>, suggestedName)
    }

    return "unknown"
  }

  function inferObjectType(obj: Record<string, unknown>, suggestedName: string): string {
    const name = getUniqueName(suggestedName)
    const keys = Object.keys(obj)

    if (keys.length === 0) {
      interfaces.push({ name, body: `interface ${name} {}` })
      return name
    }

    const lines = keys.map((key) => {
      const childName = toPascalCase(key)
      const type = inferType(obj[key], childName)
      return `  ${formatKey(key)}: ${type};`
    })

    interfaces.push({
      name,
      body: `interface ${name} {\n${lines.join("\n")}\n}`,
    })
    return name
  }

  function inferArrayType(arr: unknown[], suggestedName: string): string {
    if (arr.length === 0) return "unknown[]"

    // 收集所有元素的类型
    const primitiveTypes = new Set<string>()
    const objects: Record<string, unknown>[] = []

    for (const item of arr) {
      if (item === null) {
        primitiveTypes.add("null")
      } else if (typeof item === "object" && !Array.isArray(item)) {
        objects.push(item as Record<string, unknown>)
      } else if (Array.isArray(item)) {
        // 嵌套数组简化为 unknown[]
        primitiveTypes.add("unknown[]")
      } else {
        primitiveTypes.add(typeof item)
      }
    }

    const types: string[] = [...primitiveTypes]

    // 如果有对象，合并所有对象的 key 生成一个 interface
    if (objects.length > 0) {
      const itemName = singularize(suggestedName)
      const mergedType = mergeObjects(objects, itemName)
      types.push(mergedType)
    }

    if (types.length === 1) return `${types[0]}[]`
    return `(${types.join(" | ")})[]`
  }

  function singularize(name: string): string {
    // 简单的单数化：如果是 Items → Item
    if (name.endsWith("s") && name.length > 1) {
      return name.slice(0, -1)
    }
    return name + "Item"
  }

  function mergeObjects(objects: Record<string, unknown>[], suggestedName: string): string {
    const name = getUniqueName(suggestedName)

    // 收集所有 key 及其在各对象中的出现次数和类型
    const keyInfo = new Map<string, { types: Set<string>; count: number }>()

    for (const obj of objects) {
      for (const key of Object.keys(obj)) {
        if (!keyInfo.has(key)) {
          keyInfo.set(key, { types: new Set(), count: 0 })
        }
        const info = keyInfo.get(key)!
        info.count++
        const childName = toPascalCase(key)
        info.types.add(inferType(obj[key], childName))
      }
    }

    const lines: string[] = []
    for (const [key, info] of keyInfo) {
      const optional = info.count < objects.length ? "?" : ""
      const typeStr = info.types.size === 1
        ? [...info.types][0]
        : [...info.types].join(" | ")
      lines.push(`  ${formatKey(key)}${optional}: ${typeStr};`)
    }

    interfaces.push({
      name,
      body: `interface ${name} {\n${lines.join("\n")}\n}`,
    })
    return name
  }

  // 入口
  const rootType = inferType(data, rootName)

  // 如果根类型是基本类型，直接输出 type alias
  if (!interfaces.some((i) => i.name === rootType)) {
    return `type ${rootName} = ${rootType};`
  }

  // 将根 interface 放在最前面
  const rootIdx = interfaces.findIndex((i) => i.name === rootType)
  const root = interfaces.splice(rootIdx, 1)[0]

  return [root.body, ...interfaces.map((i) => i.body)].join("\n\n")
}

// ---- 组件 ----

export function JsonToTsTab() {
  const { toast } = useToast()
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [rootName, setRootName] = useState("RootObject")
  const [error, setError] = useState<string | undefined>()
  const [errorLine, setErrorLine] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const doConvert = useCallback(
    (text: string, name: string) => {
      if (!text.trim()) {
        setOutput("")
        setError(undefined)
        setErrorLine(null)
        return
      }
      try {
        const parsed = JSON.parse(text)
        const ts = jsonToTypeScript(parsed, name || "RootObject")
        setOutput(ts)
        setError(undefined)
        setErrorLine(null)
      } catch (e) {
        const msg = e instanceof Error ? e.message : "JSON 解析失败"
        setError(msg)
        setOutput("")
      }
    },
    []
  )

  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doConvert(input, rootName), 300)
    return () => clearTimeout(timerRef.current)
  }, [input, rootName, doConvert])

  const handleCopy = useCallback(() => {
    if (!output) return
    navigator.clipboard.writeText(output).then(() => toast("已复制到剪贴板", "success"))
  }, [output, toast])

  const handleDownload = useCallback(() => {
    if (!output) return
    const blob = new Blob([output], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "types.d.ts"
    a.click()
    URL.revokeObjectURL(url)
    toast("文件已下载", "success")
  }, [output, toast])

  const handleClear = useCallback(() => {
    setInput("")
    setOutput("")
    setError(undefined)
    setErrorLine(null)
  }, [])

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex-1 flex gap-0 min-h-0 p-6 pt-4">
        {/* 输入区 */}
        <div className="flex-1 flex flex-col min-w-0">
          <label className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
            JSON 输入
          </label>
          <CodeEditor
            value={input}
            onChange={setInput}
            placeholder={'粘贴 JSON 内容，将自动生成 TypeScript 类型...\n例如: {"name": "test", "age": 18, "tags": ["a", "b"]}'}
            error={error}
            errorLine={errorLine}
          />
        </div>

        {/* 分隔线 */}
        <div className="w-px bg-border mx-4 shrink-0" />

        {/* 输出区 */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              TypeScript 输出
            </label>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">根类型名:</label>
              <input
                value={rootName}
                onChange={(e) => setRootName(e.target.value)}
                className="h-7 px-2 text-xs rounded-md border border-border bg-background text-foreground outline-none focus:ring-1 focus:ring-ring/30 w-32"
                placeholder="RootObject"
              />
            </div>
          </div>
          <div className="relative flex-1 flex flex-col min-h-0">
            {/* 浮动工具栏 */}
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md border border-border/50 p-1 shadow-sm">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy} title="复制 TypeScript 代码">
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload} title="下载为 .d.ts 文件">
                <FileDown className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-4 bg-border" />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClear} title="清空">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <CodeEditor value={output} readOnly placeholder="TypeScript 类型将显示在这里..." />
          </div>
        </div>
      </div>
    </div>
  )
}
