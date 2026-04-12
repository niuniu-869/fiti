/**
 * 结果页渲染 · Story 竖屏卡片流版本（v4）
 * 把 result/levels/identity 展开到 6 张 Story 卡片
 */

import { renderRadar } from "./chart.js";

function byId(id) {
  return document.getElementById(id);
}
function setText(el, v) {
  if (el) el.textContent = v ?? "";
}

/** 身份中文 + 讽刺公司名 */
const IDENTITY_META = {
  intern: { cn: "实习候选人", company: "FINANCETI · 陆家嘴分所 · 实习生池" },
  junior: { cn: "在职打工人", company: "FINANCETI · 陆家嘴分所 · 初级合伙人" },
  senior: { cn: "行业老鸟", company: "FINANCETI · 陆家嘴分所 · 资深档案库" },
};

/** Hero 卡 kicker 文案（根据 mode） */
const KICKER_BY_MODE = {
  normal: "RARITY · 稀有度",
  fallback: "UNCLASSIFIED · 未能归档",
  egg: "HIDDEN FILE · 彩蛋档案",
};

export function renderResult({
  result,
  levels,
  identity,
  dimensions,
  types,
  interpretations,
  config,
}) {
  const { primary, secondary, rankings, mode = "normal" } = result || {};
  if (!primary) return;

  const isEgg = mode === "egg";
  const isFallback = mode === "fallback";

  // ============ Story 1 · 封面 Offer Letter ============
  const identityMeta = IDENTITY_META[identity] || IDENTITY_META.junior;
  setText(byId("cover-identity-cn"), primary.cn || primary.code);

  // cover 简述：用 intro，截断到一句
  const briefText = isEgg
    ? `很遗憾通知你：你触发了我司档案柜最底层的抽屉。你被永久标记为「${primary.cn}」——这是一份只有 ${primary.rarity || "?"} 人才会拿到的抽屉钥匙。`
    : isFallback
      ? `你的答案跳出了我司标准档案模板。本部门判定你为：${primary.cn}。请保持这份独特，或重测一次看看。`
      : primary.intro || "";
  setText(byId("cover-body-brief"), briefText);

  setText(byId("cover-company"), identityMeta.company);

  const coverKicker = byId("cover-kicker");
  if (coverKicker) {
    coverKicker.textContent = isEgg
      ? "— 🥚 HIDDEN FILE · 彩蛋档案已解锁 —"
      : "— OFFER LETTER · FiTI 人事档案 —";
  }

  // ============ Story 2 · Hero 代号大字报 ============
  const story2 = byId("story-2");
  if (story2) story2.dataset.mode = isEgg ? "egg" : "normal";

  // rarity 展示
  const rarityText = primary.rarity || "—";
  const heroRarityEl = byId("hero-rarity");
  if (heroRarityEl) {
    heroRarityEl.parentElement.firstChild.textContent = `${KICKER_BY_MODE[mode]} `;
    heroRarityEl.textContent = rarityText;
  }

  setText(byId("hero-code"), primary.code || "—");
  setText(byId("hero-cn"), primary.cn || "");
  setText(byId("hero-title"), primary.title || "");

  // Chips
  const chipsWrap = byId("hero-chips");
  if (chipsWrap) {
    chipsWrap.innerHTML = "";
    if (isEgg) {
      chipsWrap.appendChild(makeChip("🥚 隐藏档案", "chip-egg"));
    }
    if (primary.rarity) {
      chipsWrap.appendChild(makeChip(`稀有度 ${primary.rarity}`, "chip-rare"));
    }
    if (!isEgg && primary.similarity != null) {
      chipsWrap.appendChild(
        makeChip(`匹配 ${primary.similarity}%`, "chip-skill"),
      );
    }
    if (primary.skill) {
      chipsWrap.appendChild(makeChip(`绝活 · ${primary.skill}`, "chip-skill"));
    }
    if (primary.difficulty) {
      chipsWrap.appendChild(makeChip(primary.difficulty, "chip-diff"));
    }
  }

  // ============ Story 3 · Roast 金句 ============
  const roastQuote =
    primary.roast ||
    `你被归档为「${primary.cn}」。我方暂时没有更刻薄的话要说。`;
  setText(byId("roast-quote"), roastQuote);
  setText(byId("roast-desc"), primary.desc || "");

  // ============ Story 4 · 12 维雷达 + 维度详情 ============
  requestAnimationFrame(() => {
    renderRadar(
      byId("radar-chart"),
      dimensions.order,
      levels,
      dimensions.definitions,
      {
        accent: "#c93a3a",
        accentFill: "rgba(201, 58, 58, 0.18)",
        grid: "rgba(26, 20, 10, 0.22)",
        gridStrong: "rgba(26, 20, 10, 0.5)",
        labelColor: "rgba(26, 20, 10, 0.82)",
      },
    );
  });

  // 12 维度详情列表
  const dimsWrap = byId("dimensions-detail");
  if (dimsWrap) {
    dimsWrap.innerHTML = "";
    for (const dim of dimensions.order) {
      const def = dimensions.definitions[dim] || {};
      const lv = levels[dim] || "M";
      const row = document.createElement("div");
      row.className = "dim-row";
      const emoji = document.createElement("span");
      emoji.className = "emoji";
      emoji.textContent = def.emoji || "•";
      const name = document.createElement("span");
      name.className = "name";
      name.innerHTML = `${def.name || dim}<small>${dim}</small>`;
      const level = document.createElement("span");
      level.className = `level lvl-${lv}`;
      level.textContent = lv === "H" ? "拉满" : lv === "L" ? "摆烂" : "平衡";
      row.append(emoji, name, level);
      dimsWrap.appendChild(row);
    }
  }

  // ============ Story 5 · 办公室 CP ============
  setText(byId("cp-best-name"), primary.bestMatch || "—");
  setText(byId("cp-worst-name"), primary.worstMatch || "—");

  // ============ Story 6 · TOP 5 + 分享 ============
  const topList = byId("top-list");
  if (topList && Array.isArray(rankings)) {
    topList.innerHTML = "";
    const top = rankings.slice(0, 5);
    top.forEach((t, idx) => {
      const item = document.createElement("div");
      item.className = `top-item top-${idx + 1}`;
      const rank = document.createElement("div");
      rank.className = "rank";
      rank.textContent = `#${idx + 1}`;
      const body = document.createElement("div");
      body.className = "body";
      const title = document.createElement("div");
      title.className = "title-row";
      title.textContent = `${t.cn || t.code}`;
      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = `${t.code} · ${t.title || ""}`.slice(0, 40);
      body.append(title, meta);
      const score = document.createElement("div");
      score.className = "score";
      score.textContent = `${t.similarity ?? 0}%`;
      item.append(rank, body, score);
      topList.appendChild(item);
    });
  }

  // 免责声明
  setText(byId("disclaimer"), config.display?.disclaimer || "");
  setText(byId("fun-note"), config.display?.funNote || "");
}

function makeChip(text, extra = "") {
  const c = document.createElement("span");
  c.className = `chip ${extra}`.trim();
  c.textContent = text;
  return c;
}
