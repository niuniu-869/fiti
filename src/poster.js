/**
 * 分享海报生成 v4 · 纸质档案风 Canvas
 *
 * 1080×1920 竖屏，完整复用 v4 视觉语言：
 *   · 纸米黄 + 红虚线内框 + 右上 CONFIDENTIAL 红章
 *   · 大字代号（金色描边）
 *   · 手写体 Roast 金句
 *   · 迷你 12 维雷达
 *   · CP 双栏（最佳拍档 / 死对头）
 *   · 二维码 + 话题标签
 * 彩蛋模式 → 切换为深琥珀 + 荧光橙高亮
 */

import QRCode from "qrcode";

const SITE_URL = "https://niuniu-869.github.io/fiti/";

const LEVEL_RADIUS = { L: 1 / 3, M: 2 / 3, H: 1 };

const IDENTITY_COMPANY = {
  intern: "LUJIAZUI BRANCH · 实习生池",
  junior: "LUJIAZUI BRANCH · 初级合伙人",
  senior: "LUJIAZUI BRANCH · 资深档案库",
};

/** 颜色主题 */
const THEME_NORMAL = {
  bg: "#f1e6c9",
  bgEdge: "#e6d5a8",
  ink: "#1a140a",
  inkDim: "rgba(26,20,10,0.62)",
  inkMute: "rgba(26,20,10,0.4)",
  rouge: "#c93a3a",
  rougeInk: "#8e1b1b",
  gold: "#d4a24c",
  goldDeep: "#8e6622",
  bull: "#0e8f5a",
  bear: "#c93a3a",
};

const THEME_EGG = {
  bg: "#13100a",
  bgEdge: "#1e180e",
  ink: "#f0e4c8",
  inkDim: "rgba(240,228,200,0.72)",
  inkMute: "rgba(240,228,200,0.4)",
  rouge: "#ff9500",
  rougeInk: "#ff6a00",
  gold: "#ffd27a",
  goldDeep: "#b8771f",
  bull: "#00ff88",
  bear: "#ff6a00",
};

/** 文本按像素宽度折行 */
function wrapLines(ctx, text, maxWidth) {
  const lines = [];
  let cur = "";
  for (const ch of text) {
    if (ch === "\n") {
      lines.push(cur);
      cur = "";
      continue;
    }
    const test = cur + ch;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = ch;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** 画虚线矩形 */
function dashRect(ctx, x, y, w, h, color, dash = [8, 6], lineWidth = 1.5) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(dash);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

/** 画圆角矩形 */
function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** 旋转绘制红章（rect 边框 + 文字） */
function drawStamp(ctx, cx, cy, text, color, rotation = 0, fontSize = 28) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.font = `700 ${fontSize}px "Bebas Neue", Impact, sans-serif`;
  const w = ctx.measureText(text).width + 28;
  const h = fontSize + 18;
  ctx.globalAlpha = 0.85;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(text, 0, 2);
  ctx.restore();
}

/** 迷你雷达绘制 */
function drawRadar(ctx, cx, cy, radius, dimOrder, levels, defs, theme) {
  const N = dimOrder.length;
  if (!N) return;
  ctx.save();

  // 网格 3 圈
  ctx.strokeStyle = "rgba(26,20,10,0.22)";
  if (theme === THEME_EGG) ctx.strokeStyle = "rgba(240,228,200,0.22)";
  ctx.lineWidth = 1.5;
  for (let r = 1; r <= 3; r++) {
    const rr = (radius * r) / 3;
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const a = (Math.PI * 2 * i) / N - Math.PI / 2;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  // 轴线
  for (let i = 0; i < N; i++) {
    const a = (Math.PI * 2 * i) / N - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
    ctx.stroke();
  }

  // 用户多边形
  ctx.beginPath();
  for (let i = 0; i < N; i++) {
    const a = (Math.PI * 2 * i) / N - Math.PI / 2;
    const lv = levels[dimOrder[i]] || "M";
    const rr = radius * (LEVEL_RADIUS[lv] ?? 2 / 3);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = "rgba(201,58,58,0.22)";
  if (theme === THEME_EGG) ctx.fillStyle = "rgba(255,149,0,0.3)";
  ctx.fill();
  ctx.strokeStyle = theme.rouge;
  ctx.lineWidth = 3;
  ctx.stroke();

  // 顶点
  for (let i = 0; i < N; i++) {
    const a = (Math.PI * 2 * i) / N - Math.PI / 2;
    const lv = levels[dimOrder[i]] || "M";
    const rr = radius * (LEVEL_RADIUS[lv] ?? 2 / 3);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    const vr = lv === "H" ? 7 : lv === "L" ? 4 : 5;
    ctx.fillStyle = lv === "H" ? theme.gold : lv === "L" ? theme.bull : theme.rouge;
    ctx.beginPath();
    ctx.arc(x, y, vr, 0, Math.PI * 2);
    ctx.fill();
  }

  // 标签
  ctx.fillStyle = theme.ink;
  ctx.font = `700 18px "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.textBaseline = "middle";
  for (let i = 0; i < N; i++) {
    const a = (Math.PI * 2 * i) / N - Math.PI / 2;
    const def = defs[dimOrder[i]] || { name: dimOrder[i], emoji: "" };
    const label = `${def.emoji || ""}${def.name || dimOrder[i]}`.trim();
    const lx = cx + Math.cos(a) * (radius + 24);
    const ly = cy + Math.sin(a) * (radius + 24);
    const cos = Math.cos(a);
    if (cos > 0.25) ctx.textAlign = "left";
    else if (cos < -0.25) ctx.textAlign = "right";
    else ctx.textAlign = "center";
    ctx.fillText(label, lx, ly);
  }
  ctx.restore();
}

/** 主函数 */
export async function renderPoster({
  primary,
  levels,
  identity,
  dimensions,
  mode = "normal",
}) {
  // 等字体加载（DM Serif Display / Bebas Neue / JetBrains Mono / Caveat）
  if (document.fonts && document.fonts.ready) {
    try {
      await Promise.race([
        document.fonts.ready,
        new Promise((r) => setTimeout(r, 1200)),
      ]);
    } catch (_) {}
  }

  const isEgg = mode === "egg";
  const theme = isEgg ? THEME_EGG : THEME_NORMAL;

  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // —— 底 ——
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, W, H);

  // 淡淡的径向光晕
  const grad = ctx.createRadialGradient(W / 2, 420, 0, W / 2, 420, 700);
  grad.addColorStop(0, isEgg ? "rgba(255,149,0,0.22)" : "rgba(212,162,76,0.24)");
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 1200);

  // 纸纹噪点（轻量版：稀疏点）
  if (!isEgg) {
    ctx.save();
    ctx.fillStyle = "rgba(110,70,20,0.08)";
    for (let i = 0; i < 1600; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      const s = Math.random() * 1.4 + 0.3;
      ctx.fillRect(x, y, s, s);
    }
    ctx.restore();
  } else {
    // 彩蛋：CRT 扫描线
    ctx.save();
    ctx.fillStyle = "rgba(255,149,0,0.06)";
    for (let y = 0; y < H; y += 3) {
      ctx.fillRect(0, y, W, 1);
    }
    ctx.restore();
  }

  // —— 外虚线框 ——
  dashRect(ctx, 40, 40, W - 80, H - 80, theme.rougeInk, [14, 10], 2);
  dashRect(
    ctx,
    52,
    52,
    W - 104,
    H - 104,
    isEgg ? "rgba(255,149,0,0.35)" : "rgba(142,27,27,0.35)",
    [4, 6],
    1,
  );

  // —— 顶部档案 meta ——
  ctx.fillStyle = theme.rougeInk;
  ctx.font = `700 24px "JetBrains Mono", ui-monospace, monospace`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const archiveNo = `FILE NO. ${Date.now().toString(36).slice(-6).toUpperCase()}`;
  ctx.fillText(archiveNo, 90, 90);

  // 右上红章 CONFIDENTIAL
  drawStamp(ctx, W - 220, 140, "CONFIDENTIAL", theme.rouge, 6, 32);

  // —— OFFER LETTER kicker ——
  ctx.fillStyle = theme.rougeInk;
  ctx.font = `700 26px "JetBrains Mono", monospace`;
  ctx.textAlign = "center";
  ctx.fillText(
    isEgg ? "— HIDDEN FILE · 彩蛋档案解锁 —" : "— OFFER LETTER · FiTI 档案部 —",
    W / 2,
    210,
  );

  // 分隔线
  ctx.strokeStyle = theme.rougeInk;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 200, 265);
  ctx.lineTo(W / 2 + 200, 265);
  ctx.stroke();

  // 手写寒暄
  ctx.fillStyle = theme.ink;
  ctx.font = `italic 42px "Caveat", "PingFang SC", cursive`;
  ctx.textAlign = "center";
  ctx.fillText("Dear 附身候选人,", W / 2, 300);

  // —— 大字代号 HERO ——
  const codeText = (primary.code || "FINANCER").toUpperCase();
  let codeSize = 160;
  ctx.font = `700 ${codeSize}px "Bebas Neue", Impact, sans-serif`;
  // 自适应收缩
  while (ctx.measureText(codeText).width > W - 160 && codeSize > 80) {
    codeSize -= 8;
    ctx.font = `700 ${codeSize}px "Bebas Neue", Impact, sans-serif`;
  }
  // 金色描边 + 阴影
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = isEgg ? theme.rouge : theme.ink;
  ctx.fillText(codeText, W / 2, 400);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  // 再叠一层金色装饰描边
  ctx.strokeStyle = theme.gold;
  ctx.lineWidth = 2;
  ctx.strokeText(codeText, W / 2, 400);

  const heroBottom = 400 + codeSize * 1.05;

  // 中文名
  ctx.fillStyle = theme.rougeInk;
  ctx.font = `italic 700 72px "DM Serif Display", "Noto Serif SC", serif`;
  ctx.fillText(primary.cn || "金融人", W / 2, heroBottom + 10);

  // 副标题（title）
  ctx.fillStyle = theme.inkDim;
  ctx.font = `italic 40px "Caveat", "PingFang SC", cursive`;
  const titleText = primary.title || "";
  const titleLines = wrapLines(ctx, titleText, W - 200).slice(0, 2);
  titleLines.forEach((ln, i) => {
    ctx.fillText(ln, W / 2, heroBottom + 110 + i * 48);
  });

  let cursorY = heroBottom + 110 + titleLines.length * 48 + 30;

  // —— Chips ——
  const chips = [];
  if (isEgg) chips.push({ t: "🥚 隐藏档案", bg: theme.rouge, fg: "#111" });
  if (primary.rarity)
    chips.push({ t: `稀有度 ${primary.rarity}`, bg: "transparent", fg: theme.rouge, border: theme.rouge });
  if (!isEgg && primary.similarity != null)
    chips.push({ t: `匹配 ${primary.similarity}%`, bg: "transparent", fg: theme.bull, border: theme.bull });
  if (primary.skill)
    chips.push({ t: `绝活·${primary.skill}`, bg: "transparent", fg: theme.goldDeep, border: theme.gold });
  if (primary.difficulty)
    chips.push({ t: primary.difficulty, bg: "transparent", fg: theme.goldDeep, border: theme.gold });

  ctx.font = `700 22px "JetBrains Mono", "PingFang SC", monospace`;
  const chipPad = 18;
  const chipGap = 14;
  const chipH = 44;
  // 计算总宽
  const widths = chips.map((c) => ctx.measureText(c.t).width + chipPad * 2);
  const totalW = widths.reduce((a, b) => a + b, 0) + chipGap * (chips.length - 1);
  let cx = W / 2 - totalW / 2;
  chips.forEach((c, i) => {
    const cw = widths[i];
    if (c.bg !== "transparent") {
      ctx.fillStyle = c.bg;
      roundRect(ctx, cx, cursorY, cw, chipH, 22);
      ctx.fill();
    }
    if (c.border) {
      ctx.strokeStyle = c.border;
      ctx.lineWidth = 2;
      roundRect(ctx, cx, cursorY, cw, chipH, 22);
      ctx.stroke();
    }
    ctx.fillStyle = c.fg;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(c.t, cx + cw / 2, cursorY + chipH / 2 + 2);
    cx += cw + chipGap;
  });

  cursorY += chipH + 60;

  // —— Roast 金句区（引号框） ——
  const roast = primary.roast || `你被归档为「${primary.cn || "金融人"}」。`;
  // 装饰左竖线
  ctx.fillStyle = theme.rouge;
  ctx.fillRect(100, cursorY, 8, 200);
  // 大引号
  ctx.fillStyle = isEgg ? "rgba(255,149,0,0.45)" : "rgba(201,58,58,0.45)";
  ctx.font = `italic 160px "DM Serif Display", serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("“", 80, cursorY - 40);

  // 金句文本（手写感 + 大号）
  ctx.fillStyle = theme.ink;
  ctx.font = `italic 44px "Caveat", "PingFang SC", cursive`;
  const roastLines = wrapLines(ctx, roast, W - 280).slice(0, 5);
  roastLines.forEach((ln, i) => {
    ctx.fillText(ln, 140, cursorY + 10 + i * 60);
  });

  cursorY += Math.max(200, 10 + roastLines.length * 60 + 40);

  // —— 12 维雷达 ——
  const radarCX = W / 2;
  const radarCY = cursorY + 220;
  const radarR = 190;
  drawRadar(ctx, radarCX, radarCY, radarR, dimensions.order, levels, dimensions.definitions, theme);

  // 小标题
  ctx.fillStyle = theme.rougeInk;
  ctx.font = `700 20px "JetBrains Mono", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("— 12 维人格画像 · RADAR —", radarCX, cursorY - 20);

  cursorY += 460;

  // —— CP 双栏 ——
  const cpCardW = (W - 220) / 2;
  const cpCardH = 130;
  const cpY = cursorY;
  // 左：最佳拍档
  ctx.save();
  ctx.fillStyle = isEgg ? "rgba(0,255,136,0.12)" : "rgba(14,143,90,0.12)";
  roundRect(ctx, 90, cpY, cpCardW, cpCardH, 8);
  ctx.fill();
  ctx.strokeStyle = theme.bull;
  ctx.lineWidth = 2;
  roundRect(ctx, 90, cpY, cpCardW, cpCardH, 8);
  ctx.stroke();
  ctx.fillStyle = theme.bull;
  ctx.font = `700 18px "JetBrains Mono", monospace`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("💍 BEST CP · 最佳拍档", 110, cpY + 16);
  ctx.fillStyle = theme.ink;
  ctx.font = `italic 40px "DM Serif Display", "Noto Serif SC", serif`;
  ctx.fillText(primary.bestMatch || "—", 110, cpY + 52);
  ctx.restore();

  // 右：死对头
  const rightX = 90 + cpCardW + 40;
  ctx.save();
  ctx.fillStyle = isEgg ? "rgba(255,106,0,0.12)" : "rgba(201,58,58,0.1)";
  roundRect(ctx, rightX, cpY, cpCardW, cpCardH, 8);
  ctx.fill();
  ctx.strokeStyle = theme.rouge;
  ctx.lineWidth = 2;
  roundRect(ctx, rightX, cpY, cpCardW, cpCardH, 8);
  ctx.stroke();
  ctx.fillStyle = theme.rouge;
  ctx.font = `700 18px "JetBrains Mono", monospace`;
  ctx.fillText("⚔️ WORST CP · 死对头", rightX + 20, cpY + 16);
  ctx.fillStyle = theme.ink;
  ctx.font = `italic 40px "DM Serif Display", "Noto Serif SC", serif`;
  ctx.fillText(primary.worstMatch || "—", rightX + 20, cpY + 52);
  ctx.restore();

  // —— 底部：二维码 + URL + 话题 ——
  const qrSize = 200;
  const qrX = 90;
  const qrY = H - 280;

  // 二维码（白底防微信压暗）
  try {
    const qrDataUrl = await QRCode.toDataURL(SITE_URL, {
      width: qrSize,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#1a140a", light: "#ffffff" },
    });
    const qrImg = await loadImage(qrDataUrl);
    // 白底卡片（彩蛋模式尤其需要）
    ctx.fillStyle = "#fff";
    roundRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 6);
    ctx.fill();
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  } catch (e) {
    console.warn("QR 生成失败", e);
  }

  // 右侧：身份 + URL + 话题
  const textX = qrX + qrSize + 36;
  ctx.fillStyle = theme.rougeInk;
  ctx.font = `700 22px "JetBrains Mono", monospace`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("SCAN · 扫码立刻附身", textX, qrY);

  ctx.fillStyle = theme.ink;
  ctx.font = `italic 700 38px "DM Serif Display", "Noto Serif SC", serif`;
  ctx.fillText("FinanceTI", textX, qrY + 36);

  ctx.fillStyle = theme.inkDim;
  ctx.font = `500 20px "JetBrains Mono", monospace`;
  ctx.fillText("niuniu-869.github.io/fiti", textX, qrY + 88);

  ctx.fillStyle = theme.rouge;
  ctx.font = `700 22px "JetBrains Mono", monospace`;
  ctx.fillText(IDENTITY_COMPANY[identity] || IDENTITY_COMPANY.junior, textX, qrY + 122);

  ctx.fillStyle = theme.gold;
  ctx.font = `italic 28px "Caveat", "PingFang SC", cursive`;
  ctx.fillText("#FiTI  #金融变身模拟器", textX, qrY + 156);

  // 底部 footer 小字
  ctx.fillStyle = theme.inkMute;
  ctx.font = `500 18px "JetBrains Mono", monospace`;
  ctx.textAlign = "center";
  ctx.fillText(
    "本测评仅供娱乐 · 不构成投资或职业建议 · 盈亏自负",
    W / 2,
    H - 60,
  );

  return canvas.toDataURL("image/png");
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
