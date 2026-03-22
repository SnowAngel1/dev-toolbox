export interface JsonToken {
  type:
    | "key"
    | "string"
    | "number"
    | "boolean"
    | "null"
    | "bracket"
    | "punctuation"
    | "fold-indicator"
  text: string
}

export interface JsonLine {
  lineNumber: number
  indent: number
  tokens: JsonToken[]
  path?: string
  foldable: boolean
  folded: boolean
  /** 可编辑值的路径 */
  valuePath?: string
  /** 原始值（用于编辑） */
  rawValue?: unknown
}

function makeToken(
  type: JsonToken["type"],
  text: string
): JsonToken {
  return { type, text }
}

function valueTokens(value: unknown): JsonToken[] {
  if (value === null) return [makeToken("null", "null")]
  if (typeof value === "boolean") return [makeToken("boolean", String(value))]
  if (typeof value === "number") return [makeToken("number", String(value))]
  if (typeof value === "string")
    return [makeToken("string", JSON.stringify(value))]
  return []
}


export function flattenJsonToLines(
  data: unknown,
  foldedPaths: Set<string>
): JsonLine[] {
  const lines: JsonLine[] = []
  let lineNum = 1

  function pushLine(
    indent: number,
    tokens: JsonToken[],
    opts?: { path?: string; foldable?: boolean; folded?: boolean; valuePath?: string; rawValue?: unknown }
  ) {
    lines.push({
      lineNumber: lineNum++,
      indent,
      tokens,
      path: opts?.path,
      foldable: opts?.foldable ?? false,
      folded: opts?.folded ?? false,
      valuePath: opts?.valuePath,
      rawValue: opts?.rawValue,
    })
  }

  function processValue(
    value: unknown,
    indent: number,
    path: string,
    isLast: boolean
  ) {
    const comma = isLast ? [] : [makeToken("punctuation", ",")]

    if (value === null || typeof value !== "object") {
      pushLine(indent, [...valueTokens(value), ...comma], { valuePath: path, rawValue: value })
      return
    }

    const isArray = Array.isArray(value)
    const openBracket = isArray ? "[" : "{"
    const closeBracket = isArray ? "]" : "}"
    const entries = isArray
      ? value.map((v, i) => [String(i), v] as const)
      : Object.entries(value as Record<string, unknown>)
    const isFoldable = entries.length > 0
    const isFolded = isFoldable && foldedPaths.has(path)

    if (isFolded) {
      // Collapsed: { ...3 items } or [ ...3 items ]
      const count = entries.length
      const label = `${count} ${isArray ? "items" : "properties"}`
      pushLine(
        indent,
        [
          makeToken("bracket", openBracket),
          makeToken("fold-indicator", ` ...${label} `),
          makeToken("bracket", closeBracket),
          ...comma,
        ],
        { path, foldable: true, folded: true }
      )
      return
    }

    // Open bracket line
    pushLine(indent, [makeToken("bracket", openBracket)], {
      path,
      foldable: isFoldable,
      folded: false,
    })

    // Children
    entries.forEach(([key, val], idx) => {
      const childPath = isArray ? `${path}[${key}]` : `${path}.${key}`
      const childIsLast = idx === entries.length - 1

      if (!isArray) {
        // Object property: render key on the same line as value (if primitive)
        if (val === null || typeof val !== "object") {
          const childComma = childIsLast
            ? []
            : [makeToken("punctuation", ",")]
          pushLine(indent + 1, [
            makeToken("key", JSON.stringify(key)),
            makeToken("punctuation", ": "),
            ...valueTokens(val),
            ...childComma,
          ], { valuePath: childPath, rawValue: val })
        } else {
          // Key + open bracket on same line for nested objects/arrays
          const nestedIsArray = Array.isArray(val)
          const nestedOpen = nestedIsArray ? "[" : "{"
          const nestedClose = nestedIsArray ? "]" : "}"
          const nestedEntries = nestedIsArray
            ? (val as unknown[]).map((v, i) => [String(i), v] as const)
            : Object.entries(val as Record<string, unknown>)
          const nestedFoldable = nestedEntries.length > 0
          const nestedFolded =
            nestedFoldable && foldedPaths.has(childPath)

          if (nestedFolded) {
            const count = nestedEntries.length
            const label = `${count} ${nestedIsArray ? "items" : "properties"}`
            const childComma = childIsLast
              ? []
              : [makeToken("punctuation", ",")]
            pushLine(
              indent + 1,
              [
                makeToken("key", JSON.stringify(key)),
                makeToken("punctuation", ": "),
                makeToken("bracket", nestedOpen),
                makeToken("fold-indicator", ` ...${label} `),
                makeToken("bracket", nestedClose),
                ...childComma,
              ],
              { path: childPath, foldable: true, folded: true }
            )
          } else {
            // Key + open bracket
            pushLine(
              indent + 1,
              [
                makeToken("key", JSON.stringify(key)),
                makeToken("punctuation", ": "),
                makeToken("bracket", nestedOpen),
              ],
              { path: childPath, foldable: nestedFoldable, folded: false }
            )
            // Render children
            nestedEntries.forEach(([nKey, nVal], nIdx) => {
              const nChildPath = nestedIsArray
                ? `${childPath}[${nKey}]`
                : `${childPath}.${nKey}`
              const nChildIsLast = nIdx === nestedEntries.length - 1
              processValue(nVal, indent + 2, nChildPath, nChildIsLast)
            })
            // Close bracket
            const childComma = childIsLast
              ? []
              : [makeToken("punctuation", ",")]
            pushLine(indent + 1, [
              makeToken("bracket", nestedClose),
              ...childComma,
            ])
          }
        }
      } else {
        // Array element
        processValue(val, indent + 1, childPath, childIsLast)
      }
    })

    // Close bracket line
    pushLine(indent, [makeToken("bracket", closeBracket), ...comma])
  }

  processValue(data, 0, "$", true)
  return lines
}

export function collectAllFoldablePaths(
  data: unknown,
  path = "$"
): string[] {
  const paths: string[] = []
  if (data === null || typeof data !== "object") return paths

  const isArray = Array.isArray(data)
  const entries = isArray
    ? data.map((v, i) => [String(i), v] as const)
    : Object.entries(data as Record<string, unknown>)

  if (entries.length > 0) {
    paths.push(path)
  }

  entries.forEach(([key, val]) => {
    const childPath = isArray ? `${path}[${key}]` : `${path}.${key}`
    paths.push(...collectAllFoldablePaths(val, childPath))
  })

  return paths
}

export function getValueAtPath(data: unknown, path: string): unknown {
  if (path === "$") return data
  const rest = path.startsWith("$.") ? path.slice(2) : path.slice(1)
  const segments = parsePathSegments(rest)

  let current: unknown = data
  for (const seg of segments) {
    if (current === null || typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[String(seg)]
  }
  return current
}

/** 解析路径字符串为段数组 */
function parsePathSegments(rest: string): (string | number)[] {
  const segments: (string | number)[] = []
  let i = 0
  while (i < rest.length) {
    if (rest[i] === "[") {
      const end = rest.indexOf("]", i)
      segments.push(Number(rest.slice(i + 1, end)))
      i = end + 1
      if (rest[i] === ".") i++
    } else {
      const dotIdx = rest.indexOf(".", i)
      const bracketIdx = rest.indexOf("[", i)
      let end: number
      if (dotIdx === -1 && bracketIdx === -1) end = rest.length
      else if (dotIdx === -1) end = bracketIdx
      else if (bracketIdx === -1) end = dotIdx
      else end = Math.min(dotIdx, bracketIdx)
      segments.push(rest.slice(i, end))
      i = end
      if (rest[i] === ".") i++
    }
  }
  return segments
}

/** 在指定路径设置新值，返回深拷贝后的新数据 */
export function setValueAtPath(data: unknown, path: string, newValue: unknown): unknown {
  if (path === "$") return newValue
  const rest = path.startsWith("$.") ? path.slice(2) : path.slice(1)
  const segments = parsePathSegments(rest)
  const cloned = JSON.parse(JSON.stringify(data))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = cloned
  for (let i = 0; i < segments.length - 1; i++) {
    current = current[segments[i]]
  }
  current[segments[segments.length - 1]] = newValue
  return cloned
}
