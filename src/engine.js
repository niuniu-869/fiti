/**
 * FiTI 评分引擎 — 纯函数，无 DOM 依赖
 *
 * 相对 SBTI 的泛化点：
 * 1. 每题可同时测量多个维度：`q.dims[]`（兼容 `q.dim` 字符串）
 * 2. 阈值支持动态计算：按维度被测次数 n 推出 L/H 阈值
 * 3. Pattern 支持 `"H-H-H-H-L-H-H-H-L-L-L-H"` 或 SBTI 式连写
 * 4. maxDistance 从 `dimensions.order.length * 2` 推导
 */

const LEVEL_NUM = { L: 1, M: 2, H: 3 }

/** 兼容 q.dim (字符串) 和 q.dims (数组) */
function questionDims(q) {
  if (Array.isArray(q.dims)) return q.dims
  if (q.dim) return [q.dim]
  return []
}

/**
 * 按维度求和：每道题的分值累加到它测量的每一个维度
 * @param {Object} answers    { q1: 2, q2: 3, ... }
 * @param {Array}  questions  题目数组（main）
 * @returns {Object} { FOCUS: 5, MEMORY: 10, ... }
 */
export function calcDimensionScores(answers, questions) {
  const scores = {}
  for (const q of questions) {
    const v = answers[q.id]
    if (v == null) continue
    for (const dim of questionDims(q)) {
      scores[dim] = (scores[dim] || 0) + v
    }
  }
  return scores
}

/**
 * 统计每个维度被多少道题测量
 */
export function countDimensionHits(questions) {
  const hits = {}
  for (const q of questions) {
    for (const dim of questionDims(q)) {
      hits[dim] = (hits[dim] || 0) + 1
    }
  }
  return hits
}

/**
 * 原始分 → L/M/H 等级（动态阈值版）
 * 规则（来自 FinanceTI 评分标准）：
 *   minScore = n × 1
 *   maxScore = n × 3
 *   lowThreshold  = minScore + floor(n × ratio)
 *   highThreshold = maxScore - floor(n × ratio)
 *   score ≤ lowThreshold  → L
 *   score ≥ highThreshold → H
 *   其他 → M
 *
 * @param {Object} scores   维度原始分
 * @param {Object} hits     每维被测次数
 * @param {number} ratio    默认 0.5
 * @returns {Object} { FOCUS: 'H', ... }
 */
export function scoresToLevels(scores, hits, ratio = 0.5) {
  const levels = {}
  for (const [dim, score] of Object.entries(scores)) {
    const n = hits[dim] || 1
    const minScore = n * 1
    const maxScore = n * 3
    const low = minScore + Math.floor(n * ratio)
    const high = maxScore - Math.floor(n * ratio)
    if (score <= low) levels[dim] = 'L'
    else if (score >= high) levels[dim] = 'H'
    else levels[dim] = 'M'
  }
  return levels
}

/**
 * 解析 pattern 字符串，兼容两种格式：
 *   "H-H-H-H-L-H-H-H-L-L-L-H" → ['H','H','H','H','L','H','H','H','L','L','L','H']
 *   "HHH-HMH-MHH-HHH"         → 去掉横杠拆字符
 */
export function parsePattern(pattern) {
  if (!pattern) return []
  const parts = pattern.split('-')
  // 如果每段都是单字符，认为是 "H-H-H..." 新格式
  if (parts.every((p) => p.length === 1)) return parts
  // 否则按 SBTI 旧格式，去掉分隔符逐字符拆
  return pattern.replace(/-/g, '').split('')
}

/**
 * 计算用户向量与类型 pattern 的曼哈顿距离
 */
export function matchType(userLevels, dimOrder, pattern) {
  const typeLevels = parsePattern(pattern)
  const maxDistance = dimOrder.length * 2
  let distance = 0
  let exact = 0

  for (let i = 0; i < dimOrder.length; i++) {
    const userVal = LEVEL_NUM[userLevels[dimOrder[i]]] || 2
    const typeVal = LEVEL_NUM[typeLevels[i]] || 2
    const diff = Math.abs(userVal - typeVal)
    distance += diff
    if (diff === 0) exact++
  }

  const similarity = Math.max(0, Math.round((1 - distance / maxDistance) * 100))
  return { distance, exact, similarity, maxDistance }
}

/**
 * 匹配所有类型，排序，应用 FALLBACK 兜底
 * @param {Object}  userLevels
 * @param {Array}   dimOrder
 * @param {Array}   standardTypes
 * @param {Array}   specialTypes
 * @param {Object}  options   { fallbackThreshold: 45, showSecondary: true }
 */
export function determineResult(userLevels, dimOrder, standardTypes, specialTypes = [], options = {}) {
  const { fallbackThreshold = 45, showSecondary = true } = options

  const rankings = standardTypes.map((type) => ({
    ...type,
    ...matchType(userLevels, dimOrder, type.pattern),
  }))

  // 排序：距离升序 → 精准命中降序 → 相似度降序
  rankings.sort(
    (a, b) => a.distance - b.distance || b.exact - a.exact || b.similarity - a.similarity,
  )

  const best = rankings[0]
  const fallback = specialTypes.find((t) => t.code === 'FALLBACK')

  // 兜底
  if (best && best.similarity < fallbackThreshold && fallback) {
    return {
      primary: { ...fallback, similarity: best.similarity, exact: best.exact, distance: best.distance },
      secondary: showSecondary ? best : null,
      rankings,
      mode: 'fallback',
    }
  }

  return {
    primary: best,
    secondary: showSecondary ? rankings[1] || null : null,
    rankings,
    mode: 'normal',
  }
}
