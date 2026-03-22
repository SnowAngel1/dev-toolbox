/** 兼容 HTTP 环境的剪贴板复制 */
export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text)
  }
  // fallback: 使用 textarea + execCommand
  return new Promise((resolve, reject) => {
    try {
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.style.position = "fixed"
      textarea.style.left = "-9999px"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      resolve()
    } catch (e) {
      reject(e)
    }
  })
}
