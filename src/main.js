/**
 * FiTI v4 · 入口
 * 金融变身模拟器 — ticker + 盖章尽调 + Story 竖屏结果流
 */

import { setText, throttle } from "./utils.js";
import {
  calcDimensionScores,
  countDimensionHits,
  scoresToLevels,
  determineResult,
} from "./engine.js";
import { createQuiz } from "./quiz.js";
import { renderResult } from "./result.js";
import { renderRadar } from "./chart.js";
import "./style.css";

// 静态导入数据，Vite 打包 tree-shake
import questions from "../data/questions.json";
import dimensions from "../data/dimensions.json";
import types from "../data/types.json";
import config from "../data/config.json";
import cognitive from "../data/interpretations/cognitive.json";
import behavioral from "../data/interpretations/behavioral.json";
import social from "../data/interpretations/social.json";

function byId(id) {
  return document.getElementById(id);
}

function showPage(name) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  byId(`page-${name}`).classList.add("active");
  window.scrollTo({
    top: 0,
    behavior: "instant" in window ? "instant" : "auto",
  });

  // 首页隐藏 ticker，答题/结果页显示
  const ticker = byId("ticker-bar");
  if (ticker) ticker.hidden = name === "intro";
}

/** 用 config.display.ticker 填充滚动条（复制两份保证无缝） */
function initTicker() {
  const track = byId("ticker-track");
  if (!track) return;
  const lines = config.display?.ticker || [];
  const frag = document.createDocumentFragment();
  for (let round = 0; round < 2; round++) {
    lines.forEach((raw) => {
      const span = document.createElement("span");
      const up = /▲|\+/.test(raw);
      const down = /▼|-/.test(raw);
      span.textContent = raw;
      if (up) span.classList.add("up");
      else if (down) span.classList.add("down");
      frag.appendChild(span);
    });
  }
  track.appendChild(frag);
}

/**
 * 典型人设预告轮播
 * - 从 types.standard 抽 6 个，每 3.5s 切换一次
 * - 展示：代号 + 中文名 + roast 金句
 * - respect prefers-reduced-motion（减速到 7s）
 */
function initPreviewCarousel() {
  const card = byId("preview-card");
  const codeEl = byId("preview-code");
  const cnEl = byId("preview-cn");
  const roastEl = byId("preview-roast");
  const dotsWrap = byId("preview-dots");
  if (!card || !codeEl) return;

  // 随机抽 6 个，先 shuffle 一次保持稳定
  const pool = (types.standard || []).slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picks = pool.slice(0, 6);
  if (picks.length === 0) return;

  // 生成圆点
  dotsWrap.innerHTML = "";
  picks.forEach((_, i) => {
    const d = document.createElement("span");
    d.className = "dot" + (i === 0 ? " active" : "");
    dotsWrap.appendChild(d);
  });
  const dots = dotsWrap.querySelectorAll(".dot");

  function paint(idx) {
    const p = picks[idx];
    codeEl.textContent = p.code || "—";
    cnEl.textContent = p.cn || "";
    roastEl.textContent = p.roast || p.intro || "";
    card.classList.remove("fading");
    void card.offsetWidth; // trigger reflow
    card.classList.add("fading");
    dots.forEach((d, i) => d.classList.toggle("active", i === idx));
  }

  paint(0);
  const interval = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 7000
    : 3500;
  let cur = 0;
  setInterval(() => {
    cur = (cur + 1) % picks.length;
    // 仅在首页活动时推进（不浪费）
    if (!byId("page-intro").classList.contains("active")) return;
    paint(cur);
  }, interval);
}

/**
 * 构建 K 线蜡烛进度
 * - 已答（绿）· 当前（金）· 未答（灰）
 */
function renderCandleProgress(total, currentIdx) {
  const wrap = byId("candle-progress");
  if (!wrap) return;
  // 仅初始化一次 DOM，之后只更新 state
  if (wrap.children.length !== total) {
    wrap.innerHTML = "";
    for (let i = 0; i < total; i++) {
      const c = document.createElement("div");
      c.className = "candle";
      // 给每根蜡烛一个稳定的伪随机高度（40% ~ 95%）
      const h = 40 + ((i * 13 + 7) % 56);
      c.style.setProperty("--h", `${h}%`);
      wrap.appendChild(c);
    }
  }
  const children = wrap.children;
  for (let i = 0; i < total; i++) {
    const el = children[i];
    el.classList.remove("answered", "current", "down");
    if (i < currentIdx) {
      el.classList.add("answered");
      // 每 4 根加一根红 — 模拟 K 线波动
      if (i % 4 === 3) el.classList.add("down");
    } else if (i === currentIdx) {
      el.classList.add("current");
    }
  }
}

async function init() {
  // 动态注入文档 title / meta
  if (config.display?.title) document.title = config.display.title;

  initTicker();
  initPreviewCarousel();

  const hits = countDimensionHits(questions.main || []);

  const progressText = byId("progress-text");
  const caseId = byId("case-id");
  const questionText = byId("question-text");
  const questionHint = byId("question-hint");
  const optionsWrap = byId("options");

  function renderQuestion(q, progress) {
    if (!q) return;

    // K 线蜡烛 — 0-based 当前 index
    const curIdx = Math.max(0, progress.current - 1);
    renderCandleProgress(progress.total, curIdx);

    setText(progressText, `${progress.current} / ${progress.total}`);
    setText(
      caseId,
      `CASE ${String(progress.current).padStart(2, "0")}/${String(progress.total).padStart(2, "0")}`,
    );
    setText(questionText, q.text);

    // hint
    if (q.special) {
      setText(questionHint, "🥚 彩蛋题 · 不参与主评分，可能触发隐藏档案");
      questionHint.style.display = "";
    } else if (progress.phase === "anchor") {
      setText(questionHint, "身份识别 · 不参与评分");
      questionHint.style.display = "";
    } else {
      setText(questionHint, "");
      questionHint.style.display = "none";
    }

    // 选项按钮
    optionsWrap.innerHTML = "";
    q.options.forEach((opt, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option";
      btn.dataset.num = String.fromCharCode(65 + idx); // A / B / C
      btn.textContent = opt.label;
      btn.addEventListener("click", () => {
        if (btn.dataset.locked === "1") return;
        btn.dataset.locked = "1";
        // 锁全部
        Array.from(optionsWrap.children).forEach((c) => {
          c.dataset.locked = "1";
        });
        btn.classList.add("option-selected");
        // 微振动（Android 可用）
        if (navigator.vibrate)
          try {
            navigator.vibrate(12);
          } catch (_) {}
        // 盖章动画 320ms，延后切题
        setTimeout(() => handleAnswer(opt.value), 360);
      });
      optionsWrap.appendChild(btn);
    });
  }

  let quiz;
  let lastLevels = null;
  let lastResult = null;
  let lastIdentity = "junior";

  function handleAnswer(value) {
    const next = quiz.answer(value);
    if (next) renderQuestion(next, quiz.progress());
  }

  function onComplete({ answers, identity, special, eggs }) {
    const scores = calcDimensionScores(answers, questions.main);
    const levels = scoresToLevels(
      scores,
      hits,
      config.scoring?.thresholdRatio ?? 0.5,
    );
    lastLevels = levels;
    const result = determineResult(
      levels,
      dimensions.order,
      types.standard,
      types.special,
      {
        fallbackThreshold: config.scoring?.fallbackThreshold ?? 45,
        showSecondary: config.ranking?.showSecondary ?? true,
      },
    );

    // 彩蛋触发
    const activeEggs = Array.isArray(eggs) ? eggs : [];
    for (const egg of activeEggs) {
      const chosen = special?.[egg.id];
      const trigger = egg.triggerOn;
      if (!trigger || chosen !== trigger.value) continue;
      const forced =
        types.special.find((t) => t.code === trigger.forceCode) ||
        types.standard.find((t) => t.code === trigger.forceCode);
      if (!forced) continue;
      const previousPrimary = result.primary;
      result.primary = {
        ...forced,
        similarity: 100,
        exact: dimensions.order.length,
        distance: 0,
        triggered: true,
        triggeredBy: egg.id,
      };
      result.secondary = previousPrimary || result.secondary;
      result.mode = "egg";
      break;
    }

    lastResult = result;
    lastIdentity = identity;

    showPage("result");
    requestAnimationFrame(() => {
      renderResult({
        result,
        levels,
        identity,
        dimensions,
        types,
        interpretations: { cognitive, behavioral, social },
        config,
      });
    });
  }

  quiz = createQuiz(questions, config, onComplete);

  // —— 首页 按钮 ——
  byId("btn-start").addEventListener("click", () => {
    const first = quiz.start();
    showPage("quiz");
    renderQuestion(first, quiz.progress());
  });

  byId("btn-restart").addEventListener("click", () => {
    const first = quiz.start();
    showPage("quiz");
    renderQuestion(first, quiz.progress());
  });

  // —— 分享海报 ——
  const posterModal = byId("poster-modal");
  const posterImg = byId("poster-img");
  const posterLoading = byId("poster-loading");
  const posterDownload = byId("poster-download");

  function openPosterModal() {
    posterModal.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closePosterModal() {
    posterModal.hidden = true;
    document.body.style.overflow = "";
  }

  byId("btn-share").addEventListener("click", async () => {
    if (!lastResult) return;
    openPosterModal();
    posterImg.style.display = "none";
    posterLoading.style.display = "";
    posterLoading.textContent = "生成分享卡…";
    try {
      const { renderPoster } = await import("./poster.js");
      const dataUrl = await renderPoster({
        primary: lastResult.primary,
        secondary: lastResult.secondary,
        levels: lastLevels,
        identity: lastIdentity,
        dimensions,
        mode: lastResult.mode,
      });
      posterImg.src = dataUrl;
      posterImg.style.display = "";
      posterLoading.style.display = "none";
      posterDownload.href = dataUrl;
    } catch (err) {
      console.error(err);
      posterLoading.textContent = "生成失败：" + (err?.message || "未知错误");
    }
  });

  byId("poster-close").addEventListener("click", closePosterModal);
  byId("poster-backdrop").addEventListener("click", closePosterModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !posterModal.hidden) closePosterModal();
  });

  // —— 雷达图 resize 重绘（结果页可见时） ——
  window.addEventListener(
    "resize",
    throttle(() => {
      if (!lastLevels) return;
      if (!byId("page-result").classList.contains("active")) return;
      renderRadar(
        byId("radar-chart"),
        dimensions.order,
        lastLevels,
        dimensions.definitions,
        {
          accent: "#c93a3a",
          accentFill: "rgba(201, 58, 58, 0.18)",
          grid: "rgba(26, 20, 10, 0.22)",
          gridStrong: "rgba(26, 20, 10, 0.5)",
          labelColor: "rgba(26, 20, 10, 0.82)",
        },
      );
    }, 150),
  );

  document.body.classList.add("app-ready");
}

init().catch((err) => {
  console.error(err);
  document.body.innerHTML = `<div style="padding:2rem;color:#f0e4c8;font-family:sans-serif">加载失败：${err.message}</div>`;
});
