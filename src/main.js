/**
 * FiTI 入口
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

// 全部数据静态 import，Vite 会自动打包并 tree-shake 未引用部分
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
}

async function init() {
  // 标题与副标题动态注入
  if (config.display?.title) document.title = config.display.title;
  setText(byId("intro-title"), config.display?.title || "FinanceTI");
  setText(byId("intro-subtitle"), config.display?.subtitle || "");
  setText(byId("intro-reference"), config.display?.reference || "");
  setText(byId("fun-note"), config.display?.funNote || "");

  const hits = countDimensionHits(questions.main || []);

  const progressFill = byId("progress-fill");
  const progressText = byId("progress-text");
  const questionText = byId("question-text");
  const questionHint = byId("question-hint");
  const optionsWrap = byId("options");

  function renderQuestion(q, progress) {
    if (!q) return;
    progressFill.style.width = `${progress.percent}%`;
    setText(progressText, `${progress.current} / ${progress.total}`);
    setText(questionText, q.text);
    if (q.special) {
      setText(questionHint, "隐藏题 · 不参与主评分，可能触发彩蛋");
      questionHint.style.display = "";
    } else if (progress.phase === "anchor") {
      setText(questionHint, "先让我们认识一下你 · 不参与评分");
      questionHint.style.display = "";
    } else {
      setText(questionHint, "");
      questionHint.style.display = "none";
    }

    optionsWrap.innerHTML = "";
    q.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option";
      btn.textContent = opt.label;
      btn.addEventListener("click", () => {
        btn.classList.add("option-selected");
        // 微延迟让过渡有感知
        setTimeout(() => handleAnswer(opt.value), 120);
      });
      optionsWrap.appendChild(btn);
    });
  }

  let quiz;
  let lastLevels = null;

  function handleAnswer(value) {
    const next = quiz.answer(value);
    if (next) renderQuestion(next, quiz.progress());
  }

  function onComplete({ answers, identity }) {
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
    // 先显示 result 页，让 CSS 生效（雷达图需要读取真实的容器宽度）
    showPage("result");
    // 下一帧渲染，确保 layout 就绪
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

  byId("btn-start").addEventListener("click", () => {
    const first = quiz.start();
    renderQuestion(first, quiz.progress());
    showPage("quiz");
  });

  byId("btn-restart").addEventListener("click", () => {
    const first = quiz.start();
    renderQuestion(first, quiz.progress());
    showPage("quiz");
  });

  // 雷达图 resize 重绘
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
      );
    }, 150),
  );

  // 去掉首屏 loader
  document.body.classList.add("app-ready");
}

init().catch((err) => {
  console.error(err);
  document.body.innerHTML = `<div style="padding:2rem;color:#f5ecd6;font-family:sans-serif">加载失败：${err.message}</div>`;
});
