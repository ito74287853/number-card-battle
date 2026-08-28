// 端末にインストール済みの Edge / Chrome を探して puppeteer-core を起動する。
// puppeteer-core は Chromium を同梱しないので、実行ファイルの場所を自分で渡す必要がある。
// 見つからない環境では BROWSER_PATH 環境変数で明示できる。
//   例) $env:BROWSER_PATH = "C:\path\to\msedge.exe" ; node drive2.mjs
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CANDIDATES = [
  process.env.BROWSER_PATH,
  // Windows
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
  // macOS
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  // Linux
  '/usr/bin/microsoft-edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

export function findBrowser() {
  const found = CANDIDATES.find((p) => existsSync(p));
  if (!found) {
    throw new Error(
      'Edge も Chrome も見つかりませんでした。\n' +
      '環境変数 BROWSER_PATH に実行ファイルのパスを設定してから実行してください。\n' +
      '  PowerShell: $env:BROWSER_PATH = "C:\\path\\to\\msedge.exe"\n' +
      '  bash:       export BROWSER_PATH=/path/to/chrome'
    );
  }
  return found;
}

export async function launch() {
  const executablePath = findBrowser();
  console.log(`使用するブラウザ: ${executablePath}\n`);
  return puppeteer.launch({ executablePath, headless: 'new', args: ['--no-sandbox'] });
}

export const APP_URL = process.env.APP_URL || 'http://localhost:5199/';

// ゲーム側の論理解像度（src/core/config.js と同じ値）
export const GW = 640;
export const GH = 480;

// dev サーバーが起動しているかを先に確認して、落ちていたら分かりやすく止める
export async function assertServerUp() {
  try {
    const res = await fetch(APP_URL, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    throw new Error(
      `${APP_URL} に接続できませんでした（${e.message}）。\n` +
      'number-card-battle 側で `npm run dev -- --port 5199` を起動してから実行してください。\n' +
      '別のポートで動かしている場合は $env:APP_URL で指定できます。'
    );
  }
}
