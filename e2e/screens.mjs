// ============================================================
// 画面一覧（画面ID）
// ============================================================
// テストIDはこの画面IDを頭に付ける（例: SC03_BTL-01 = バトル画面の1件目）。
// ★ ケースを置く画面は「操作を始める画面」で決める。
//    例）「敵HPを0以下にすると勝利画面になる」は、操作するのはバトル画面なので SC03_BTL。
//        確認対象の結果画面は touches に書いて、状態のカバレッジとして別に数える。
//
// ★ 画面IDを先に決めておくと、「テストが1件も無い画面」「一度も出していない状態」が
//    機械的に分かる。手で項目書を作っていると、ここが一番抜けやすい。
// ============================================================

export const screens = [
  {
    id: 'SC01_TTL', name: 'タイトル画面',
    source: 'src/scenes/titleScene.js',
    desc: '起動直後。キー入力かクリックで次へ',
    next: ['SC02_RUL'],
  },
  {
    id: 'SC02_RUL', name: '「遊び方」画面',
    source: 'src/scenes/rulesScene.js',
    desc: 'ルールと操作方法の説明。決定でバトルへ',
    next: ['SC03_BTL'],
  },
  {
    id: 'SC03_BTL', name: 'バトル画面',
    source: 'src/scenes/battleScene.js（render）',
    desc: '手札からカードを使って敵HPを削る',
    next: ['SC04_RES'],
  },
  {
    id: 'SC04_RES', name: '結果画面',
    source: 'src/scenes/battleScene.js（renderBattleResult）',
    desc: 'そのラウンドの決着を表示',
    // 同じ画面でも見た目と分岐が変わるものは「状態」として数える
    variants: ['勝利', '敗北', '使いすぎで自滅', '5ラウンド制覇'],
    next: ['SC05_RWD', 'SC03_BTL'],
  },
  {
    id: 'SC05_RWD', name: '報酬画面',
    source: 'src/scenes/battleScene.js（renderReward）',
    desc: '報酬カード3枚から1枚選ぶ。スキップも可',
    next: ['SC03_BTL'],
  },
];

// 画面に紐づかない区分
export const groups = [
  { id: 'SYS', name: '画面横断・非機能', kind: 'test', desc: 'リスナーリーク / レスポンシブ / JSエラー' },
  { id: 'SPEC', name: '仕様確認（合否なし）', kind: 'observation', desc: '仕様が未確定で、事実だけ記録するもの' },
];

// run.mjs が使う索引：接頭辞 → { 名前, kind }
export const PREFIX = Object.fromEntries([
  ...screens.map((s) => [s.id, { name: s.name, kind: 'test', screen: s }]),
  ...groups.map((g) => [g.id, { name: g.name, kind: g.kind, screen: null }]),
]);
