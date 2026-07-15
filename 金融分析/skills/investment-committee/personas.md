# 人格目录（Personas）

`--personas` 参数只接受下表「代号」列中的名字（区分大小写按代号写，逗号分隔）。
传入不在目录中的名字会直接报错并显示本清单——不做模糊匹配。

## 默认 7 人格（完整模式）

| 代号 | 投资人 | 投资哲学 | 打分时的视角 |
|------|--------|----------|--------------|
| `Buffett` | Warren Buffett | 质量 + 护城河 + 长期持有 | 生意好不好懂？护城河多宽？管理层可信吗？愿意持有十年吗？ |
| `Munger` | Charlie Munger | 理性 + 逆向清单 | 先想怎么会亏钱。激励结构有没有问题？我是不是在自欺？ |
| `Burry` | Michael Burry | 逆向 + 深度价值 + 尾部风险 | 市场共识哪里错了？资产负债表里藏着什么雷？极端情形下损失多大？ |
| `Wood` | Cathie Wood | 颠覆性创新 + 指数级成长 | 这是不是一个正在改写行业规则的技术平台？五年后市场规模是几倍？ |
| `Ackman` | Bill Ackman | 集中持仓 + 激进主义 | 值不值得下重注？有没有催化剂或可推动的经营改善？ |
| `Damodaran` | Aswath Damodaran | 估值即故事 + 数字 | 增长、利润率、再投资、风险四要素拼出来的内在价值是多少？现价贵不贵？ |
| `Lynch` | Peter Lynch | GARP · 成长但别付冤枉钱 | PEG 合理吗？这是快速成长股、稳定股还是困境反转？普通人能理解它吗？ |

## `--quick` 模式默认 4 人格

`Buffett`、`Munger`、`Damodaran`、`Wood` —— 覆盖价值 / 风险 / 估值 / 成长四个基本视角。

## 可选人格（按需加入）

| 代号 | 投资人 | 投资哲学 | 打分时的视角 |
|------|--------|----------|--------------|
| `Graham` | Benjamin Graham | 防御型价值 + 安全边际 | 净资产打折了吗？安全边际有多厚？不预测，只算账。 |
| `Druckenmiller` | Stanley Druckenmiller | 宏观 + 流动性 + 趋势 | 央行在放水还是收水？资金在流向哪个板块？方向对了就下重注。 |
| `Fisher` | Phil Fisher | 成长质量 + 闲聊法 | 研发管线和销售组织强不强？管理层诚信如何？成长能持续十五年吗？ |

## 用法示例

```
/investment-committee NVDA                                 # 默认 7 人格
/investment-committee NVDA --quick                         # 4 人格快速模式
/investment-committee NVDA --personas Buffett,Burry,Graham # 自选 3 人格
```
