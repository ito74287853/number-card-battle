// テストランナー。
// ・ケースを順に回す
// ・1件落ちても止めずに最後まで回して集計する（手動テストで全項目を消化するのと同じ）
// ・証拠（説明を焼き込んだスクリーンショット）を自動で残す
// ・結果を report.md に書き出す
// ・失敗があれば終了コード1で終わる ＝ CI（GitHub Actions等）にそのまま載る
//
//   node run.mjs                 全件
//   node run.mjs --tag smoke     タグで絞る
//   node run.mjs BTL-01 RWD-02   IDを指定
//   node run.mjs BTL             接頭辞（画面）で絞る
import puppeteer from 'puppeteer-core';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { findBrowser, assertServerUp, APP_URL } from './browser.mjs';
import { openGame } from './harness.mjs';
import { cases } from './cases.mjs';
import { screens, PREFIX } from './screens.mjs';

// ---------- ケース定義そのものの検算 ----------
// IDの接頭辞と kind が食い違っていても、以前は誰も気づけなかった。
// 「同じ情報を2箇所に書いたらズレる」ので、機械に見張らせる。
{
  const problems = [], seen = new Set();
  for (const c of cases) {
    const p = String(c.id).split('-')[0];
    if (!PREFIX[p]) problems.push(`${c.id}: 未定義の接頭辞 "${p}"（${Object.keys(PREFIX).join(' / ')} のいずれか）`);
    else if (PREFIX[p].kind !== c.kind) problems.push(`${c.id}: 接頭辞 ${p} は kind='${PREFIX[p].kind}' のはずが '${c.kind}' になっている`);
    if (seen.has(c.id)) problems.push(`${c.id}: IDが重複している`);
    seen.add(c.id);
    if (!c.tags?.length) problems.push(`${c.id}: tags が空`);
  }
  if (problems.length) {
    console.error('ケース定義に問題があります:\n' + problems.map((p) => `  - ${p}`).join('\n'));
    process.exit(2);
  }
}

// ---------- 絞り込み ----------
const argv = process.argv.slice(2);
const tagIdx = argv.indexOf('--tag');
const tag = tagIdx >= 0 ? argv[tagIdx + 1] : null;
const ids = argv.filter((a, i) => !a.startsWith('--') && i !== tagIdx + 1);
const targets = cases.filter((c) =>
  (!tag || c.tags.includes(tag)) &&
  (!ids.length || ids.includes(c.id) || ids.includes(c.id.split('-')[0]))
);
if (!targets.length) { console.error('該当するケースがありません'); process.exit(2); }

const REPORT = fileURLToPath(new URL('./report/', import.meta.url));
rmSync(REPORT, { recursive: true, force: true });
mkdirSync(REPORT, { recursive: true });

await assertServerUp();
const browser = await puppeteer.launch({ executablePath: findBrowser(), headless: true, args: ['--no-sandbox'] });

const results = [];
let lastPrefix = null;
for (const c of targets) {
  const prefix = c.id.split('-')[0];
  if (prefix !== lastPrefix) { console.log(`\n── ${prefix}: ${PREFIX[prefix].name} ──`); lastPrefix = prefix; }

  // フォルダ名の先頭に実行順の連番を付ける。
  // IDのアルファベット順とゲームの流れは一致しないので、連番が無いと
  // エクスプローラで並べたときにタイトル画面が先頭に来ない。
  // ★ 連番は「全ケース中の位置」で決める（絞り込み実行でも番号がズレないように）
  const seq = String(cases.indexOf(c) + 1).padStart(2, '0');
  const dirName = `${seq}_${c.id}`;
  const dir = `${REPORT}${dirName}/`;
  mkdirSync(dir, { recursive: true });

  const checks = [], notes = [], shots = [];
  const t = {
    ok: (cond, msg) => checks.push({ ok: !!cond, msg }),
    is: (actual, expected, msg) => { const ok = Object.is(actual, expected); checks.push({ ok, msg, detail: ok ? null : `期待 ${JSON.stringify(expected)} / 実際 ${JSON.stringify(actual)}` }); },
    note: (msg) => notes.push(msg),
  };

  let crash = null, g;
  const started = Date.now();
  try {
    g = await openGame(browser, { seed: c.seed, shotDir: dir, viewport: c.viewport, caption: { id: c.id, title: c.title } });
    const orig = g.shot;
    g.shot = async (label) => { const n = await orig(label); if (n) shots.push(n); return n; };
    await c.run(g, t);
  } catch (e) {
    crash = String(e && e.message ? e.message : e);
  } finally {
    if (g) { try { await g.shot('終了時'); } catch {} await g.close(); }
  }

  const failed = checks.filter((k) => !k.ok);
  const status = crash ? 'ERROR' : c.kind === 'observation' ? 'RECORDED' : failed.length ? 'FAIL' : 'PASS';
  results.push({ ...c, prefix, seq, dirName, checks, notes, shots, crash, status, ms: Date.now() - started });

  const icon = { PASS: '✅', FAIL: '❌', ERROR: '💥', RECORDED: '📝' }[status];
  console.log(`${icon} ${seq}  ${c.id.padEnd(8)} ${c.title}   [${c.tags.join(', ')}]${crash ? `\n      💥 ${crash}` : ''}`);
  for (const k of failed) console.log(`      ✗ ${k.msg}${k.detail ? `（${k.detail}）` : ''}`);
  for (const n of notes) console.log(`      ・${n}`);
}

await browser.close();

const pass = results.filter((r) => r.status === 'PASS').length;
const fail = results.filter((r) => r.status === 'FAIL').length;
const error = results.filter((r) => r.status === 'ERROR').length;
const rec = results.filter((r) => r.status === 'RECORDED').length;

console.log(`\n${'='.repeat(56)}`);
console.log(`合格 ${pass} / 不合格 ${fail} / エラー ${error} / 記録のみ ${rec}   （${results.length}件${tag ? ` / タグ:${tag}` : ''}）`);
console.log(`レポート: ${REPORT}report.md`);

// ---------- report.md ----------
const stamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
let md = `# E2Eテスト結果\n\n- 対象: ${APP_URL}\n- 実行: ${stamp}${tag ? `\n- 絞り込み: タグ \`${tag}\`` : ''}\n- 結果: **合格 ${pass} / 不合格 ${fail} / エラー ${error} / 記録のみ ${rec}**（全${results.length}件）\n\n`;

let cur = null;
for (const r of results) {
  if (r.prefix !== cur) { md += `\n### ${r.prefix} — ${PREFIX[r.prefix].name}\n\n| # | ID | 結果 | 確認していること | タグ | 時間 |\n|---|---|---|---|---|---|\n`; cur = r.prefix; }
  const icon = { PASS: '✅ 合格', FAIL: '❌ 不合格', ERROR: '💥 エラー', RECORDED: '📝 記録' }[r.status];
  md += `| ${r.seq} | [${r.id}](#${r.id.toLowerCase().replace('-', '')}) | ${icon} | ${r.title} | ${r.tags.join(', ')} | ${(r.ms / 1000).toFixed(1)}s |\n`;
}

// 画面カバレッジ：テストが1件も無い画面／一度も出していない状態を機械的に洗い出す
md += `\n### 画面カバレッジ\n\n| 画面ID | 名前 | ケース数 | 状態カバレッジ |\n|---|---|---|---|\n`;
const touched = new Set(results.flatMap((r) => r.touches ?? []));
const gaps = [];
for (const s of screens) {
  const n = results.filter((r) => r.prefix === s.id).length;
  let cov = '—';
  if (s.variants) {
    const done = s.variants.filter((v) => touched.has(`${s.id}:${v}`));
    const miss = s.variants.filter((v) => !touched.has(`${s.id}:${v}`));
    cov = `${done.length}/${s.variants.length}`;
    if (miss.length) { cov += `（未：${miss.join(' / ')}）`; gaps.push(`${s.id} ${s.name} の状態が未テスト: ${miss.join(' / ')}`); }
  }
  if (n === 0) gaps.push(`${s.id} ${s.name} にテストが1件もない`);
  md += `| ${s.id} | ${s.name} | ${n} | ${cov} |\n`;
}
if (gaps.length) {
  md += `\n⚠️ **カバレッジの穴**\n\n` + gaps.map((x) => `- ${x}`).join('\n') + '\n';
  console.log(`\n⚠️ カバレッジの穴`);
  for (const x of gaps) console.log(`   - ${x}`);
}

md += `\n---\n\n`;
for (const r of results) {
  md += `## ${r.id}\n\n**${r.title}**\n\n> ${r.why}\n\n`;
  md += `- 画面: ${r.prefix} ${PREFIX[r.prefix].name}\n- タグ: ${r.tags.join(' / ')}\n- 乱数シード: ${r.seed}\n${r.touches?.length ? `- 到達する状態: ${r.touches.join(' / ')}\n` : ''}\n`;
  if (r.crash) md += `💥 **実行時エラー**: \`${r.crash}\`\n\n`;
  if (r.checks.length) {
    md += `| | 確認項目 |\n|---|---|\n`;
    for (const k of r.checks) md += `| ${k.ok ? '✅' : '❌'} | ${k.msg}${k.detail ? `<br>（${k.detail}）` : ''} |\n`;
    md += `\n`;
  }
  if (r.notes.length) md += r.notes.map((n) => `- ${n}`).join('\n') + '\n\n';
  if (r.shots.length) {
    md += `<details><summary>証拠（${r.shots.length}枚）</summary>\n\n`;
    for (const s of r.shots) md += `![${s}](${r.dirName}/${encodeURIComponent(s)})\n\n`;
    md += `</details>\n\n`;
  }
}
writeFileSync(`${REPORT}report.md`, md, 'utf8');

process.exit(fail + error > 0 ? 1 : 0);
