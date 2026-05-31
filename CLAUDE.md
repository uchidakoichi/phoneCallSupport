# FujiCall — CLAUDE.md

## プロジェクト概要

**FujiCall v2.0.0** — 電話かけ出しサポートアプリ「ふじキュン♡」  
藤沢市マスコット「ふじキュン♡」キャラクターが電話の台本を生成してくれる Web アプリ。

- **リポジトリ:** https://github.com/uchidakoichi/phoneCallSupport
- **デプロイ:** Vercel（projectId: `prj_ZjTWVqjsBRtmTsuRP0hXyXA84AqO`、プロジェクト名: `phone-call-support`）
- **ブランチ:** `master` のみ（PR 不要）

---

## 技術スタック

- **単一ファイル構成:** `index.html` のみ（HTML + CSS + JavaScript がすべて一体）
- **外部依存:** Supabase JS SDK（CDN）、Google Fonts（Noto Sans JP）
- **AI API:** Groq / Google Gemini / OpenAI（ユーザーが選択・クライアントサイドで直接呼び出し）
- **音声分析:** Hume AI（任意）
- **音声文字起こし:** Groq Whisper（Groq キー利用時）
- **クラウド同期:** Supabase（任意）

---

## 主要機能

1. **台本生成** — 通話相手（庁内/庁外）× 敬語レベル（謙譲語/標準/フレンドリー）× 目的テキストから AI が台本を生成
2. **デモモード** — API キー不要でサンプル台本を表示（6種類のテンプレート）
3. **音読練習モード** — 録音 → Whisper 文字起こし → Hume AI 声分析 → ふじキュン♡フィードバック
4. **成長ゲーミフィケーション** — レベル・バッジシステム（localStorage）
5. **クラウド同期** — Supabase で履歴・統計をクロスデバイス共有

---

## 作業ルール（必ず守ること）

### Git / GitHub
- **コミット後は自動で `git push origin master` する**（ユーザーから指示不要）
- force push・ブランチ削除など破壊的操作は事前確認する
- `.vercel/` は `.gitignore` に入っており、コミット対象外

### コーディング
- **`index.html` のみ編集する**（新規ファイルを作らない）
- CSS・HTML・JavaScript はすべて `index.html` 内に記述
- クラス名プレフィックスは `fC_`（FujiCall の命名規則）
- コメントは原則書かない（WHY が非自明な場合のみ）
- セキュリティ: API キーはすべて localStorage のみ。サーバー送信なし

### デプロイ
- `git push` すると Vercel が自動デプロイ（CI/CD 設定済み）
- 手動デプロイ操作は不要

---

## ファイル構成

```
MVPv2/
├── index.html        # アプリ本体（唯一の編集対象）
├── CLAUDE.md         # このファイル
├── README.md         # 講義課題用（編集不要）
├── bug-list.md       # 旧バグリスト（参考）
├── vpc-v1.md         # VPC メモ（参考）
├── .gitignore        # .vercel を除外
└── .vercel/          # Vercel 設定（Git 管理外）
```

---

## index.html の構造（JavaScript）

```
IIFE 内の主要な変数・関数:
  LEVELS / BADGES          — レベル・バッジ定義
  DEMO_TEMPLATES           — デモモード用サンプル台本（6種）
  getDemoScript()          — デモ台本を purpose で生成
  enterDemoMode()          — デモモード開始
  exitDemoMode()           — デモモード終了
  S                        — アプリ状態（apiKey, demoMode, callerType 等）
  loadStats() / saveStats() — ゲーミフィケーション統計
  renderGrowth()           — 成長カード描画
  recordCall()             — 台本生成1回分を統計に記録
  buildPrompt()            — AI プロンプト構築
  callGemini/Groq/OpenAI() — 各 API 呼び出し
  callWithRetry()          — レート制限時の自動リトライ
  generate()               — 台本生成（デモ/実API 分岐）
  openPractice()           — 音読練習パネル開く
  analyzeRecording()       — 録音を Whisper + Hume で分析
  renderPracticeResult()   — 練習結果描画（デモ時は固定フィードバック）
  initSupabase()           — Supabase 初期化
  syncFromCloud()          — クラウドから履歴・統計を取得
  init()                   — アプリ起動処理
```

---

## localStorage キー

| キー | 内容 |
|---|---|
| `fujiCall_apiKey` | AI API キー |
| `fujiCall_provider` | プロバイダー（groq/gemini/openai）|
| `fujiCall_history` | 台本履歴（最大3件）|
| `fujiCall_stats` | ゲーミフィケーション統計 |
| `fujiCall_humeKey` | Hume AI キー |
| `fujiCall_sbUrl` | Supabase URL |
| `fujiCall_sbKey` | Supabase anon key |
