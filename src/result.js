/**
 * 结果页渲染：主要人格 + 次要 + 12 维雷达 + 维度级解读（分层建议）+ TOP5
 */

import { el, setText } from "./utils.js";
import { renderRadar } from "./chart.js";

const IDENTITY_LABEL = {
  intern: "在校生 / 实习中",
  junior: "刚工作 1–3 年",
  senior: "工作 3 年以上",
};

const MODEL_KEY_MAP = {
  认知模型: "cognitive",
  行为模型: "behavioral",
  社交模型: "social",
  COGNITIVE: "cognitive",
  BEHAVIORAL: "behavioral",
  SOCIAL: "social",
};

function pickCareerAdvice(def, identity) {
  if (!def?.careerHint) return "";
  return identity === "intern"
    ? def.careerHint.intern
    : def.careerHint.professional;
}

function pickInterpretationAdvice(interp, identity) {
  if (!interp) return "";
  if (identity === "intern") return interp.internAdvice;
  return interp.professionalAdvice;
}

export function renderResult(ctx) {
  const {
    result,
    levels,
    identity,
    dimensions,
    interpretations,
    config,
    types,
  } = ctx;

  const { primary, secondary, rankings, mode } = result;
  const dimOrder = dimensions.order;
  const dimDefs = dimensions.definitions;

  // 身份标签
  const identityEl = document.getElementById("result-identity");
  setText(identityEl, IDENTITY_LABEL[identity] || IDENTITY_LABEL.junior);

  // 结果卡记录模式（normal / fallback / egg），用于 CSS 高亮彩蛋态
  const resultCard = document.getElementById("result-card");
  if (resultCard) resultCard.dataset.mode = mode || "normal";

  // 主人格
  setText(document.getElementById("result-code"), primary?.code || "");
  setText(document.getElementById("result-name"), primary?.cn || "");
  setText(document.getElementById("result-title"), primary?.title || "");
  setText(
    document.getElementById("result-badge"),
    primary?.skill
      ? `绝技 · ${primary.skill}　${primary.difficulty || ""}`
      : "",
  );
  setText(document.getElementById("result-intro"), primary?.intro || "");
  setText(document.getElementById("result-desc"), primary?.desc || "");

  // 相似度徽章 / kicker 文案
  const kicker = document.getElementById("result-kicker");
  const simText =
    primary?.similarity != null ? `相似度 ${primary.similarity}%` : "";
  let kickerText = `你的金融人格 · ${simText}`;
  if (mode === "fallback") kickerText = `你的金融人格 · 兜底类型 · ${simText}`;
  if (mode === "egg")
    kickerText = `🥚 隐藏人格已解锁 · 稀有度 ${primary?.rarity || "?"}`;
  setText(kicker, kickerText);

  // 扎心金句（roast） + 稀有度 + CP/对家卡片（插在 desc 后）
  const desc = document.getElementById("result-desc");
  // 清理上一次渲染残留
  const prevExtras = document.querySelectorAll(
    ".result-extras, .result-roast, .result-meta-row",
  );
  prevExtras.forEach((n) => n.remove());

  const extras = el("div", "result-extras");

  if (primary?.roast) {
    const roast = el("blockquote", "result-roast");
    roast.appendChild(el("span", "roast-quote", '"'));
    roast.appendChild(el("p", "roast-text", primary.roast));
    extras.appendChild(roast);
  }

  const metaRow = el("div", "result-meta-row");
  if (primary?.rarity) {
    const chip = el("span", "meta-chip meta-chip-rarity");
    chip.appendChild(el("span", "meta-chip-label", "稀有度"));
    chip.appendChild(el("span", "meta-chip-value", primary.rarity));
    metaRow.appendChild(chip);
  }
  if (primary?.skill) {
    const chip = el("span", "meta-chip meta-chip-skill");
    chip.appendChild(el("span", "meta-chip-label", "绝技"));
    chip.appendChild(el("span", "meta-chip-value", primary.skill));
    metaRow.appendChild(chip);
  }
  if (primary?.difficulty) {
    const chip = el("span", "meta-chip meta-chip-difficulty");
    chip.appendChild(el("span", "meta-chip-label", "难度"));
    chip.appendChild(el("span", "meta-chip-value", primary.difficulty));
    metaRow.appendChild(chip);
  }
  if (metaRow.children.length) extras.appendChild(metaRow);

  if (primary?.bestMatch || primary?.worstMatch) {
    const cpRow = el("div", "result-cp-row");
    if (primary.bestMatch) {
      const cp = el("div", "cp-card cp-best");
      cp.appendChild(el("span", "cp-icon", "💘"));
      cp.appendChild(el("span", "cp-label", "最佳搭档"));
      cp.appendChild(el("span", "cp-name", primary.bestMatch));
      cpRow.appendChild(cp);
    }
    if (primary.worstMatch) {
      const cp = el("div", "cp-card cp-worst");
      cp.appendChild(el("span", "cp-icon", "⚔️"));
      cp.appendChild(el("span", "cp-label", "最怕遇到"));
      cp.appendChild(el("span", "cp-name", primary.worstMatch));
      cpRow.appendChild(cp);
    }
    extras.appendChild(cpRow);
  }

  // 插在 result-desc 之后（hadRender 后 badge 下方已经有 intro/desc）
  if (extras.children.length && desc?.parentNode) {
    desc.parentNode.insertBefore(extras, desc.nextSibling);
  }

  // 旧 badge 现已被 meta-chip 替代，隐藏 badge 节点避免重复
  const badgeEl = document.getElementById("result-badge");
  if (badgeEl) badgeEl.style.display = "none";

  // 次要人格
  const secWrap = document.getElementById("result-secondary");
  if (secondary && config.ranking?.showSecondary) {
    secWrap.style.display = "";
    setText(
      document.getElementById("secondary-info"),
      `${secondary.cn} · ${secondary.title || ""}（相似度 ${secondary.similarity}%）`,
    );
  } else {
    secWrap.style.display = "none";
  }

  // 雷达图
  const canvas = document.getElementById("radar-chart");
  renderRadar(canvas, dimOrder, levels, dimDefs);

  // 12 维度详情
  const dimDetail = document.getElementById("dimensions-detail");
  dimDetail.innerHTML = "";
  for (const dimCode of dimOrder) {
    const def = dimDefs[dimCode] || {};
    const lv = levels[dimCode] || "M";
    const modelKey = MODEL_KEY_MAP[def.model] || "";
    const interp = interpretations[modelKey]?.[dimCode]?.[lv];

    const card = el("article", "dim-card");
    card.dataset.level = lv;

    const head = el("header", "dim-head");
    head.appendChild(el("span", "dim-emoji", def.emoji || ""));
    head.appendChild(el("span", "dim-name", def.name || dimCode));
    head.appendChild(el("span", `dim-level dim-level-${lv}`, lv));
    head.appendChild(el("span", "dim-model", def.model || ""));
    card.appendChild(head);

    if (interp?.profile) {
      card.appendChild(el("p", "dim-profile", interp.profile));
    } else if (def.levels?.[lv]) {
      card.appendChild(el("p", "dim-profile", def.levels[lv]));
    }

    // 优势 / 劣势
    const tags = el("div", "dim-grid");
    if (interp?.strengths?.length) {
      const strengths = el("div", "dim-list dim-list-strengths");
      strengths.appendChild(el("h4", "", "优势"));
      const ul = el("ul");
      interp.strengths.forEach((s) => ul.appendChild(el("li", "", s)));
      strengths.appendChild(ul);
      tags.appendChild(strengths);
    }
    if (interp?.weaknesses?.length) {
      const weak = el("div", "dim-list dim-list-weaknesses");
      weak.appendChild(el("h4", "", "劣势"));
      const ul = el("ul");
      interp.weaknesses.forEach((s) => ul.appendChild(el("li", "", s)));
      weak.appendChild(ul);
      tags.appendChild(weak);
    }
    if (tags.children.length) card.appendChild(tags);

    // 适配岗位
    if (interp?.suitableRoles?.length) {
      const roles = el("div", "dim-roles");
      roles.appendChild(el("h4", "", "适配岗位"));
      const chips = el("div", "dim-role-chips");
      interp.suitableRoles.forEach((r) =>
        chips.appendChild(el("span", "chip", r)),
      );
      roles.appendChild(chips);
      card.appendChild(roles);
    }

    // 分层建议
    const advice =
      pickInterpretationAdvice(interp, identity) ||
      pickCareerAdvice(def, identity);
    if (advice) {
      const adv = el("div", "dim-advice");
      adv.appendChild(
        el(
          "h4",
          "",
          identity === "intern" ? "给你的实习建议" : "给你的职业建议",
        ),
      );
      adv.appendChild(el("p", "", advice));
      card.appendChild(adv);
    }

    dimDetail.appendChild(card);
  }

  // TOP N 匹配
  const topList = document.getElementById("top-list");
  topList.innerHTML = "";
  const topN = config.ranking?.topN || 5;
  rankings.slice(0, topN).forEach((t, i) => {
    const row = el("div", "top-row");
    row.appendChild(el("span", "top-rank", `#${i + 1}`));
    const info = el("div", "top-info");
    info.appendChild(el("div", "top-name", `${t.cn} · ${t.title || ""}`));
    info.appendChild(
      el(
        "div",
        "top-meta",
        `相似度 ${t.similarity}% · 精准命中 ${t.exact}/${t.maxDistance / 2}`,
      ),
    );
    row.appendChild(info);
    const simBar = el("div", "top-bar");
    const simFill = el("div", "top-bar-fill");
    simFill.style.width = `${t.similarity}%`;
    simBar.appendChild(simFill);
    row.appendChild(simBar);
    topList.appendChild(row);
  });

  // 免责声明
  setText(
    document.getElementById("disclaimer"),
    config.display?.disclaimer || "",
  );
}
