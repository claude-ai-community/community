---
name: investment-committee
description: AI 投资委员会——多个投资人格 Agent 并行给一支股票打分，多空辩论后由 CIO 裁决，输出委员会决议报告。用法：/investment-committee <TICKER> [--personas A,B,C] [--quick]
---

# investment-committee

对指定股票运行「AI 投资委员会」：人格打分（并行、互相不可见）→ 多空辩论 → CIO 裁决 → 报告落盘。

## Arguments

- 必填：`<TICKER>` — 股票代码（如 `AAPL`）
- 可选：`--personas <A,B,C>` — 自选人格，代号见 `personas.md`
- 可选：`--quick` — 快速模式：4 人格（Buffett/Munger/Damodaran/Wood）+ 跳过辩论

## Steps

### 1. 解析参数并校验人格

1. 从命令参数取 ticker（转大写）、`--personas` 列表、`--quick` 标志。
2. 读 `personas.md`，取合法代号全集（默认 7 人 + 可选人格）。
3. 若 `--personas` 中有不在目录中的名字：**直接报错**，列出合法清单，停止。不做模糊匹配。
4. 人格列表确定规则：`--personas` 优先；否则 `--quick` 用 4 人默认组；否则用 7 人默认组。

### 2. 校验 ticker（不进 Workflow 就拦下无效代码）

用 python + yfinance 快速验证：

```python
import yfinance as yf
t = yf.Ticker("<TICKER>")
info = t.fast_info
# 无价格数据 / 异常 → 视为无效
print(info.last_price)
```

拉不到价格（不存在、已退市）→ 直接报错停止，**不调用 Workflow**——避免在烂 ticker 上浪费 7 个并行 Agent。

### 3. 调用 Workflow

用 `Workflow` 工具执行编排脚本（date 用今天的日期，Workflow 脚本内禁用 Date.now 所以必须从这里传入）：

```
Workflow {
  scriptPath: ".claude/workflows/investment-committee.js",
  args: {
    ticker: "<TICKER>",
    personas: ["Buffett", ...],   // 第 1 步确定的列表
    quick: false,                  // 或 true
    date: "YYYY-MM-DD"             // 今天
  }
}
```

### 4. 汇报结果

Workflow 返回 `{ reportPath, decision, conviction, summary }`：

1. 告诉用户报告位置（`output/committee-report-<TICKER>-<日期>.md`）。
2. 展示一句话摘要：`【<decision> · 信念 <conviction>】<summary>`。
3. 附免责声明一行：仅供教育研究，非投资建议。

## 注意

- 完整模式约 11 次 Agent 调用，`--quick` 约 6 次；课堂演示用 `--quick`。
- 若 Workflow 返回中提到有人格意见缺失（Agent 调用失败），如实转告用户。
