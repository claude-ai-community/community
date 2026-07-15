# AI 投资委员会（Investment Committee）

> 学员案例 · Tracy Li @ Demo Day 2026-07-11 #11 · Austin 产品化改编

用 7 个独立的投资人格 Agent 对一支股票并行打分，经多空辩论、CIO 裁决，输出一份委员会决议报告。

**思路改编自开源项目 [virattt/ai-hedge-fund](https://github.com/virattt/ai-hedge-fund)（MIT 协议）。**
原项目走 ADK 按 API token 计费，一次分析约 10 次 LLM 调用，成本高。本版本改为
Claude Code 的 Skill + Workflow 形式——订阅计费、无需部署，并做了三层 token 优化（见下）。

---

## 快速开始

### 第一步：进入本目录，打开 Claude Code

```bash
cd 金融分析/skills/investment-committee
claude
```

### 第二步：安装 skill

```
/install .claude/skills/investment-committee/SKILL.md
```

### 第三步：运行

```
/investment-committee AAPL
/investment-committee AAPL --quick
/investment-committee AAPL --personas Buffett,Munger,Wood
```

- 默认：7 人格完整模式（打分 → 多空辩论 → CIO 裁决）
- `--quick`：4 人格、跳过辩论，适合快速看结果（~6 次 Agent 调用）
- `--personas`：自选人格，合法代号见 [personas.md](personas.md)

报告输出到 `output/committee-report-<TICKER>-<日期>.md`。

### 前置依赖

需要安装 Python 和 yfinance：

```bash
pip install yfinance
```

---

## 架构（多 Agent 委员会教学范例）

```
阶段1 事实包    1 个 Agent 拉数据(yfinance) → 压缩成精简 bullet 摘要
阶段2 打分      7 个人格 Agent 并行、互相不可见 → {stance, score, thesis, key_risk}
阶段3 辩论      Bull / Bear 两个 Agent 基于真实打分提炼论据（--quick 跳过）
阶段4 CIO 裁决  1 个 Agent 读全部材料 → {decision, conviction, ..., dissent_acknowledged}
```

**为什么用 Workflow 而不是单会话角色扮演？** 单会话里让一个模型轮流扮演 7 个投资人，
后说话的人格会被先说话的影响，意见趋同。Workflow 的 `parallel()` 让 7 个 Agent
真正独立运行——同一份事实包，互相看不见对方的回答，分歧只来自投资哲学差异。

**三层 token 优化：**
1. 原始数据只拉一次、压缩一次，7 个人格复用同一份精简摘要
2. 打分 Agent 用 `effort: 'low'`——立场+短理由不需要深度推理；只有 CIO 用高推理
3. `--quick` 模式：4 人格 + 跳过辩论，调用数从 ~11 降到 ~6

---

## 目录结构

```
investment-committee/
├── README.md                                    本文件
├── personas.md                                  人格目录（7 默认 + 3 可选）
├── output/                                      报告输出（运行时生成）
└── .claude/
    ├── skills/investment-committee/SKILL.md     用户入口（校验 → 调 Workflow → 汇报）
    └── workflows/investment-committee.js        多 Agent 编排脚本
```

---

## 免责声明

本项目仅供教育与研究目的，思路改编自 virattt/ai-hedge-fund（MIT 协议），
不构成投资建议，重大决策请咨询持牌财务顾问。
