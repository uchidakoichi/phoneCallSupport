# FujiCall — CLAUDE.md

## プロジェクト概要

**FujiCall v3.0.0** — 電話かけ出しサポートアプリ「ふじキュン♡」  
藤沢市マスコット「ふじキュン♡」が電話台本を生成してくれる Web アプリ。  
ユーザーは API キーを一切入力せずに使える。

- **リポジトリ:** https://github.com/uchidakoichi/phoneCallSupport
- **本番 URL:** https://phone-call-support.vercel.app
- **デプロイ:** Vercel（projectId: `prj_ZjTWVqjsBRtmTsuRP0hXyXA84AqO`）
- **ブランチ:** `main`（master は削除済み）

---

## 現在の状態

### 直近の決定事項
- **AIは Groq のみ**（Gemini・OpenAI は廃止）。全リクエストはサーバープロキシ経由
- **ユーザー入力 API キーはゼロ**。Groq・Hume・Supabase はすべて Vercel 環境変数で管理
- **クラウド同期は OTP メール認証**（6桁コード）。ユーザーはメールアドレスだけ入力すればよい
- **設定モーダル・⚙️ボタンを削除**。テンプレートをハードルの高いビジネス場面に差し替え
- **Step 1/2/3 を UI から削除**（2026-06-08）。台本生成のエントリーポイントを「Q&Aで台本を作る」ダイアログのみに統一。通話相手・目的・敬語レベルはすべてダイアログ内の Q&A で収集する

### 未解決の課題
- Supabase の **Email Templates → Magic Link** を `{{ .Token }}` の6桁コード形式に変更する必要あり（まだ確認中）
- HUME_API_KEY は Vercel に未設定の可能性あり（声分析が動かない場合は要確認）

### 次にやること
- クラウド同期（OTP ログイン → 履歴引き継ぎ）の動作確認
- 必要に応じて Gemini 2.5 Flash TTS による台本読み上げ機能の追加

---

## 技術スタック

- **単一ファイル構成:** `index.html`（HTML + CSS + JS が一体）+ `api/` ディレクトリ（Vercel Serverless Functions）
- **外部依存:** Supabase JS SDK（CDN）、Google Fonts（Noto Sans JP）
- **AI:** Groq（llama-3.3-70b-versatile）— サーバー経由のみ
- **音声文字起こし:** Groq Whisper — サーバー経由のみ
- **声分析:** Hume AI — サーバー経由のみ（HUME_API_KEY 設定時のみ有効）
- **クラウド同期:** Supabase（共有プロジェクト。ユーザーは URL/キー不要）

---

## Vercel 環境変数（必須・任意）

| 変数名 | 用途 | 必須 |
|---|---|---|
| `GROQ_API_KEY` | 台本生成・Whisper 文字起こし | ✅ |
| `SUPABASE_URL` | クラウド同期 | ✅ |
| `SUPABASE_ANON_KEY` | クラウド同期 | ✅ |
| `HUME_API_KEY` | 音読練習の感情分析 | 任意 |

---

## 主要機能

1. **台本生成** — 通話相手（庁内/庁外）× 敬語レベル（謙譲語/標準/フレンドリー）× 目的テキストから Groq が台本を生成
2. **音読練習モード** — 録音 → Whisper 文字起こし → Hume AI 声分析 → ふじキュン♡フィードバック
3. **成長ゲーミフィケーション** — レベル・バッジシステム（localStorage）
4. **クラウド同期** — Supabase OTP（6桁コード）認証後、台本履歴・統計をクロスデバイス共有

---

## 作業ルール（必ず守ること）

### Git / GitHub
- **コミット後は自動で `git push origin main` する**（ユーザーから指示不要）
- force push・ブランチ削除など破壊的操作は事前確認する
- `.vercel/` は `.gitignore` に入っており、コミット対象外

### コーディング
- **`index.html` を主に編集する。API ルートは `api/` に追加する**
- CSS・HTML・JS はすべて `index.html` 内に記述
- クラス名プレフィックスは `fC_`（FujiCall の命名規則）
- コメントは原則書かない（WHY が非自明な場合のみ）
- API キーはすべて Vercel 環境変数（サーバー側）に持つ。クライアントに渡さない

### デプロイ
- `git push` すると Vercel が自動デプロイ（CI/CD 設定済み）
- 手動デプロイ操作は不要

---

## ファイル構成

```
MVPv2/
├── index.html              # アプリ本体
├── api/
│   ├── config.js           # Supabase URL/anon key + hasHumeKey を返す
│   ├── generate.js         # Groq テキスト生成プロキシ
│   ├── transcribe.js       # Groq Whisper 文字起こしプロキシ
│   ├── hume-submit.js      # Hume AI ジョブ送信プロキシ
│   ├── hume-status.js      # Hume AI ジョブ状態確認プロキシ
│   └── hume-predictions.js # Hume AI 結果取得プロキシ
├── .env.local.example      # 環境変数テンプレート
├── CLAUDE.md               # このファイル
├── README.md               # 講義課題用（編集不要）
└── .vercel/                # Vercel 設定（Git 管理外）
```

---

## index.html の主要 JS 構造

```
IIFE 内の主要な変数・関数:
  LEVELS / BADGES           — レベル・バッジ定義
  DEMO_TEMPLATES            — デモモード用サンプル台本（6種、UI非表示だが残存）
  S                         — アプリ状態（callerType, keigoLevel, demoMode 等）
  _sb / _sbUser             — Supabase クライアント・ログインユーザー
  _humeEnabled              — Hume AI が有効かどうか（api/config から取得）
  _authStep / _authEmail    — OTP 認証フロー状態
  loadStats() / saveStats() — ゲーミフィケーション統計
  renderGrowth()            — 成長カード描画
  callGroqProxy()           — /api/generate を呼ぶ
  callAPI()                 — callGroqProxy() に委譲
  callWithRetry()           — レート制限時の自動リトライ
  generate()                — 台本生成
  transcribeWithWhisper()   — /api/transcribe を呼ぶ
  analyzeWithHume()         — /api/hume-submit → pollHumeJob()
  pollHumeJob()             — /api/hume-status + /api/hume-predictions でポーリング
  renderPracticeResult()    — 練習結果描画
  initSupabase()            — /api/config フェッチ → _humeEnabled 設定 → Supabase 初期化
  openAuthModal()           — OTP 認証モーダルを開く
  renderAuthModal()         — 認証状態に応じた UI を描画（idle / code_sent / logged_in）
  syncFromCloud()           — クラウドから履歴・統計を取得
  init()                    — アプリ起動処理
```

---

## localStorage キー（現在使用中）

| キー | 内容 |
|---|---|
| `fujiCall_history` | 台本履歴（最大3件）|
| `fujiCall_stats` | ゲーミフィケーション統計 |

※ `fujiCall_apiKey` / `fujiCall_provider` / `fujiCall_humeKey` / `fujiCall_sbUrl` / `fujiCall_sbKey` は init() で自動削除済み

---

## 過去の経緯

- **2026-06-08:** Step 1/2/3（通話相手・目的・敬語レベル）と生成ボタンを UI から削除。Q&A ダイアログを唯一のエントリーポイントに統一（313行削減）
- **2026-06-06:** テンプレートをハードルの高いビジネス場面（ミスの謝罪・業務依頼・お断り・督促・クレーム対応）に差し替え。デモチップを削除
- **2026-06-06:** v3.0.0 リリース。D.modal の残存リスナーによる TypeError 修正、CSP に `cdn.jsdelivr.net` 追加
- **2026-06-03:** Hume AI キーをサーバー管理に移行（api/hume-*.js 追加）。ユーザー入力 API キーがゼロになった
- **2026-06-03:** Gemini・OpenAI を廃止し Groq のみに一本化。設定モーダル・⚙️ボタン・provider 関連コードを全削除（297行削減）
- **2026-06-01:** Supabase をユーザー設定から共有サーバー管理に移行（api/config.js）。認証を Magic Link から OTP（6桁コード）に変更
- **2026-06-01:** ブランチを master → main に移行（master 削除）
- **2026-05-31:** Groq の API キーを Vercel API Routes（api/generate.js, api/transcribe.js）に移行。ユーザーの Groq キー取得が不要になった
- **2026-05-31:** デモモードを実装（後にボタンを削除、コードは残存）
- **2026-05-31:** v2.0.0 — Supabase クラウド同期を追加（旧方式：ユーザーが URL/キーを入力）
