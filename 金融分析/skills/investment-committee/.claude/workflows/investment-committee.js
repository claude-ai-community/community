export const meta = {
  name: 'investment-committee',
  description: 'AI 投资委员会：人格并行打分 → 多空辩论 → CIO 裁决 → 报告落盘',
  whenToUse: '由 /investment-committee Skill 调用；args: { ticker, personas, quick, date }',
  phases: [
    { title: '事实包', detail: '拉取并压缩一份共享事实摘要' },
    { title: '打分', detail: '人格 Agent 并行独立打分' },
    { title: '辩论', detail: 'Bull/Bear 提炼多空论据（quick 模式跳过）' },
    { title: 'CIO 裁决', detail: '合成最终决议并写报告' },
  ],
}

// ── 参数 ────────────────────────────────────────────────────────────────
// 防御：部分调用路径会把 args 作为 JSON 字符串传入
const A = (typeof args === 'string') ? JSON.parse(args) : (args || {})
const ticker = (A.ticker || '').toUpperCase()
const quick = !!(A.quick)
const date = A.date || 'undated'
const DEFAULT_FULL = ['Buffett', 'Munger', 'Burry', 'Wood', 'Ackman', 'Damodaran', 'Lynch']
const DEFAULT_QUICK = ['Buffett', 'Munger', 'Damodaran', 'Wood']
const personas = (A.personas && A.personas.length)
  ? A.personas
  : (quick ? DEFAULT_QUICK : DEFAULT_FULL)

if (!ticker) throw new Error('args.ticker 缺失')

// 人格视角速写（与 personas.md 保持一致；prompt 内嵌避免每个 Agent 再读文件）
const PERSONA_BRIEF = {
  Buffett: 'Warren Buffett：质量+护城河+长期持有。生意好不好懂？护城河多宽？管理层可信吗？愿意持有十年吗？',
  Munger: 'Charlie Munger：理性+逆向清单。先想怎么会亏钱；激励结构有没有问题；我是不是在自欺。',
  Burry: 'Michael Burry：逆向+深度价值+尾部风险。市场共识哪里错了？资产负债表藏着什么雷？极端情形损失多大？',
  Wood: 'Cathie Wood：颠覆性创新+指数级成长。是不是正在改写行业规则的技术平台？五年后市场规模是几倍？',
  Ackman: 'Bill Ackman：集中持仓+激进主义。值不值得下重注？有没有催化剂或可推动的经营改善？',
  Damodaran: 'Aswath Damodaran：估值即故事+数字。增长/利润率/再投资/风险拼出的内在价值是多少？现价贵不贵？',
  Lynch: 'Peter Lynch：GARP。PEG 合理吗？快速成长股、稳定股还是困境反转？普通人能理解它吗？',
  Graham: 'Benjamin Graham：防御型价值+安全边际。净资产打折了吗？安全边际多厚？不预测，只算账。',
  Druckenmiller: 'Stanley Druckenmiller：宏观+流动性+趋势。央行在放水还是收水？资金流向哪个板块？',
  Fisher: 'Phil Fisher：成长质量。研发与销售组织强不强？管理层诚信？成长能否持续十五年？',
}
const unknown = personas.filter(p => !PERSONA_BRIEF[p])
if (unknown.length) throw new Error('未知人格: ' + unknown.join(', ') + '。合法代号见 personas.md')

// ── Schemas ─────────────────────────────────────────────────────────────
const FACT_SCHEMA = {
  type: 'object',
  properties: {
    facts: { type: 'string', description: '精简 bullet 摘要（估值倍数/营收利润趋势/分析师预期/技术面快照/近期情绪），中性陈述，不带结论' },
  },
  required: ['facts'],
}

const SCORE_SCHEMA = {
  type: 'object',
  properties: {
    persona: { type: 'string' },
    stance: { type: 'string', enum: ['Buy', 'Hold', 'Sell'] },
    score: { type: 'integer', minimum: -5, maximum: 5 },
    thesis: { type: 'string', description: '2-3 句核心论点' },
    key_risk: { type: 'string', description: '1 句最大风险' },
  },
  required: ['persona', 'stance', 'score', 'thesis', 'key_risk'],
}

const DEBATE_SCHEMA = {
  type: 'object',
  properties: {
    side: { type: 'string', enum: ['Bull', 'Bear'] },
    argument: { type: 'string', description: '提炼的最强论据，必须引用具体人格名字' },
  },
  required: ['side', 'argument'],
}

const CIO_SCHEMA = {
  type: 'object',
  properties: {
    decision: { type: 'string', enum: ['Buy', 'Hold', 'Sell'] },
    conviction: { type: 'string', enum: ['High', 'Medium', 'Low'] },
    position_sizing_note: { type: 'string' },
    reasoning: { type: 'string' },
    dissent_acknowledged: { type: 'string', description: '必填：明确说出反方意见里哪部分是对的' },
  },
  required: ['decision', 'conviction', 'position_sizing_note', 'reasoning', 'dissent_acknowledged'],
}

const WRITE_SCHEMA = {
  type: 'object',
  properties: { reportPath: { type: 'string' } },
  required: ['reportPath'],
}

// ── 阶段 1：事实包 ──────────────────────────────────────────────────────
phase('事实包')
log(`拉取 ${ticker} 数据并压缩事实摘要`)
const fact = await agent(
  `你是投资委员会的数据分析员。用 python + yfinance 拉取股票 ${ticker} 的数据（只拉一次）：` +
  `估值倍数（PE/PS/EV-EBITDA 等可得项）、近几年营收与利润趋势、分析师预期（目标价/评级分布，可得则取）、` +
  `技术面快照（现价、52 周高低点、50/200 日均线相对位置）、近期新闻情绪（若无新闻数据则跳过，不要编造）。` +
  `然后压缩成一份精简 bullet 摘要（≤400 字）：只保留对投资判断有信息量的事实，中性陈述，禁止给出买卖倾向。` +
  `所有委员会成员将只看这份摘要，确保它完整、无立场。`,
  { label: `facts:${ticker}`, phase: '事实包', schema: FACT_SCHEMA }
)
if (!fact) throw new Error('事实包 Agent 失败，无法继续')

// ── 阶段 2：人格并行打分（互相不可见）────────────────────────────────────
phase('打分')
log(`${personas.length} 个人格并行独立打分`)
const scores = await parallel(personas.map(p => () =>
  agent(
    `你现在完全以 ${PERSONA_BRIEF[p]} 的投资哲学做判断。\n\n` +
    `以下是关于 ${ticker} 的事实摘要（全委员会共享同一份）：\n${fact.facts}\n\n` +
    `只依据这份摘要 + 你的投资哲学，独立给出你的立场。persona 字段填 "${p}"。` +
    `不要考虑其他委员可能怎么想。thesis 2-3 句，key_risk 1 句，score 为 -5（强烈看空）到 5（强烈看多）。`,
    { label: `score:${p}`, phase: '打分', effort: 'low', schema: SCORE_SCHEMA }
  )
))
const valid = scores.filter(Boolean)
const missing = personas.filter((p, i) => !scores[i])
if (!valid.length) throw new Error('全部人格打分失败')
if (missing.length) log(`意见缺失的人格: ${missing.join(', ')}`)

const scoreBoard = valid.map(s =>
  `${s.persona}: ${s.stance} (${s.score >= 0 ? '+' : ''}${s.score}) — ${s.thesis} 风险: ${s.key_risk}`
).join('\n')

// ── 阶段 3：多空辩论（quick 跳过）────────────────────────────────────────
let bull = null, bear = null
if (!quick) {
  phase('辩论')
  const debate = await parallel([
    () => agent(
      `你是投资委员会的多头辩手。以下是 ${ticker} 的委员打分实录：\n${scoreBoard}\n\n` +
      `从打分偏多的委员意见中提炼最强的多头论据（side 填 "Bull"），必须点名引用具体人格（如"Buffett 指出…"）。` +
      `只能基于实录，不得自由发挥新论点。`,
      { label: 'debate:bull', phase: '辩论', schema: DEBATE_SCHEMA }
    ),
    () => agent(
      `你是投资委员会的空头辩手。以下是 ${ticker} 的委员打分实录：\n${scoreBoard}\n\n` +
      `从打分偏空/谨慎的委员意见（含各人的 key_risk）中提炼最强的空头论据（side 填 "Bear"），必须点名引用具体人格。` +
      `只能基于实录，不得自由发挥新论点。`,
      { label: 'debate:bear', phase: '辩论', schema: DEBATE_SCHEMA }
    ),
  ])
  bull = debate[0]
  bear = debate[1]
}

// ── 阶段 4：CIO 裁决 ─────────────────────────────────────────────────────
phase('CIO 裁决')
const missingNote = missing.length
  ? `\n注意：人格 ${missing.join(', ')} 的意见因技术原因缺失，请在 reasoning 中注明这一点，不要把现有 ${valid.length} 份打分当成全体意见。`
  : ''
const debateBlock = (bull || bear)
  ? `\n多头论据：${bull ? bull.argument : '（缺失）'}\n空头论据：${bear ? bear.argument : '（缺失）'}`
  : '\n（快速模式：无辩论环节，直接基于打分裁决）'

const cio = await agent(
  `你是投资委员会的 CIO（首席投资官），做最终裁决。标的：${ticker}。\n\n` +
  `事实摘要：\n${fact.facts}\n\n委员打分实录：\n${scoreBoard}\n${debateBlock}${missingNote}\n\n` +
  `输出最终决议。dissent_acknowledged 为必填：明确说出与你结论相反的意见里哪部分是对的、你为什么仍然维持结论。` +
  `position_sizing_note 给出仓位思路（如试探仓/标准仓/回避），不给具体金额。`,
  { label: `cio:${ticker}`, phase: 'CIO 裁决', effort: 'high', schema: CIO_SCHEMA }
)
if (!cio) throw new Error('CIO Agent 失败')

// ── 写报告 ───────────────────────────────────────────────────────────────
const suffix = quick ? '-quick' : ''
const reportPath = `output/committee-report-${ticker}-${date}${suffix}.md`
const scoresJson = JSON.stringify(valid, null, 2)
const writer = await agent(
  `把以下投资委员会决议整理成 Markdown 报告，用 Write 工具写入文件 "${reportPath}"（相对当前项目根目录），然后在 reportPath 字段返回该路径。\n\n` +
  `# 报告结构\n` +
  `标题：# 投资委员会决议 · ${ticker} · ${date}${quick ? '（快速模式）' : ''}\n` +
  `1. 最终决议：decision=${cio.decision}, conviction=${cio.conviction}；正文引用 reasoning、position_sizing_note、dissent_acknowledged（各自成小节）\n` +
  `2. 委员打分表（表格：人格/立场/分数/论点/风险）：\n${scoresJson}\n` +
  (missing.length ? `2b. 注明意见缺失的人格：${missing.join(', ')}\n` : '') +
  ((bull || bear) ? `3. 多空辩论：\n多头：${bull ? bull.argument : '缺失'}\n空头：${bear ? bear.argument : '缺失'}\n` : '') +
  `4. 事实摘要（附录）：\n${fact.facts}\n` +
  `5. 文末固定免责声明（原样照抄）：「本报告仅供教育与研究目的，思路改编自 virattt/ai-hedge-fund（MIT 协议），不构成投资建议，重大决策请咨询持牌财务顾问。」`,
  { label: 'write-report', phase: 'CIO 裁决', effort: 'low', schema: WRITE_SCHEMA }
)

const summaryLine = cio.reasoning.split(/[。\n]/)[0]
return {
  reportPath: writer ? writer.reportPath : reportPath,
  decision: cio.decision,
  conviction: cio.conviction,
  summary: summaryLine,
  missingPersonas: missing,
}
