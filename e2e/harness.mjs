// ゲームを「業務の言葉」で操作・観測するための層。
// テストケース側は座標もピクセルも知らなくていい状態にするのが目的。
// （実務でいう Page Object / Screenplay パターンの、canvas ゲーム版）
import { APP_URL } from './browser.mjs';

export const GW = 640, GH = 480;
const CARD_W = 70, GAP = 12, CARD_Y = 190, CARD_H = 100;

const slotRect = (i, n) => {
  const startX = GW / 2 - (n * CARD_W + (n - 1) * GAP) / 2;
  return { x: startX + i * (CARD_W + GAP), y: CARD_Y, w: CARD_W, h: CARD_H };
};
export const handRect = (i) => slotRect(i, 5);
export const rewardRect = (i) => slotRect(i, 3);

const ACTION_BUTTON = { x: GW / 2 - 70, y: GH / 2 + 36, w: 140, h: 40 };
const SKIP_BUTTON = { x: GW / 2 - 70, y: CARD_Y + CARD_H + 30, w: 140, h: 40 };
const RULES_FOOTER = { x: 150, y: 434, w: 340, h: 26 };
const BOTTOM_HINT = { x: 150, y: 448, w: 340, h: 20 };   // バトル画面下部の操作ヒント

export async function openGame(browser, { seed = 777, shotDir = null, viewport = { width: 900, height: 760 }, caption = null } = {}) {
  const page = await browser.newPage();
  await page.setViewport(viewport);

  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.evaluateOnNewDocument((s) => {
    // ① 乱数を固定する。テストで一番効くのはこれ。
    //    毎回同じ手札・同じ敵HPになるので「たまたま通った / たまたま落ちた」が消える。
    let a = s >>> 0;
    Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

    // ② canvas の中身は DOM から見えないので、ピクセルを読む道具をページ側に置く
    window.__probe = {
      dpr: () => document.querySelector('canvas').width / 640,
      region(x, y, w, h) {
        const c = document.querySelector('canvas'), d = c.width / 640;
        return c.getContext('2d').getImageData(Math.round(x * d), Math.round(y * d), Math.max(1, Math.round(w * d)), Math.max(1, Math.round(h * d))).data;
      },
      // 明るさの最大値。白い文字があるかどうかの判定に使う
      maxLum(x, y, w, h) { const d = this.region(x, y, w, h); let m = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > m) m = d[i]; return m; },
      // 紫(#c084fc)のピクセル数。ボタンや強調テキストの有無に使う
      purple(x, y, w, h) { const d = this.region(x, y, w, h); let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 150 && d[i + 2] > 200 && d[i + 1] < 160) n++; return n; },
      // 結果画面の見出しの色から勝敗を読む
      //   WIN!=緑 #4ade80 ／ LOSE...=赤 #f87171 ／ 自滅=橙 #fb923c ／ 制覇=黄 #facc15
      resultColors(x, y, w, h) {
        const d = this.region(x, y, w, h);
        const c = { win: 0, lose: 0, burst: 0, cleared: 0 };
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          if (g > 180 && r < 140 && b < 180) c.win++;
          else if (r > 230 && g > 180 && b < 80) c.cleared++;
          else if (r > 220 && g > 120 && g < 180 && b < 110) c.burst++;
          else if (r > 220 && g > 90 && g < 150 && b > 90) c.lose++;
        }
        return c;
      },
    };

    // ③ イベントリスナーの増減を数える（リーク検出用）
    window.__listeners = [];
    const add = EventTarget.prototype.addEventListener, rm = EventTarget.prototype.removeEventListener;
    const tag = (t) => (t === window ? 'window' : (t.tagName || String(t)).toLowerCase());
    EventTarget.prototype.addEventListener = function (type, fn, o) { window.__listeners.push({ tag: tag(this), type }); return add.call(this, type, fn, o); };
    EventTarget.prototype.removeEventListener = function (type, fn, o) { const i = window.__listeners.findIndex((l) => l.tag === tag(this) && l.type === type); if (i >= 0) window.__listeners.splice(i, 1); return rm.call(this, type, fn, o); };
  }, seed);

  await page.goto(APP_URL, { waitUntil: 'networkidle0' });
  await pause(500);

  const rect = await page.$eval('canvas', (c) => { const b = c.getBoundingClientRect(); return { w: b.width, h: b.height }; });
  const probe = (fn, r) => page.evaluate(([f, a]) => window.__probe[f](...a), [fn, [r.x, r.y, r.w, r.h]]);
  let shotNo = 0;

  const g = {
    page, errors, seed,

    // ---------- 観測 ----------
    // 判定の順番が大事。上から順に「その画面にしか無いもの」で切っていく。
    //   ⚠️ カードの有無で selecting を判定してはいけない：
    //      タイトルの「数字カードバトル」(40px) が x160〜480 に描かれ、
    //      カード1枚目の領域(x121〜191)に食い込むので誤判定する（実際に一度ハマった）
    //      → 画面下部のヒント文の有無で見る。タイトル画面はここが空。
    async phase() {
      if (await probe('purple', ACTION_BUTTON) > 500) return 'battleResult';
      if (await probe('purple', SKIP_BUTTON) > 500) return 'reward';
      if (await probe('purple', RULES_FOOTER) > 20) return 'rules';
      if (await probe('maxLum', BOTTOM_HINT) > 60) return 'selecting';
      return 'title';
    },
    // 使用済みカードは半透明で描かれるので、白い数字の明るさで判定できる
    async cardUsed(i) { return (await probe('maxLum', handRect(i))) < 170; },
    async cardPresent(i) { return (await probe('maxLum', handRect(i))) > 60; },
    // 結果画面の見出しから 'win' | 'lose' | 'burst' | 'cleared' を読む
    async resultKind() {
      const c = await probe('resultColors', { x: 120, y: 150, w: 400, h: 55 });
      const best = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
      return best[1] > 60 ? best[0] : 'unknown';
    },
    listeners: () => page.evaluate(() => window.__listeners.filter((l) => l.type === 'click' || l.type === 'keydown')),

    // ---------- 操作 ----------
    tap: (r) => page.click('canvas', { offset: { x: (r.x + r.w / 2) * (rect.w / GW), y: (r.y + r.h / 2) * (rect.h / GH) } }),
    tapCenter: () => g.tap({ x: GW / 2 - 40, y: GH - 90, w: 80, h: 40 }),
    tapEmpty: () => g.tap({ x: GW / 2 - 40, y: 380, w: 80, h: 30 }),   // カードもボタンも無い場所
    tapCard: (i) => g.tap(handRect(i)),
    tapAction: () => g.tap(ACTION_BUTTON),
    async hover(r) {
      const b = await page.$eval('canvas', (c) => { const x = c.getBoundingClientRect(); return { x: x.x, y: x.y }; });
      await page.mouse.move(b.x + (r.x + r.w / 2) * (rect.w / GW), b.y + (r.y + r.h / 2) * (rect.h / GH));
    },
    hoverReward: (i) => g.hover(rewardRect(i)),
    // 指定範囲の紫ピクセル数。ホバーで見た目が変わったかの判定に使う
    purpleAt: (r) => probe('purple', r),
    tapReward: (i) => g.tap(rewardRect(i)),
    tapSkip: () => g.tap(SKIP_BUTTON),
    useCard: (i) => page.keyboard.press(`Digit${i + 1}`),
    press: (k) => page.keyboard.press(k),
    async hold(key, ms = 900) {
      const t0 = Date.now();
      await page.keyboard.down(key);
      while (Date.now() - t0 < ms) { await pause(70); await page.keyboard.down(key); }
      await page.keyboard.up(key);
    },

    // ---------- 進行のショートカット ----------
    async toBattle() { await g.press('Enter'); await pause(350); await g.press('Enter'); await pause(350); },
    async playUntilResult(order = [0, 1, 2, 3, 4]) {
      for (const i of order) {
        if ((await g.phase()) !== 'selecting') break;
        await g.useCard(i); await pause(160);
      }
      return g.phase();
    },

    // 5ラウンド通しで遊びきる。決着（勝ち抜け / 敗北 / 自滅）まで進めて結果を返す。
    // 報酬は常に左端を取る。到達しにくい状態（自滅・制覇）のシード探索に使う。
    async playFullRun(maxRounds = 5) {
      await g.toBattle();
      for (let r = 1; r <= maxRounds; r++) {
        await g.playUntilResult();
        const kind = await g.resultKind();
        if (kind !== 'win') return { kind, round: r };     // lose / burst / cleared
        if (r === maxRounds) return { kind: 'win', round: r };
        await g.press('Enter'); await pause(400);
        await g.tapReward(0); await pause(400);
      }
      return { kind: 'unknown', round: maxRounds };
    },

    // ---------- 証拠 ----------
    // スクリーンショットには必ず説明を焼き込む。
    // 画像を1枚だけ切り出して人に見せたときに、それだけで意味が通るようにするため。
    async shot(label) {
      if (!shotDir) return null;
      await page.evaluate(({ head, sub }) => {
        let el = document.querySelector('#__cap');
        if (!el) {
          el = document.createElement('div');
          el.id = '__cap';
          el.style.cssText = 'position:fixed;left:0;right:0;top:0;padding:8px 14px;background:#c084fc;color:#16171d;z-index:99999;text-align:center;font-family:sans-serif';
          document.body.appendChild(el);
        }
        el.innerHTML = '';
        if (head) {
          const h = document.createElement('div');
          h.textContent = head;
          h.style.cssText = 'font:600 12px/1.4 sans-serif;opacity:.7';
          el.appendChild(h);
        }
        const s = document.createElement('div');
        s.textContent = sub;
        s.style.cssText = 'font:bold 16px/1.5 sans-serif';
        el.appendChild(s);
      }, { head: caption ? `${caption.id}  ${caption.title}` : '', sub: label });
      await pause(120);
      const name = `${String(++shotNo).padStart(2, '0')}-${label.replace(/[\\/:*?"<>|]/g, '')}.png`;
      await page.screenshot({ path: shotDir + name });
      return name;
    },
    close: () => page.close(),
  };
  return g;
}

export const pause = (ms) => new Promise((r) => setTimeout(r, ms));
