/**
 * FiTI 答题流程控制
 *
 * 顺序：anchor 身份题 → 30 道主题 → 2 道随机彩蛋（从 4 个 easter_egg 池里洗牌抽取）→ 完成回调
 *
 * 彩蛋机制：
 *   - special[] 中 kind === 'easter_egg' 的题会进入抽奖池
 *   - 每次测试随机抽 2 题，顺序也是随机的
 *   - 选中 triggerOn.value 对应选项时，main.js 会把主人格强制替换为 forceCode
 */

function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function createQuiz(questions, config, onComplete) {
  const anchorQs = questions.anchor || []
  const mainQs = questions.main || []

  // 彩蛋池：4 选 2 随机
  const allSpecials = questions.special || []
  const easterPool = allSpecials.filter((q) => q.kind === 'easter_egg')
  const eggCount = Math.min(config.easterEggs?.pickCount ?? 2, easterPool.length)
  const pickedEggs = shuffle(easterPool).slice(0, eggCount)

  // 兼容保留：非彩蛋的 special（如历史 wealth_gate 配置）
  const legacySpecials = allSpecials.filter((q) => {
    if (q.kind === 'easter_egg') return false
    if (q.kind === 'wealth_gate') return config.wealthGate?.enabled === true
    return false
  })

  // 正式答题序列（不含 anchor，anchor 单独渲染）
  const orderedMain = [...mainQs, ...legacySpecials, ...pickedEggs]
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
      // 把本次用到的彩蛋题也带出，方便上层回查 triggerOn
      eggs: pickedEggs,
    })
  }

  function progress() {
    const idx = currentIndex()
    return {
      current: Math.min(idx + 1, totalQuestions),
      total: totalQuestions,
      percent: Math.round(
        (Math.min(idx, totalQuestions) / Math.max(1, totalQuestions)) * 100,
      ),
      phase: state.phase,
    }
  }

  return {
    start,
    answer,
    progress,
    currentQuestion,
    get state() {
      return state
    },
  }
}
