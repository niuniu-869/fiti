/**
 * 分享海报生成：Canvas 离屏绘制，输出 PNG dataURL
 *
 * 布局（1080 × 1920，padding 80）：
 *   顶栏：FiTI logo + 副标题 + 身份
 *   人格区：大字中文名 + 标题 + 稀有度/绝技/相似度芯片
 *   金句区：带装饰引号的 roast 斜体
 *   雷达区：520×520 居中
 *   CP 区：最佳搭档 / 最怕遇到 两栏
 *   底栏：二维码 200×200 + URL 水印
 */

import QRCode from 'qrcode'

const LEVEL_RADIUS = { L: 1 / 3, M: 2 / 3, H: 1 }
const SITE_URL = 'https://niuniu-869.github.io/fiti/'

const IDENTITY_LABEL = {
  intern: '在校生 / 实习中',
  junior: '刚工作 1-3 年',
  senior: '工作 3 年以上',
}

/** 把文字按最大宽度折行（Canvas 无内置文本换行） */
function wrapLines(ctx, text, maxWidth) {
  const lines = []
  let cur = ''
  for (const ch of text) {
    const test = cur + ch
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur)
      cur = ch
    } else {
      cur = test
    }
    if (ch === '\n') {
      lines.push(cur.slice(0, -1))
      cur = ''
    }
  }
  if (cur) lines.push(cur)
  return lines
}

/** 雷达图离屏绘制（不依赖 DPR 与 DOM） */
function drawRadar(ctx, cx, cy, radius, dimOrder, levels, defs) {
  const N = dimOrder.length
  if (!N) return

  ctx.save()
  // 三圈网格
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'
  ctx.lineWidth = 1
  for (let r = 1; r <= 3; r++) {
    const rr = (radius * r) / 3
    ctx.beginPath()
    for (let i = 0; i < N; i++) {
      const angle = (Math.PI * 2 * i) / N - Math.PI / 2
      const x = cx + Math.cos(angle) * rr
      const y = cy + Math.sin(angle) * rr
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.stroke()
  }

  // 轴线
  for (let i = 0; i < N; i++) {
    const angle = (Math.PI * 2 * i) / N - Math.PI / 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius)
    ctx.stroke()
  }

  // 多边形
  ctx.beginPath()
  for (let i = 0; i < N; i++) {
    const angle = (Math.PI * 2 * i) / N - Math.PI / 2
    const lv = levels[dimOrder[i]] || 'M'
    const rr = radius * (LEVEL_RADIUS[lv] ?? 2 / 3)
    const x = cx + Math.cos(angle) * rr
    const y = cy + Math.sin(angle) * rr
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = 'rgba(212,169,87,0.22)'
  ctx.fill()
  ctx.strokeStyle = '#d4a957'
  ctx.lineWidth = 2.5
  ctx.stroke()

  // 顶点
  for (let i = 0; i < N; i++) {
    const angle = (Math.PI * 2 * i) / N - Math.PI / 2
    const lv = levels[dimOrder[i]] || 'M'
    const rr = radius * (LEVEL_RADIUS[lv] ?? 2 / 3)
    const x = cx + Math.cos(angle) * rr
    const y = cy + Math.sin(angle) * rr
    const vertexR = lv === 'H' ? 6 : lv === 'L' ? 4 : 5
    ctx.fillStyle =
      lv === 'H' ? '#d4a957' : lv === 'L' ? '#4dd6d0' : 'rgba(245,236,214,0.85)'
    ctx.beginPath()
    ctx.arc(x, y, vertexR, 0, Math.PI * 2)
    ctx.fill()
    if (lv === 'H') {
      ctx.strokeStyle = '#d4a957'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, y, vertexR + 3.5, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  // 标签
  const fontSize = Math.max(14, Math.round(radius * 0.11))
  ctx.font = `${fontSize}px -apple-system, "Microsoft YaHei", sans-serif`
  ctx.textBaseline = 'middle'
  for (let i = 0; i < N; i++) {
    const angle = (Math.PI * 2 * i) / N - Math.PI / 2
    const def = defs[dimOrder[i]] || { name: dimOrder[i], emoji: '' }
    const label = `${def.emoji || ''}${def.name || dimOrder[i]}`.trim()
    const lx = cx + Math.cos(angle) * (radius + fontSize * 1.25)
    const ly = cy + Math.sin(angle) * (radius + fontSize * 1.25)
    const cos = Math.cos(angle)
    if (cos > 0.2) ctx.textAlign = 'left'
    else if (cos < -0.2) ctx.textAlign = 'right'
    else ctx.textAlign = 'center'
    const lv = levels[dimOrder[i]] || 'M'
    if (lv === 'H') ctx.fillStyle = '#d4a957'
    else if (lv === 'L') ctx.fillStyle = 'rgba(245,236,214,0.55)'
    else ctx.fillStyle = 'rgba(245,236,214,0.9)'
    ctx.fillText(label, lx, ly)
  }

  ctx.restore()
}

/** 带圆角矩形填充 */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

/**
 * 生成分享海报
 * @returns {Promise<string>} PNG dataURL
 */
export async function renderPoster({
  primary,
  secondary,
  levels,
  identity,
  dimensions,
  mode,
  shareUrl = SITE_URL,
}) {
  const W = 1080
  const H = 1920
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // 背景渐变
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#1a1309')
  bg.addColorStop(0.5, '#241a0e')
  bg.addColorStop(1, '#12100c')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // 外圈金色描边
  ctx.strokeStyle = 'rgba(212,169,87,0.35)'
  ctx.lineWidth = 2
  roundRect(ctx, 24, 24, W - 48, H - 48, 24)
  ctx.stroke()

  let y = 120

  // —— Header: FiTI logo + 副标题 ——
  ctx.textAlign = 'center'
  ctx.fillStyle = '#d4a957'
  ctx.font = 'bold 96px -apple-system, "Microsoft YaHei", sans-serif'
  ctx.fillText('FiTI', W / 2, y)
  y += 58
  ctx.fillStyle = 'rgba(245,236,214,0.6)'
  ctx.font = '28px -apple-system, "Microsoft YaHei", sans-serif'
  ctx.fillText('FinanceTI · 金融人格测试', W / 2, y)
  y += 50

  // 身份标签（胶囊）
  const idText = IDENTITY_LABEL[identity] || IDENTITY_LABEL.junior
  ctx.font = '24px -apple-system, "Microsoft YaHei", sans-serif'
  const idW = ctx.measureText(idText).width + 40
  ctx.fillStyle = 'rgba(212,169,87,0.12)'
  roundRect(ctx, (W - idW) / 2, y - 26, idW, 40, 20)
  ctx.fill()
  ctx.strokeStyle = 'rgba(212,169,87,0.35)'
  ctx.lineWidth = 1
  roundRect(ctx, (W - idW) / 2, y - 26, idW, 40, 20)
  ctx.stroke()
  ctx.fillStyle = '#d4a957'
  ctx.fillText(idText, W / 2, y)
  y += 80

  // —— 人格主区 ——
  // 中文名（大字）
  ctx.fillStyle = '#f5ecd6'
  ctx.font = 'bold 110px -apple-system, "Microsoft YaHei", sans-serif'
  const nameText = primary?.cn || '—'
  // 过长自动缩放
  let nameFont = 110
  while (ctx.measureText(nameText).width > W - 160 && nameFont > 70) {
    nameFont -= 6
    ctx.font = `bold ${nameFont}px -apple-system, "Microsoft YaHei", sans-serif`
  }
  ctx.fillText(nameText, W / 2, y)
  y += nameFont * 0.55 + 30

  // 标题（分隔符 ·）
  if (primary?.title) {
    ctx.fillStyle = 'rgba(245,236,214,0.78)'
    ctx.font = '34px -apple-system, "Microsoft YaHei", sans-serif'
    const titleLines = wrapLines(ctx, primary.title, W - 200)
    for (const line of titleLines.slice(0, 2)) {
      ctx.fillText(line, W / 2, y)
      y += 48
    }
  }

  y += 10

  // 芯片区：稀有度 / 难度 / 相似度
  const chips = []
  if (mode === 'egg') chips.push(['🥚 隐藏人格', '#d4a957'])
  if (primary?.rarity) chips.push([`稀有度 ${primary.rarity}`, '#d4a957'])
  if (primary?.similarity != null && mode !== 'egg')
    chips.push([`相似度 ${primary.similarity}%`, '#4dd6d0'])
  if (primary?.difficulty) chips.push([`难度 ${primary.difficulty}`, '#f5ecd6'])

  if (chips.length) {
    ctx.font = '28px -apple-system, "Microsoft YaHei", sans-serif'
    const gap = 16
    const widths = chips.map(([t]) => ctx.measureText(t).width + 44)
    const total = widths.reduce((a, b) => a + b, 0) + gap * (chips.length - 1)
    let cx = (W - total) / 2
    for (let i = 0; i < chips.length; i++) {
      const [t, color] = chips[i]
      const cw = widths[i]
      ctx.fillStyle = 'rgba(245,236,214,0.04)'
      roundRect(ctx, cx, y - 28, cw, 44, 22)
      ctx.fill()
      ctx.strokeStyle = color + '55'
      ctx.lineWidth = 1.2
      roundRect(ctx, cx, y - 28, cw, 44, 22)
      ctx.stroke()
      ctx.fillStyle = color
      ctx.textAlign = 'center'
      ctx.fillText(t, cx + cw / 2, y)
      cx += cw + gap
    }
    y += 70
  }

  // —— 金句 ——
  if (primary?.roast) {
    const quoteY = y
    const boxX = 80
    const boxW = W - 160
    ctx.fillStyle = 'rgba(212,169,87,0.08)'
    ctx.strokeStyle = 'rgba(212,169,87,0.3)'
    // 先预估高度，再画
    ctx.font = 'italic 32px -apple-system, "Microsoft YaHei", sans-serif'
    const lines = wrapLines(ctx, primary.roast, boxW - 100)
    const lineH = 48
    const boxH = lines.length * lineH + 60
    roundRect(ctx, boxX, quoteY, boxW, boxH, 16)
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = '#d4a957'
    ctx.beginPath()
    ctx.moveTo(boxX, quoteY + 14)
    ctx.lineTo(boxX, quoteY + boxH - 14)
    ctx.stroke()
    // 大号引号
    ctx.fillStyle = 'rgba(212,169,87,0.75)'
    ctx.font = 'bold 80px Georgia, serif'
    ctx.textAlign = 'left'
    ctx.fillText('“', boxX + 22, quoteY + 72)
    // 正文
    ctx.fillStyle = '#f5ecd6'
    ctx.font = 'italic 32px -apple-system, "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'left'
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], boxX + 80, quoteY + 42 + i * lineH)
    }
    y = quoteY + boxH + 40
  }

  // —— 雷达图 ——
  const radarR = 220
  const radarCX = W / 2
  const radarCY = y + radarR + 40
  drawRadar(ctx, radarCX, radarCY, radarR, dimensions.order, levels, dimensions.definitions)
  y = radarCY + radarR + 70

  // —— CP 区 ——
  if (primary?.bestMatch || primary?.worstMatch) {
    const cpY = y
    const cpW = (W - 200) / 2
    const cpH = 110
    // best
    if (primary.bestMatch) {
      ctx.fillStyle = 'rgba(212,169,87,0.08)'
      ctx.strokeStyle = 'rgba(212,169,87,0.35)'
      ctx.lineWidth = 1.2
      roundRect(ctx, 80, cpY, cpW, cpH, 14)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = 'rgba(245,236,214,0.55)'
      ctx.font = '22px -apple-system, "Microsoft YaHei", sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('💘 最佳搭档', 110, cpY + 38)
      ctx.fillStyle = '#d4a957'
      ctx.font = 'bold 32px -apple-system, "Microsoft YaHei", sans-serif'
      ctx.fillText(primary.bestMatch, 110, cpY + 82)
    }
    // worst
    if (primary.worstMatch) {
      const x = 80 + cpW + 40
      ctx.fillStyle = 'rgba(230,120,120,0.07)'
      ctx.strokeStyle = 'rgba(230,120,120,0.3)'
      ctx.lineWidth = 1.2
      roundRect(ctx, x, cpY, cpW, cpH, 14)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = 'rgba(245,236,214,0.55)'
      ctx.font = '22px -apple-system, "Microsoft YaHei", sans-serif'
      ctx.fillText('⚔️ 最怕遇到', x + 30, cpY + 38)
      ctx.fillStyle = '#e78a8a'
      ctx.font = 'bold 32px -apple-system, "Microsoft YaHei", sans-serif'
      ctx.fillText(primary.worstMatch, x + 30, cpY + 82)
    }
    y = cpY + cpH + 40
  }

  // —— 底栏：二维码 + URL + slogan ——
  const qrSize = 200
  const qrX = 80
  const qrY = H - qrSize - 100
  // 白底留边
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 12)
  ctx.fill()
  // 生成二维码到 dataURL → 画上去
  const qrDataUrl = await QRCode.toDataURL(shareUrl, {
    width: qrSize,
    margin: 1,
    color: { dark: '#1a1309', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  })
  const qrImg = new Image()
  await new Promise((resolve, reject) => {
    qrImg.onload = resolve
    qrImg.onerror = reject
    qrImg.src = qrDataUrl
  })
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)

  // 右侧文字
  const rightX = qrX + qrSize + 40
  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(245,236,214,0.55)'
  ctx.font = '22px -apple-system, "Microsoft YaHei", sans-serif'
  ctx.fillText('扫码开始你的测试', rightX, qrY + 40)
  ctx.fillStyle = '#d4a957'
  ctx.font = 'bold 28px -apple-system, "Microsoft YaHei", sans-serif'
  ctx.fillText('niuniu-869.github.io/fiti', rightX, qrY + 92)
  ctx.fillStyle = 'rgba(245,236,214,0.45)'
  ctx.font = '20px -apple-system, "Microsoft YaHei", sans-serif'
  ctx.fillText('金融圈的 18 种人格 · 12 维能力画像', rightX, qrY + 140)
  ctx.fillText('#FiTI #金融人格测试', rightX, qrY + 175)

  return canvas.toDataURL('image/png')
}
