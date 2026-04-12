# FiTI · FinanceTI 金融人格测试

> 基于认知行为科学的金融职业画像 · 参考黑石 Pymetrics 测评体系

一个开源的娱乐性金融人格测试项目。3 大模型（认知 / 行为 / 社交）× 12 维度 × 18 种原创金融圈角色，根据身份（实习 / 在职）给出差异化的职业建议。

## 在线体验

👉 https://niuniu-869.github.io/fiti/

## 特性

- 🧠 **3 大模型 × 12 维度画像** — COGNITIVE / BEHAVIORAL / SOCIAL
- 💼 **18 种金融圈原创人格** — 因子矿工、PPT 整容师、陪酒特种兵、风控灭霸……
- 📊 **曼哈顿距离匹配** — 12 维向量精准匹配，相似度低于 45% 触发兜底
- 🎯 **身份分层建议** — 在校 / 实习 vs 在职，建议各不相同
- 🔍 **维度级深度解读** — 每维度独立的 profile / 优势 / 劣势 / 适配岗位 / 分层建议
- 📱 **移动端优先** — 响应式布局 + 触控友好 + 安全区适配
- 🛠 **数据驱动** — 题目 / 维度 / 人格 / 解读全部在 `data/` 下，改 JSON 即可定制

## 项目结构

```
├── data/
│   ├── questions.json              # 1 锚点 + 30 主题 + 1 彩蛋
│   ├── dimensions.json             # 3 模型 × 12 维度定义
│   ├── types.json                  # 18 标准 + 1 FALLBACK
│   ├── config.json                 # 阈值、排行数、展示文案
│   └── interpretations/
│       ├── cognitive.json
│       ├── behavioral.json
│       └── social.json
├── src/
│   ├── engine.js                   # 评分引擎（纯函数）
│   ├── quiz.js                     # 答题流程
│   ├── result.js                   # 结果页渲染
│   ├── chart.js                    # 12 维雷达图
│   ├── main.js                     # 入口
│   ├── utils.js                    # 工具
│   └── style.css                   # 深色金融主题
├── .github/workflows/deploy.yml    # GitHub Pages 自动部署
├── index.html
├── vite.config.js
└── package.json
```

## 快速开始

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # 产物在 dist/
npm run preview   # 预览构建产物
```

## 评分算法

1. **原始分计算**：每道题的选项分值（1/2/3）累加到它测量的**每一个**维度（每题测 2 维）
2. **被测次数统计**：每个维度被 4–6 道题测量不等
3. **动态阈值**：`low = n + floor(n × 0.5)`、`high = 3n - floor(n × 0.5)`
4. **分级**：`score ≤ low → L`、`score ≥ high → H`、否则 `M`
5. **向量化**：L=1, M=2, H=3，生成 12 维向量
6. **曼哈顿距离匹配**：与 18 种类型 pattern 逐维计算，最大距离 24
7. **排序**：距离升序 → 精准命中降序 → 相似度降序
8. **FALLBACK 兜底**：最佳匹配相似度 < 45% 时返回"金融路人甲"

## 技术栈

- Vite 6 — 构建工具
- 原生 JavaScript — 无框架依赖
- Canvas API — 雷达图渲染
- CSS Custom Properties — 深色金融主题

## 致谢

- 基础框架 fork 自 [pingfanfan/SBTI](https://github.com/pingfanfan/SBTI)（MBTI 娱乐测试）
- 金融维度体系与 18 种人格设定由项目合作者原创
- 参考 Pymetrics 认知行为测评方法论

## 声明

本测试仅供娱乐，不构成职业咨询、投资建议或招聘依据。结果中的形象设定均为艺术加工，如有雷同纯属巧合。

## License

[MIT](LICENSE)
