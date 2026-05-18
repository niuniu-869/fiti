/**
 * 工具函数集
 */

export function shuffle(array) {
  const arr = array.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

/** 安全设置 textContent，null/undefined 显示为空串 */
export function setText(el, text) {
  if (!el) return
  el.textContent = text == null ? '' : String(text)
}

/** 创建带类名的元素 */
export function el(tag, className, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text != null) node.textContent = text
  return node
}

/** 媒介查询：是否移动端 */
export function isMobile() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 640px)').matches
}

/** 节流，用于 resize 事件 */
export function throttle(fn, wait = 120) {
  let timer = null
  let lastArgs = null
  return function throttled(...args) {
    lastArgs = args
    if (timer) return
    timer = setTimeout(() => {
      fn(...lastArgs)
      timer = null
    }, wait)
  }
}

/** 加载 JSON（相对模块 URL） */
export async function loadJSON(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`)
  return res.json()
}

/**
 * 配图 URL：BASE_URL + cfg/<kind>/<name>.webp
 * kind 为 'q'（题图）或 'type'（人格图）
 */
export function cfgImg(kind, name) {
  return `${import.meta.env.BASE_URL}cfg/${kind}/${name}.webp`
}

/**
 * 人格 code → 配图文件名 slug（须与 _configgen 生成脚本保持一致）
 * 例：'QUANT_MONK' → 'quant_monk'
 */
export function typeSlug(code) {
  return String(code).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'x'
}
