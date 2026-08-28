// テストに使うシードを探すための道具（必要になったときだけ動かして、結果をケースに書き込む）。
// 「必ず負ける」「バーストで自滅する」「5ラウンド制覇する」といった状況は狙って作れないので、
// 乱数のシードを総当たりして条件に合うものを見つけ、それをテストに固定する。
//
//   node find-seeds.mjs           1ラウンド目の勝ち／負けを探す（速い）
//   node find-seeds.mjs --full    5ラウンド通しで走らせて 自滅／制覇 を探す（遅い）
import puppeteer from 'puppeteer-core';
import { findBrowser, assertServerUp } from './browser.mjs';
import { openGame } from './harness.mjs';

const full = process.argv.includes('--full');
await assertServerUp();
const browser = await puppeteer.launch({ executablePath: findBrowser(), headless: true, args: ['--no-sandbox'] });

if (!full) {
  const found = { win: [], lose: [] };
  for (let seed = 1; seed <= 40 && (found.win.length < 3 || found.lose.length < 3); seed++) {
    const g = await openGame(browser, { seed });
    await g.toBattle();
    await g.playUntilResult();
    const kind = await g.resultKind();
    if (kind === 'win' && found.win.length < 3) found.win.push(seed);
    if (kind === 'lose' && found.lose.length < 3) found.lose.push(seed);
    console.log(`seed ${String(seed).padStart(3)} → ${kind}`);
    await g.close();
  }
  console.log('\n=== 1ラウンド目 ===');
  console.log('  勝てる:', found.win.join(', ') || '(なし)');
  console.log('  負ける:', found.lose.join(', ') || '(なし)');
} else {
  // 手札を左から順に使う＝何も考えないプレイ。この打ち方だと超過が溜まりやすく、自滅が出る。
  const found = { burst: [], cleared: [] };
  for (let seed = 1; seed <= 60 && (found.burst.length < 2 || found.cleared.length < 2); seed++) {
    const g = await openGame(browser, { seed });
    const r = await g.playFullRun();
    if (r.kind === 'burst' && found.burst.length < 2) found.burst.push({ seed, round: r.round });
    if (r.kind === 'cleared' && found.cleared.length < 2) found.cleared.push({ seed, round: r.round });
    console.log(`seed ${String(seed).padStart(3)} → ${r.kind}（ROUND ${r.round}）`);
    await g.close();
  }
  console.log('\n=== 5ラウンド通し ===');
  console.log('  使いすぎで自滅:', found.burst.map((x) => `${x.seed}(R${x.round})`).join(', ') || '(なし)');
  console.log('  5ラウンド制覇  :', found.cleared.map((x) => `${x.seed}(R${x.round})`).join(', ') || '(なし)');
}

await browser.close();
