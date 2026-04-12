/**
 * FiTI 答题流程控制
 *
 * 顺序：anchor 身份题 → 30 道主题 → （可选）wealth_gate 彩蛋 → 完成回调
 */

export function createQuiz(questions, config, onComplete) {
  const anchorQs = questions.anchor || []
  const mainQs = questions.main || []
  const specialQs = (questions.special || []).filter((q) => {
    if (q.kind === 'wealth_gate') return config.wealthGate?.enabled === true
    return true
  })

  // 正式答题序列（不含 anchor，anchor 单独渲染）
  const orderedMain = [...mainQs, ...specialQs]
  const totalQuestions = anchorQs.length + orderedMain.length

  const state = {
    identity: 'junior', // intern | junior | senior
    answers: {},
    special: {},
    phase: 'anchor', // anchor | main | done
    anchorIdx: 0,
    mainIdx: 0,
  }

  function currentIndex() {
    if (state.phase === 'anchor') return state.anchorIdx
    if (state.phase === 'main') return anchorQs.length + state.mainIdx
    return totalQuestions
  }

  function currentQuestion() {
    if (state.phase === 'anchor') return anchorQs[state.anchorIdx]
    if (state.phase === 'main') return orderedMain[state.mainIdx]
    return null
  }

  function start() {
    state.identity = 'junior'
    state.answers = {}
    state.special = {}
    state.phase = 'anchor'
    state.anchorIdx = 0
    state.mainIdx = 0
    if (anchorQs.length === 0) state.phase = 'main'
    if (orderedMain.length === 0 && anchorQs.length === 0) {
      finish()
      return
    }
    return currentQuestion()
  }

  function answer(optionValue) {
    const q = currentQuestion()
    if (!q) return

    if (state.phase === 'anchor') {
      state.identity = optionValue
      state.anchorIdx += 1
      if (state.anchorIdx >= anchorQs.length) {
        state.phase = orderedMain.length > 0 ? 'main' : 'done'
      }
    } else if (state.phase === 'main') {
      if (q.special) {
        state.special[q.id] = optionValue
      } else {
        state.answers[q.id] = optionValue
      }
      state.mainIdx += 1
      if (state.mainIdx >= orderedMain.length) {
        state.phase = 'done'
      }
    }

    if (state.phase === 'done') {
      finish()
      return null
    }

    return currentQuestion()
  }

  function finish() {
    onComplete({
      answers: state.answers,
      identity: state.identity,
      special: state.special,
    })
  }

  function progress() {
    const idx = currentIndex()
    return {
      current: Math.min(idx + 1, totalQuestions),
      total: totalQuestions,
      percent: Math.round((Math.min(idx, totalQuestions) / Math.max(1, totalQuestions)) * 100),
      phase: state.phase,
    }
  }

  return { start, answer, progress, currentQuestion, get state() { return state } }
}
