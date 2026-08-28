// ============================================================
// テストケース定義
// ============================================================
// 【IDの決まり】  <画面ID/区分>-<連番>
//
//   SC01_TTL〜SC05_RWD  画面ID（画面一覧は screens.mjs が正）
//   SYS         画面をまたぐもの・非機能（リーク / レスポンシブ / エラー）
//   SPEC        仕様が未確定で、合否を出さず記録だけするもの
//
//   ★ ケースを置く画面は「操作を始める画面」で決める。
//      確認対象が別の画面なら touches に書いて、状態のカバレッジとして別に数える。
//   ★ IDは一度振ったら変えない。過去の報告書と突き合わせる鍵になるため。
//      連番は欠番が出ても詰めない（詰めると過去のIDが別のケースを指してしまう）。
//
// 【タグ】  後から変わる属性はIDに入れずタグで持つ
//
//   機能 / 非機能 / 回帰 / 仕様確認 … 何を見ているか
//   smoke                          … 毎回必ず回す最小限（node run.mjs --tag smoke）
//
//   ★「重要度」や「観点」は状況で変わる。IDに埋めると後から動かせなくなるので分ける。
//      これは TestRail の Section（機能ツリー）＋ Type/Priority と同じ構造。
// ============================================================
import { pause, rewardRect } from './harness.mjs';

// find-seeds.mjs で総当たりして見つけた、狙った状況になるシード。
// 「必ずこうなる」状況は狙って作れないので、シードを探して固定する。
const SEED_WIN = 1;     // 1ラウンド目に勝てる手札
const SEED_LOSE = 17;   // 1ラウンド目にどう使っても倒せない手札
const SEED_BURST = 10;  // 左から順に使うと ROUND4 で累積超過が上限を超える
const SEED_CLEAR = 9;   // 左から順に使うと 5ラウンド勝ち抜ける

export const cases = [
  // ---------------- SC01_TTL: タイトル画面 ----------------
  {
    id: 'SC01_TTL-01', kind: 'test', tags: ['機能', 'smoke'], seed: SEED_WIN,
    title: 'タイトル画面でキーを押すと「遊び方」画面へ進む',
    why: '入口。ここが折れると他のテストが全部意味を失う',
    async run(g, t) {
      t.is(await g.phase(), 'title', '起動直後はタイトル画面');
      await g.shot('起動直後：タイトル画面');
      await g.press('Enter'); await pause(350);
      t.is(await g.phase(), 'rules', 'Enterで「遊び方」画面へ');
      await g.shot('Enterを押した後：遊び方画面');
    },
  },
  {
    id: 'SC01_TTL-02', kind: 'test', tags: ['機能'], seed: SEED_WIN,
    title: 'タイトル画面はクリックでも進める',
    why: '画面には「press any key or tap」と出る。タップ側の経路も生きているか',
    async run(g, t) {
      t.is(await g.phase(), 'title', '起動直後はタイトル画面');
      await g.tapCenter(); await pause(350);
      t.is(await g.phase(), 'rules', 'クリックでも「遊び方」画面へ進む');
      await g.shot('クリックした後：遊び方画面');
    },
  },

  // ---------------- SC02_RUL: 「遊び方」画面 ----------------
  {
    id: 'SC02_RUL-01', kind: 'test', tags: ['機能', 'smoke'], seed: SEED_WIN,
    title: '「遊び方」画面からバトルへ進む',
    why: '第2版で追加した画面。ここで詰まるとゲームが始まらない',
    async run(g, t) {
      await g.press('Enter'); await pause(350);
      t.is(await g.phase(), 'rules', '前提：遊び方画面にいる');
      await g.shot('遊び方画面');
      await g.press('Enter'); await pause(350);
      t.is(await g.phase(), 'selecting', 'Enterでバトル画面へ');
      await g.shot('Enterを押した後：バトル画面');
    },
  },

  {
    id: 'SC02_RUL-02', kind: 'test', tags: ['機能'], seed: SEED_WIN,
    title: '「遊び方」画面はクリックでも進める',
    why: '画面には「クリック・Enter・Space でバトル開始」と出る。クリック側の経路も生きているか',
    async run(g, t) {
      await g.press('Enter'); await pause(350);
      t.is(await g.phase(), 'rules', '前提：遊び方画面にいる');
      await g.tapCenter(); await pause(350);
      t.is(await g.phase(), 'selecting', 'クリックでもバトル画面へ進む');
      await g.shot('クリックした後：バトル画面');
    },
  },

  // ---------------- SC03_BTL: バトル画面 ----------------
  {
    id: 'SC03_BTL-01', kind: 'test', tags: ['機能', 'smoke'], seed: SEED_WIN,
    title: '数字キーでカードを使える',
    why: 'キーボード操作は第3版で追加した機能。マウスと同じことができるか',
    async run(g, t) {
      await g.toBattle();
      t.ok(!(await g.cardUsed(0)), '使う前の1枚目は未使用');
      await g.shot('操作前：1枚目は未使用');
      await g.useCard(0); await pause(250);
      t.ok(await g.cardUsed(0), '数字キー[1]で1枚目が使用済みになる');
      await g.shot('数字キー[1]を押した後：1枚目が薄くなり敵HPが減った');
    },
  },
  {
    id: 'SC03_BTL-02', kind: 'test', tags: ['機能', 'smoke'], seed: SEED_WIN,
    title: 'マウス（タップ）でカードを使える',
    why: 'キーボードを足したあとも、元のマウス操作が壊れていないか',
    async run(g, t) {
      await g.toBattle();
      t.ok(!(await g.cardUsed(1)), '使う前の2枚目は未使用');
      await g.shot('操作前：2枚目は未使用');
      await g.tapCard(1); await pause(250);
      t.ok(await g.cardUsed(1), 'クリックで2枚目が使用済みになる');
      await g.shot('2枚目をクリックした後：2枚目が薄くなった');
    },
  },
  {
    id: 'SC03_BTL-03', kind: 'test', tags: ['機能'], seed: SEED_WIN,
    title: '使ったカードは二度使えない',
    why: '同じカードを連打して倒せてしまうと、ゲームとして成立しない',
    async run(g, t) {
      await g.toBattle();
      await g.useCard(0); await pause(250);
      const after1 = await g.phase();
      await g.shot('1枚目を1回使った状態');
      await g.useCard(0); await pause(250);
      await g.useCard(0); await pause(250);
      t.is(await g.phase(), after1, '同じカードを3回押しても状況が変わらない');
      t.ok(!(await g.cardUsed(1)), '隣のカードは巻き込まれていない');
      await g.shot('同じカードをさらに2回押した後：敵HPは変わっていない');
    },
  },
  {
    id: 'SC03_BTL-04', kind: 'test', tags: ['機能', 'smoke'], seed: SEED_WIN,
    title: '敵HPを0以下にすると勝利画面になる',
    why: '勝利条件そのもの',
    touches: ['SC04_RES:勝利'],
    async run(g, t) {
      await g.toBattle();
      await g.shot('バトル開始時');
      t.is(await g.playUntilResult(), 'battleResult', 'カードを使い切る前に結果画面へ移る');
      t.is(await g.resultKind(), 'win', '見出しが WIN! になっている');
      await g.shot('敵HPを0以下にした後：勝利画面');
    },
  },
  {
    id: 'SC03_BTL-05', kind: 'test', tags: ['機能'], seed: SEED_LOSE,
    title: '手札を使い切って倒せなければ敗北画面になる',
    why: '敗北条件。勝ちだけ確認して負けを確認しないテストは片手落ち',
    touches: ['SC04_RES:敗北'],
    async run(g, t) {
      await g.toBattle();
      await g.shot('バトル開始時：この手札では合計が敵HPに届かない');
      t.is(await g.playUntilResult(), 'battleResult', '5枚使い切ると結果画面へ移る');
      t.is(await g.resultKind(), 'lose', '見出しが LOSE... になっている');
      await g.shot('5枚使い切った後：敗北画面');
    },
  },

  {
    id: 'SC03_BTL-06', kind: 'test', tags: ['機能'], seed: SEED_WIN,
    title: '手札にない番号のキーを押しても何も起きない',
    why: '手札は5枚。6〜9や0を押したときに範囲外のカードを触りに行っていないか',
    async run(g, t) {
      await g.toBattle();
      await g.shot('操作前：5枚とも未使用');
      for (const k of ['Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0']) { await g.press(k); await pause(120); }
      t.is(await g.phase(), 'selecting', '画面が変わらない');
      for (let i = 0; i < 5; i++) t.ok(!(await g.cardUsed(i)), `${i + 1}枚目が使われていない`);
      t.is(g.errors.length, 0, `JSエラーも出ていない（実際: ${g.errors.join(' / ') || 'なし'}）`);
      await g.shot('6〜9と0を押した後：何も起きていない');
    },
  },
  {
    id: 'SC03_BTL-07', kind: 'test', tags: ['機能'], seed: SEED_WIN,
    title: 'カードの無い場所をクリックしても何も起きない',
    why: '当たり判定が広すぎると、意図しないカードが使われてしまう',
    async run(g, t) {
      await g.toBattle();
      await g.tapEmpty(); await pause(250);
      t.is(await g.phase(), 'selecting', '画面が変わらない');
      for (let i = 0; i < 5; i++) t.ok(!(await g.cardUsed(i)), `${i + 1}枚目が使われていない`);
      await g.shot('カードの無い場所をクリックした後：何も起きていない');
    },
  },

  // ---------------- SC04_RES: 結果画面 ----------------
  {
    id: 'SC04_RES-01', kind: 'test', tags: ['機能', 'smoke'], seed: SEED_WIN,
    title: '勝ったあと報酬画面に進める（Enter）',
    why: 'デッキが育つ導線。ここが切れるとゲームの根幹が消える',
    async run(g, t) {
      await g.toBattle();
      await g.playUntilResult();
      await g.shot('勝利画面：ここでEnterを1回押す');
      await g.press('Enter'); await pause(400);
      t.is(await g.phase(), 'reward', '「次のラウンドへ」で報酬画面が出る');
      await g.shot('Enterを1回押した後：報酬画面');
    },
  },
  {
    id: 'SC04_RES-02', kind: 'test', tags: ['機能'], seed: SEED_WIN,
    title: '「次のラウンドへ」ボタンのクリックでも進める',
    why: 'キーボードを足したあと、ボタンを押す元の経路が生きているか',
    async run(g, t) {
      await g.toBattle();
      await g.playUntilResult();
      await g.shot('勝利画面：ボタンをクリックする');
      await g.tapAction(); await pause(400);
      t.is(await g.phase(), 'reward', 'クリックでも報酬画面が出る');
      await g.shot('ボタンをクリックした後：報酬画面');
    },
  },
  {
    id: 'SC04_RES-03', kind: 'test', tags: ['機能'], seed: SEED_WIN,
    title: 'Space でも進める',
    why: '画面に「Enter/Space: 進む」と書いてある。Enterだけ動いてSpaceが死んでいないか',
    async run(g, t) {
      await g.toBattle();
      await g.playUntilResult();
      await g.press('Space'); await pause(400);
      t.is(await g.phase(), 'reward', 'Spaceでも報酬画面が出る');
      await g.shot('Spaceを押した後：報酬画面');
    },
  },
  {
    id: 'SC04_RES-04', kind: 'test', tags: ['機能'], seed: SEED_LOSE,
    title: '負けたあと「最初から」でやり直せる',
    why: '負けたら詰み、では遊べない。やり直しの導線',
    touches: ['SC04_RES:敗北'],
    async run(g, t) {
      await g.toBattle();
      await g.playUntilResult();
      t.is(await g.resultKind(), 'lose', '前提：敗北画面にいる');
      await g.shot('敗北画面：「最初から」を押す');
      await g.tapAction(); await pause(500);
      t.is(await g.phase(), 'selecting', 'バトル画面に戻る');
      for (let i = 0; i < 5; i++) t.ok(!(await g.cardUsed(i)), `${i + 1}枚目が未使用の状態で仕切り直しになる`);
      await g.shot('「最初から」を押した後：新しい手札で再開');
    },
  },
  {
    id: 'SC04_RES-05', kind: 'test', tags: ['機能'], seed: SEED_BURST,
    title: '累積超過が上限を超えると「使いすぎで自滅」になる',
    why: '第2版で足したバーストルールの本体。勝った試合でも負け扱いになるか',
    touches: ['SC04_RES:使いすぎで自滅'],
    async run(g, t) {
      const r = await g.playFullRun();
      t.is(r.kind, 'burst', `勝ち続けても累積超過で自滅する（ROUND ${r.round} で決着）`);
      await g.shot(`ROUND${r.round}：使いすぎで自滅`);
      await g.tapAction(); await pause(500);
      t.is(await g.phase(), 'selecting', '自滅したあともやり直せる');
    },
  },
  {
    id: 'SC04_RES-06', kind: 'test', tags: ['機能'], seed: SEED_CLEAR,
    title: '5ラウンド勝ち抜くと「制覇」表示になる',
    why: 'ゲームのゴール。ここに到達できないと、そもそもクリアできないゲームになる',
    touches: ['SC04_RES:5ラウンド制覇'],
    async run(g, t) {
      const r = await g.playFullRun();
      t.is(r.kind, 'cleared', '5ラウンド目を勝ち抜くと制覇の表示になる');
      t.is(r.round, 5, 'ROUND5で決着している');
      await g.shot('5ラウンド制覇');
    },
  },

  // ---------------- SC05_RWD: 報酬画面 ----------------
  {
    id: 'SC05_RWD-01', kind: 'test', tags: ['機能'], seed: SEED_WIN,
    title: '報酬カードを選ぶと次のラウンドが始まる',
    why: '報酬を選んだあと、ちゃんとバトルに戻れるか',
    async run(g, t) {
      await g.toBattle();
      await g.playUntilResult();
      await g.press('Enter'); await pause(400);
      await g.shot('報酬画面：左端のカードを選ぶ');
      await g.tapReward(0); await pause(400);
      t.is(await g.phase(), 'selecting', '報酬を選ぶとバトル画面に戻る');
      for (let i = 0; i < 5; i++) t.ok(!(await g.cardUsed(i)), `次ラウンドの${i + 1}枚目が未使用で始まる`);
      await g.shot('報酬を選んだ後：ROUND2が5枚とも未使用で始まる');
    },
  },
  {
    id: 'SC05_RWD-02', kind: 'test', tags: ['機能'], seed: SEED_WIN,
    title: '「スキップ」で報酬を取らずに次へ進める',
    why: 'スキップは第2版で追加した導線。押しても進めなくなっていないか',
    async run(g, t) {
      await g.toBattle();
      await g.playUntilResult();
      await g.press('Enter'); await pause(400);
      await g.shot('報酬画面：スキップを押す');
      await g.tapSkip(); await pause(400);
      t.is(await g.phase(), 'selecting', 'スキップでバトル画面に戻る');
      await g.shot('スキップした後：ROUND2が始まる');
    },
  },

  {
    id: 'SC05_RWD-03', kind: 'test', tags: ['機能'], seed: SEED_WIN,
    title: '数字キーで報酬カードを選べる',
    why: '報酬画面の下に「数字キー: カード選択」と出る。キー側の経路も生きているか',
    async run(g, t) {
      await g.toBattle();
      await g.playUntilResult();
      await g.press('Enter'); await pause(400);
      t.is(await g.phase(), 'reward', '前提：報酬画面にいる');
      await g.shot('報酬画面：数字キー[2]で真ん中を選ぶ');
      await g.press('Digit2'); await pause(400);
      t.is(await g.phase(), 'selecting', '数字キーで報酬を選ぶと次のラウンドが始まる');
      await g.shot('数字キー[2]を押した後：ROUND2が始まる');
    },
  },
  {
    id: 'SC05_RWD-04', kind: 'test', tags: ['機能'], seed: SEED_WIN,
    title: 'Enter でスキップできる',
    why: '報酬画面の下に「Enter/Space: スキップ」と出る。キー側の経路も生きているか',
    async run(g, t) {
      await g.toBattle();
      await g.playUntilResult();
      await g.press('Enter'); await pause(400);
      t.is(await g.phase(), 'reward', '前提：報酬画面にいる');
      await g.press('Enter'); await pause(400);
      t.is(await g.phase(), 'selecting', 'Enterでスキップして次のラウンドが始まる');
      await g.shot('Enterでスキップした後：ROUND2が始まる');
    },
  },
  {
    id: 'SC05_RWD-05', kind: 'test', tags: ['UI'], seed: SEED_WIN,
    title: '報酬カードにマウスを乗せると見た目が変わる',
    why: '第2版で足したホバー表示。どれを選ぼうとしているか分からないと選びにくい',
    async run(g, t) {
      await g.toBattle();
      await g.playUntilResult();
      await g.press('Enter'); await pause(400);
      const before = await g.purpleAt(rewardRect(1));
      await g.shot('ホバー前：どのカードも強調されていない');
      await g.hoverReward(1); await pause(400);
      const after = await g.purpleAt(rewardRect(1));
      t.ok(after > before, `マウスを乗せたカードが強調される（紫のピクセル ${before} → ${after}）`);
      t.ok((await g.purpleAt(rewardRect(0))) <= before, '乗せていない隣のカードは変わらない');
      await g.shot('真ん中のカードにマウスを乗せた後：そのカードだけ強調されている');
    },
  },

  // ---------------- SYS: 画面をまたぐもの・非機能 ----------------
  {
    id: 'SYS-01', kind: 'test', tags: ['非機能', '回帰', 'smoke'], seed: SEED_WIN,
    title: '画面を進めてもイベントリスナーが増えない',
    why: '第1版で実際に出た致命的バグ（キー開始で操作不能）の再発防止',
    async run(g, t) {
      const atTitle = await g.listeners();
      await g.toBattle();
      const atBattle = await g.listeners();
      await g.shot(`バトル到達時点のリスナー: ${atBattle.map((l) => `${l.tag}/${l.type}`).join(' , ')}`);
      await g.playUntilResult();
      await g.press('Enter'); await pause(400);
      await g.tapSkip(); await pause(400);
      const after = await g.listeners();
      t.is(after.filter((l) => l.tag === 'canvas' && l.type === 'click').length, 1, 'canvasのclickリスナーは常に1個');
      t.ok(after.length <= atBattle.length, `1周してもリスナーが増えていない（開始${atTitle.length} → バトル${atBattle.length} → 1周後${after.length}）`);
      await g.shot(`1周した後のリスナー: ${after.map((l) => `${l.tag}/${l.type}`).join(' , ')}`);
    },
  },
  {
    id: 'SYS-02', kind: 'test', tags: ['非機能', '回帰'], seed: SEED_WIN,
    viewport: { width: 420, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    title: 'スマホ幅で縮小表示されてもタップ位置がズレない',
    why: '第2版のレスポンシブ対応の担保。canvasをCSSで縮小すると当たり判定がズレる',
    async run(g, t) {
      await g.toBattle();
      t.is(await g.phase(), 'selecting', '狭い画面でもバトルまで進める');
      await g.shot('スマホ幅（420px）で表示：操作前');
      await g.tapCard(2); await pause(300);
      t.ok(await g.cardUsed(2), '狙った3枚目がちゃんと使われる（座標換算が効いている）');
      t.ok(!(await g.cardUsed(1)) && !(await g.cardUsed(3)), '隣のカードが誤爆していない');
      await g.shot('3枚目だけをタップした後：狙い通り3枚目だけが薄い');
    },
  },
  {
    id: 'SYS-03', kind: 'test', tags: ['非機能'], seed: SEED_WIN,
    title: '一周遊んでもJSエラーが出ない',
    why: '画面には出ないがコンソールに出る類の壊れ方を拾う',
    async run(g, t) {
      await g.toBattle();
      await g.playUntilResult();
      await g.press('Enter'); await pause(400);
      await g.tapReward(0); await pause(400);
      await g.playUntilResult();
      t.is(g.errors.length, 0, `JSエラーが0件（実際: ${g.errors.join(' / ') || 'なし'}）`);
      await g.shot(`2ラウンド遊んだ後：JSエラー ${g.errors.length}件`);
    },
  },

  // ---------------- SPEC: 合否を出さず記録するもの ----------------
  {
    id: 'SPEC-01', kind: 'observation', tags: ['仕様確認'], seed: SEED_WIN,
    title: '結果画面で Enter を押しっぱなしにしたとき',
    why: '意図的に長押ししないと起きない。直すか仕様のままにするか未決なので、合否を出さず事実だけ残す',
    async run(g, t) {
      await g.toBattle();
      await g.playUntilResult();
      await g.shot('勝利画面：ここでEnterを約1秒 長押しする');
      await g.hold('Enter', 900); await pause(500);
      const p = await g.phase();
      t.note(`結果画面で Enter を約1秒 長押しした後の画面: ${p}`);
      t.note(p === 'reward' ? '→ 報酬画面で止まった（1回押しと同じ挙動）' : '→ 報酬画面を通過して次ラウンドに入った（報酬カードを取れていない）');
      await g.shot(p === 'reward' ? 'Enter長押し後：報酬画面のまま' : 'Enter長押し後：報酬画面を飛ばしてROUND2へ');
    },
  },
  {
    id: 'SPEC-02', kind: 'observation', tags: ['仕様確認'], seed: SEED_WIN,
    title: '報酬画面で数字キーを押しっぱなしにしたとき',
    why: '同上。ただし次ラウンドのカードが1枚消費される点だけ、SPEC-01より影響が残る',
    async run(g, t) {
      await g.toBattle();
      await g.playUntilResult();
      await g.press('Enter'); await pause(400);
      await g.shot('報酬画面：ここで数字キー[1]を約1秒 長押しする');
      await g.hold('Digit1', 900); await pause(500);
      const p = await g.phase();
      const used = p === 'selecting' ? await g.cardUsed(0) : null;
      t.note(`報酬画面で [1] を約1秒 長押しした後の画面: ${p}`);
      t.note(used === null ? '→ バトル画面に来ていない' : used ? '→ 次ラウンドの1枚目が使用済みになっている（敵HPも削れている）' : '→ 次ラウンドのカードは手つかず');
      await g.shot(used ? '[1]長押し後：ROUND2の1枚目が勝手に使われている' : `[1]長押し後：${p}`);
    },
  },
];
