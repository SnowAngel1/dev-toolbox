import { parse, stringify, LosslessNumber } from "lossless-json"

// value/isLosslessNumber 默认是可枚举的，会被 JSONPath 的 $..* 和 js-yaml 当成普通对象遍历，
// 这里隐藏内部字段，让其他库把它视为数字标量
class NonEnumerableLosslessNumber extends LosslessNumber {
  constructor(value: string) {
    super(value)
    Object.defineProperty(this, "value", {
      value,
      enumerable: false,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(this, "isLosslessNumber", {
      value: true,
      enumerable: false,
      writable: true,
      configurable: true,
    })
  }
}

export function createLosslessNumber(value: string): LosslessNumber {
  return new NonEnumerableLosslessNumber(value)
}

// 数字以 LosslessNumber 保留原始字面量，避免超出 Number.MAX_SAFE_INTEGER 时精度丢失
export function parseJson(text: string): unknown {
  return parse(text, null, {
    parseNumber: createLosslessNumber,
    // 与 JSON.parse 行为一致：重复 key 以最后一个为准
    onDuplicateKey: ({ newValue }) => newValue,
  })
}

export function stringifyJson(value: unknown, space?: number): string {
  return stringify(value, null, space) ?? ""
}

export function cloneJson<T>(value: T): T {
  return parseJson(stringifyJson(value)) as T
}
