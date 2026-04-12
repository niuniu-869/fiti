/**
 * 结果页渲染：主要人格 + 次要 + 12 维雷达 + 维度级解读（分层建议）+ TOP5
 */

import { el, setText } from './utils.js'
import { renderRadar } from './chart.js'

const IDENTITY_LABEL = {
  intern: '在校生 / 实习中',
  junior: '刚工作 1–3 年',
  senior: '工作 3 年以上',
}

const MODEL_KEY_MAP = {
  认知模型: 'cognitive',
  行为模型: 'behavioral',
  社交模型: 'social',
  COGNITIVE: 'cognitive',
  BEHAVIORAL: 'behavioral',
  SOCIAL: 'social',
}

function pickCareerAdvice(def, identity) {
  if (!def?.careerHint) return ''
  return identity === 'intern' ? def.careerHint.intern : def.careerHint.professional
}

function pickInterpretationAdvice(interp, identity) {
  if (!interp) return ''
  if (identity === 'intern') return interp.internAdvice
  return interp.professionalAdvice
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
  } = ctx

  const { primary, secondary, rankings, mode } = result
  const dimOrder = dimensions.order
  const dimDefs = dimensions.definitions

  // 身份标签
  const identityEl = document.getElementById('result-identity')
  setText(identityEl, IDENTITY_LABEL[identity] || IDENTITY_LABEL.junior)

  // 主人格
  setText(document.getElementById('result-code'), primary?.code || '')
  setText(document.getElementById('result-name'), primary?.cn || '')
  setText(document.getElementById('result-title'), primary?.title || '')
  setText(
    document.getElementById('result-badge'),
    primary?.skill ? `绝技 · ${primary.skill}　${primary.difficulty || ''}` : '',
  )
  setText(document.getElementById('result-intro'), primary?.intro || '')
  setText(document.getElementById('result-desc'), primary?.desc || '')

  // 相似度徽章
  const kicker = document.getElementById('result-kicker')
  const simText = primary?.similarity != null ? `相似度 ${primary.similarity}%` : ''
  setText(
    kicker,
    mode === 'fallback' ? `你的金融人格 · 兜底类型 · ${simText}` : `你的金融人格 · ${simText}`,
  )

  // 次要人格
  const secWrap = document.getElementById('result-secondary')
  if (secondary && config.ranking?.showSecondary) {
    secWrap.style.display = ''
    setText(
      document.getElementById('secondary-info'),
      `${secondary.cn} · ${secondary.title || ''}（相似度 ${secondary.similarity}%）`,
    )
  } else {
    secWrap.style.display = 'none'
  }

  // 雷达图
  const canvas = document.getElementById('radar-chart')
  renderRadar(canvas, dimOrder, levels, dimDefs)

  // 12 维度详情
  const dimDetail = document.getElementById('dimensions-detail')
  dimDetail.innerHTML = ''
  for (const dimCode of dimOrder) {
    const def = dimDefs[dimCode] || {}
    const lv = levels[dimCode] || 'M'
    const modelKey = MODEL_KEY_MAP[def.model] || ''
    const interp = interpretations[modelKey]?.[dimCode]?.[lv]

    const card = el('article', 'dim-card')
    card.dataset.level = lv

    const head = el('header', 'dim-head')
    head.appendChild(el('span', 'dim-emoji', def.emoji || ''))
    head.appendChild(el('span', 'dim-name', def.name || dimCode))
    head.appendChild(el('span', `dim-level dim-level-${lv}`, lv))
    head.appendChild(el('span', 'dim-model', def.model || ''))
    card.appendChild(head)

    if (interp?.profile) {
      card.appendChild(el('p', 'dim-profile', interp.profile))
    } else if (def.levels?.[lv]) {
      card.appendChild(el('p', 'dim-profile', def.levels[lv]))
    }

    // 优势 / 劣势
    const tags = el('div', 'dim-grid')
    if (interp?.strengths?.length) {
      const strengths = el('div', 'dim-list dim-list-strengths')
      strengths.appendChild(el('h4', '', '优势'))
      const ul = el('ul')
      interp.strengths.forEach((s) => ul.appendChild(el('li', '', s)))
      strengths.appendChild(ul)
      tags.appendChild(strengths)
    }
    if (interp?.weaknesses?.length) {
      const weak = el('div', 'dim-list dim-list-weaknesses')
      weak.appendChild(el('h4', '', '劣势'))
      const ul = el('ul')
      interp.weaknesses.forEach((s) => ul.appendChild(el('li', '', s)))
      weak.appendChild(ul)
      tags.appendChild(weak)
    }
    if (tags.children.length) card.appendChild(tags)

    // 适配岗位
    if (interp?.suitableRoles?.length) {
      const roles = el('div', 'dim-roles')
      roles.appendChild(el('h4', '', '适配岗位'))
      const chips = el('div', 'dim-role-chips')
      interp.suitableRoles.forEach((r) => chips.appendChild(el('span', 'chip', r)))
      roles.appendChild(chips)
      card.appendChild(roles)
    }

    // 分层建议
    const advice = pickInterpretationAdvice(interp, identity) || pickCareerAdvice(def, identity)
    if (advice) {
      const adv = el('div', 'dim-advice')
      adv.appendChild(
        el('h4', '', identity === 'intern' ? '给你的实习建议' : '给你的职业建议'),
      )
      adv.appendChild(el('p', '', advice))
      card.appendChild(adv)
    }

    dimDetail.appendChild(card)
  }

  // TOP N 匹配
  const topList = document.getElementById('top-list')
  topList.innerHTML = ''
  const topN = config.ranking?.topN || 5
  rankings.slice(0, topN).forEach((t, i) => {
    const row = el('div', 'top-row')
    row.appendChild(el('span', 'top-rank', `#${i + 1}`))
    const info = el('div', 'top-info')
    info.appendChild(el('div', 'top-name', `${t.cn} · ${t.title || ''}`))
    info.appendChild(el('div', 'top-meta', `相似度 ${t.similarity}% · 精准命中 ${t.exact}/${t.maxDistance / 2}`))
    row.appendChild(info)
    const simBar = el('div', 'top-bar')
    const simFill = el('div', 'top-bar-fill')
    simFill.style.width = `${t.similarity}%`
    simBar.appendChild(simFill)
    row.appendChild(simBar)
    topList.appendChild(row)
  })

  // 免责声明
  setText(document.getElementById('disclaimer'), config.display?.disclaimer || '')
}
