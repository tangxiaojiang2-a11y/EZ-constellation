
const fs = require('fs');
// 引擎为纯 JS（var 声明 + 函数），注入 module 后导出关键函数
const code = fs.readFileSync('/root/.codebuddy/artifact/check/engine.js', 'utf8');
globalThis.__sandbox = {};
const wrapper = code + `
;module.exports = { solarToLunar, getConstellation, getConstellationKey, qike, hourZhiFromClock,
  compliance, seedOf, pick, isValidSolarDate, buildChart, buildReport, buildRelationReport,
  buildAIPrompt, buildRelAIPrompt, todayReading, fitScore, personTags, guardianOf,
  GODS, GOD_KB, ELE_PAIR, GOD_PAIR, BANNED_MAP: (typeof BANNED_MAP !== 'undefined' ? BANNED_MAP : null),
  mergeRelAI: (typeof mergeRelAI !== 'undefined' ? mergeRelAI : null) };`;
const m = new module.constructor();
m._compile(wrapper, 'engine.js');
const E = m.exports;

let pass = 0, fail = 0;
const fails = [];
function t(name, cond, detail) {
  if (cond) { pass++; }
  else { fail++; fails.push(name + (detail ? ' | ' + detail : '')); }
}

/* ---- 1. 农历锚点（已知春节/节日基准） ---- */
const anchors = [
  ['2000-02-05', '庚辰龙年 正月初一'],
  ['2024-02-10', '甲辰龙年 正月初一'],
  ['2025-01-29', '乙巳蛇年 正月初一'],
  ['2026-02-17', '丙午马年 正月初一'],
  ['2020-06-25', '庚子鼠年 五月初五'],
  ['2000-01-01', '己卯兔年 冬月廿五'],
  ['1949-10-01', '己丑牛年 八月初十'],
];
for (const [ds, expect] of anchors) {
  const [y, mo, d] = ds.split('-').map(Number);
  const r = E.solarToLunar(y, mo, d);
  t('农历锚点 ' + ds, r && r.text === expect, r ? r.text + ' ≠ ' + expect : 'null');
}

/* ---- 2. 农历边界 ---- */
t('1900-01-31 表首', E.solarToLunar(1900, 1, 31) !== null);
t('1900-01-01 越界返回 null', E.solarToLunar(1900, 1, 1) === null);
t('2100-12-31 可算', E.solarToLunar(2100, 12, 31) !== null);
t('2101-01-01 不崩溃(返回对象但数据来自表外,需UI层拦截)', (() => { try { E.solarToLunar(2101, 1, 1); return true; } catch (e) { return false; } })());
t('非法日期 2023-02-29', E.isValidSolarDate(2023, 2, 29) === false);
t('闰年 2024-02-29', E.isValidSolarDate(2024, 2, 29) === true);
t('非法 4-31', E.isValidSolarDate(2024, 4, 31) === false);

/* ---- 3. 星座边界 ---- */
const cons = [
  [3, 20, '双鱼座'], [3, 21, '白羊座'], [4, 19, '白羊座'], [4, 20, '金牛座'],
  [12, 21, '射手座'], [12, 22, '摩羯座'], [1, 19, '摩羯座'], [1, 20, '水瓶座'],
  [2, 18, '水瓶座'], [2, 19, '双鱼座'], [8, 23, '处女座'], [10, 24, '天蝎座'],
];
for (const [mo, d, name] of cons) t(`星座 ${mo}-${d} → ${name}`, E.getConstellation(mo, d).name === name, E.getConstellation(mo, d).name);
t('非法星座输入 13-1', E.getConstellation(13, 1) === null);

/* ---- 4. 小六壬起课 ---- */
// 农历八月·初一·子时: 月=(8-1)%6=1留连, 日=(1+1-1)%6=1留连, 时=(1+1-1)%6=1留连
const q1 = E.qike(8, 1, 1);
t('起课 八月初一子时', q1.month.god === '留连' && q1.day.god === '留连' && q1.hour.god === '留连',
  JSON.stringify(q1));
// 正月十五·午时: 月0大安, 日=(0+14)%6=2速喜, 时=(2+7-1)%6=2速喜
const q2 = E.qike(1, 15, 7);
t('起课 正月十五午时', q2.month.god === '大安' && q2.day.god === '速喜' && q2.hour.god === '速喜',
  JSON.stringify(q2));
t('起课 无时辰返回 hour=null', E.qike(1, 15, null).hour === null);

/* ---- 5. 时辰换算（子=1 ... 亥=12；23:00-00:59 子时） ---- */
const hz = [[23,1],[0,1],[1,2],[2,2],[6,4],[7,5],[9,6],[11,7],[12,7],[13,8],[15,9],[17,10],[19,11],[21,12],[22,12]];
for (const [h, v] of hz) t(`hourZhiFromClock(${h})=${v}`, E.hourZhiFromClock(h) === v, String(E.hourZhiFromClock(h)));

/* ---- 6. 合规过滤 ---- */
t('禁词 风水', E.compliance('风水布局') === '居家环境参考布局', E.compliance('风水布局'));
t('禁词 大吉大凶', E.compliance('大吉大凶') === '顺利不顺', E.compliance('大吉大凶'));
t('禁词 化解煞气', E.compliance('化解煞气') === '调整碍气', E.compliance('化解煞气'));
t('六神名保护', E.compliance('大安留连速喜赤口小吉空亡') === '大安留连速喜赤口小吉空亡', E.compliance('大安留连速喜赤口小吉空亡'));
t('单吉字替换但小吉受保护', E.compliance('小吉很吉') === '小吉很顺', E.compliance('小吉很吉'));
t('改运转运', E.compliance('改运转运') === '状态优化状态优化', E.compliance('改运转运'));
t('空串/null 安全', E.compliance('') === '' && E.compliance(null) === null);

/* ---- 7. 确定性 ---- */
const r1 = E.buildReport(1998, 6, 18, 7, { huxing: '两居室', orientation: '南' });
const r2 = E.buildReport(1998, 6, 18, 7, { huxing: '两居室', orientation: '南' });
t('buildReport 确定性(同输入同输出)', JSON.stringify(r1) === JSON.stringify(r2));
t('单人报告 6 板块', r1.sections.length === 6, String(r1.sections.length));
t('板块标题符合 PRD', JSON.stringify(r1.sections.map(s => s.title)) ===
  JSON.stringify(['你是怎样的人','好不好相处','爱好兴趣倾向','爱情配对解析','近期综合运势','居家环境民俗参考']));
const r3 = E.buildReport(1998, 6, 18, null, {});
t('无时辰报告 时宫为 null', r3.chart.palaces.hour === null);
t('无时辰报告仍 6 板块', r3.sections.length === 6);
t('buildReport 非法日期 null', E.buildReport(2023, 2, 30, 1, {}) === null);

/* ---- 8. 合盘 ---- */
const rels = ['恋人', '朋友', '同事'];
for (const rt of rels) {
  const rep = E.buildRelationReport({ y: 1998, m: 6, d: 18, hourZhi: 7 }, { y: 1996, m: 3, d: 8, hourZhi: 3 }, rt);
  t(`合盘 ${rt} 5 板块`, rep && rep.sections.length === 5, rep ? String(rep.sections.length) : 'null');
  t(`合盘 ${rt} 有契合度`, rep.relation.fit.score >= 55 && rep.relation.fit.score <= 96, String(rep.relation.fit.score));
}
const relDet = E.buildRelationReport({ y: 1998, m: 6, d: 18, hourZhi: 7 }, { y: 1996, m: 3, d: 8, hourZhi: 3 }, '恋人');
const relDet2 = E.buildRelationReport({ y: 1998, m: 6, d: 18, hourZhi: 7 }, { y: 1996, m: 3, d: 8, hourZhi: 3 }, '恋人');
t('合盘确定性', JSON.stringify(relDet) === JSON.stringify(relDet2));
t('合盘非法日期 null', E.buildRelationReport({ y: 2023, m: 2, d: 30 }, { y: 1996, m: 3, d: 8 }, '恋人') === null);

/* ---- 9. 契合矩阵覆盖完整性 ---- */
const elems = ['火', '土', '风', '水'];
let eleMiss = [];
for (const a of elems) for (const b of elems) {
  const k = a === b ? a + b : (E.ELE_PAIR[a + b] ? a + b : b + a);
  if (!E.ELE_PAIR[k]) eleMiss.push(a + b);
}
t('元素矩阵 10 组合全覆盖', eleMiss.length === 0, eleMiss.join(','));
let godMiss = [];
for (let i = 0; i < 6; i++) for (let j = i; j < 6; j++) {
  if (!E.GOD_PAIR[E.GODS[i] + '|' + E.GODS[j]]) godMiss.push(E.GODS[i] + E.GODS[j]);
}
t('六神配对 21 组合全覆盖', godMiss.length === 0, godMiss.join(','));

/* ---- 10. AI Prompt 构建 ---- */
const chart = E.buildChart(1998, 6, 18, 7);
const pr = E.buildAIPrompt(chart, { huxing: '两居室', orientation: '南' }, '小林');
t('AI Prompt 含合规规则', pr.system.includes('硬性合规规则'));
t('AI Prompt 含六节标题', ['【你是怎样的人】','【好不好相处】','【爱好兴趣倾向】','【爱情配对解析】','【近期综合运势】','【居家环境民俗参考】'].every(s => pr.system.includes(s)));
const prel = E.buildRelAIPrompt(relDet);
t('合盘 AI Prompt 动态标题', prel.system.includes('【TA是怎样的人】'));
t('AI Prompt 中的 user 为合法 JSON', (() => { try { JSON.parse(pr.user); return true; } catch (e) { return false; } })());

/* ---- 11. 今日一占 ---- */
const td = E.todayReading(new Date(2026, 8, 26, 10, 30));
t('今日一占返回结构', td && td.tone && td.doItem && td.slowItem && td.chart.palaces.hour);

/* ---- 12. 引擎无 DOM / localStorage 依赖（可独立测试的前提） ---- */
t('引擎无 document 依赖', !code.includes('document.'));
t('引擎无 window 依赖', !code.includes('window.'));
t('引擎无 localStorage 依赖', !code.includes('localStorage'));
t('引擎无 fetch 依赖', !code.includes('fetch('));

/* ---- 13. 全量禁词扫描：本地报告输出不应再含禁词（除六神名） ---- */
function scanBanned(rep) {
  const texts = [];
  for (const s of rep.sections) {
    texts.push(s.title, ...(s.paras || []), ...(s.paras2 || []));
    (s.lists || []).forEach(it => texts.push(it.k, it.v));
    (s.chips || []).forEach(g => texts.push(g.label, ...g.items));
  }
  const banned = ['风水', '吉凶', '改运', '转运', '辟邪', '镇宅', '破财', '漏财', '克命', '劫难'];
  const hits = [];
  for (const txt of texts) for (const b of banned) if (txt && txt.includes(b)) hits.push(b + '@' + txt.slice(0, 30));
  return hits;
}
const allReps = [
  E.buildReport(1985, 1, 25, 1, { huxing: '三居室', orientation: '东南' }),
  E.buildReport(2000, 8, 15, 12, { huxing: '一居室', orientation: '北' }),
  E.buildReport(1990, 12, 3, 23, {}),
  relDet,
];
let banHits = [];
allReps.forEach((r, i) => { if (r) banHits = banHits.concat(scanBanned(r).map(h => '#' + i + ' ' + h)); });
t('本地报告无禁词残留', banHits.length === 0, banHits.join(' ; '));

/* ---- 14. AI 输出解析（若 mergeRelAI 在引擎内则测） ---- */
if (E.mergeRelAI) {
  const txt = '【TA是怎样的人】\n段落一\n段落二\n\n【你们契合度解析】\n契合段落\n\n【相处指南】\n指南段落\n\n【雷区与加分点】\n雷区段落\n\n【升温小建议】\n建议段落';
  const merged = E.mergeRelAI(txt, relDet);
  t('mergeRelAI 正常合并', merged && merged.source === 'ai' && merged.sections[0].paras.length === 2);
  t('mergeRelAI 段落过合规', merged.sections.every(s => !s.paras.join('').includes('风水')));
  t('mergeRelAI 节数不足回退 null', E.mergeRelAI('只有一节【TA是怎样的人】内容', relDet) === null);
}

/* ---- 汇总 ---- */
console.log(`\n===== 测试结果: ${pass} 通过 / ${fail} 失败 =====`);
if (fails.length) { console.log('失败项:'); fails.forEach(f => console.log(' ✗ ' + f)); process.exit(2); }
