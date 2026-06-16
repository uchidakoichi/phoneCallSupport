# FujiCall — CLAUDE.md

## プロジェクト概要

**FujiCall v4.0.0** — 電話かけ出しサポートアプリ「ふじキュン♡」  
藤沢市マスコット「ふじキュン♡」が電話台本を生成してくれる Web アプリ。  
ユーザーは API キーを一切入力せずに使える。

- **リポジトリ:** https://github.com/uchidakoichi/phoneCallSupport
- **本番 URL:** https://phone-call-support.vercel.app
- **デプロイ:** Vercel（projectId: `prj_ZjTWVqjsBRtmTsuRP0hXyXA84AqO`）
- **ブランチ:** `main`（master は削除済み）

---

## 現在の状態

### 直近の決定事項
- **Q&Aを「自由記述 → AIが不足質問 → 敬語調整」に再設計**（2026-06-14）。固定4択（場面の軸が混在し、社内/社外どちらにもある「お詫び」を表現できなかった）を廃止。
  - ① 自由記述（どんな電話か）→ ② その記述を Groq に渡し、`fetchClarify()`/`parseClarify()` が**不足している項目だけ**を質問として返す（1問ずつ提示。`callGroqProxy` で JSON 指示、寛容な抽出＋12秒タイムアウト、失敗/遅延は固定質問 `FALLBACK_QS` へフォールバック）→ ③ 敬語レベル → 生成
  - 「難しいと感じる点」は台本プロンプトから除外し、**生成後の別カード `#fC_advice`** へ移動。不安を選ぶと `handleConcern()` が**台本とは別の励まし＋具体的コツ**を Groq で返す（「特にない」は API を呼ばず即返答）
  - 「作り直す」を**微調整つき**に強化。`S.genCtx{freeText, clarifyPairs, tone}` を保持し、結果の「🙇もっと丁寧に / 😊やわらかく」チップ（`adjustTone()`）で**同じ内容のまま敬語だけ変えて再生成**。通常の「🔄作り直す」は同条件の引き直し
  - 通話相手（庁内/庁外）は `inferCaller()` が記述＋回答から推定（履歴/印刷/フォローアップ用）。デプロイ環境でAI質問・生成・アドバイス・微調整を end-to-end 確認済み（社内のお詫び台本が正しく生成されることを確認）
- **v4.0.0 全方位の品質磨き**（2026-06-14）。8観点の監査＋差分の敵対的レビュー（ワークフロー）を経て実施:
  - **効果音＋触覚（既定OFF）**: Web Audio API 合成のみ（ファイル/CDN不使用＝CSP安全）。ヘッダーの🔔/🔇トグル（`localStorage: fujiCall_sfx`）で音と触覚を一括ON/OFF。`_ac()`遅延生成→`playTone`/`playChord`→`sfx(name)`（70msスロットル・sine/triangle・gain≤0.16）。`tap/success/levelup/badge/copy/recStart/recStop/error` を生成完了・コピー・録音・レベルアップ・バッジ・タップ等にフック。**autoplay対策で `init()` では音を鳴らさない**（初回は必ずユーザー操作起点）
  - **配色をふじキュンのラベンダー基調に**: `--accent` をピンク#f06292→#9575cd（ほっぺの色）、小ラベル用に `--primary-text`(#00747f)・`--accent-deep`(#5e35b1) を追加しAAコントラスト確保。暗色の成長カードも紫系へ調和
  - **文言を優しい友達ボイスに統一**: `preGenMsg`/`postGenMsg` の「戦士/マスター」ペルソナを撤廃し、レベル名（はじめまして〜無二の親友）に沿った穏やかな応援に。「台本なしでも話せる」等の煽りを排除。エラー文言から生メッセージ漏れを除去、グローバルエラーは抑制（ノイズ無視＋8秒スロットル）
  - **演出**: 台本リベール（`fC_reveal`）、全タップ要素の`:active`、レベルアップ紙吹雪（`burstConfetti`）、考え中の3点ドット、Q&A選択の確定フラッシュ
  - **A11y/モバイル**: reduced-motion を全アニメに拡張＋JSパーティクルもガード、`safe-area-inset`、Q&Aの最初の選択肢へフォーカス＋`role=group`、認証モーダルのフォーカストラップ＋復帰、結果アクションを2×2グリッド＋44pxタッチターゲット、iOS入力ズーム抑止（16px）
  - **バグ/堅牢化**: デモ機能一式削除、**「作り直す」は直前/履歴の条件を再利用**、**生成失敗時はQ&A回答を保持（`openDialog()`は成功時のみ）**、録音パネルを閉じたらマイク確実解放（取得待ち・解析中も中断）、クラウド統計を**非破壊マージ**（`mergeStats`＋`_syncing`再入ガード＋履歴重複排除）、ポーズ画像の先読み、連続来訪ストリーク
- **AIは Gemini（gemini-2.5-flash）のみに一本化**（2026-06-16）。Groq・Hume を廃止。理由: **Hume Expression Measurement API が 2026-06-14 にサンセット**（声分析が動かなくなった）。代替検討の結果、無料枠があり音声をネイティブ入力できる Gemini に台本生成も含めて統合。台本生成・clarify・アドバイス・フォローアップは `/api/generate`、音読練習は `/api/analyze-voice`（音声→文字起こし＋声の評価をJSON 1コール）。**録音は webm/opus だが Gemini は非対応のため、クライアントで `blobToWav()` が 16kHz mono WAV に変換**（Vercel 4.5MB ボディ上限対策で最長90秒）。Groq の即時性は失うが日本語品質とコードの単純さは向上。**無料枠は入力/出力がモデル改善に利用される**（MVP用途のため許容と判断）。**Vercel に GEMINI_API_KEY を設定して本番デプロイ済み、台本生成・音読練習（文字起こし＋スコア）を end-to-end 確認済み（2026-06-16）**
- **ユーザー入力 API キーはゼロ**。Gemini・Supabase はすべて Vercel 環境変数で管理
- **クラウド同期はログインコード認証**（2026-06-14 にマジックリンクから再変更）。理由: **ホーム画面アプリ（iOS standalone PWA）ではメール内リンクが必ず Safari 側で開き**、standalone とは別のストレージ領域のためアプリ内でセッションを受け取れない（マジックリンクは原理的に完結しない）。リダイレクト不要のコード入力なら standalone でも完結する。フロー: `signInWithOtp({email})` 送信 → メールのコードを入力 → `verifyOtp({email, token, type:'email'})` → `onAuthStateChange(SIGNED_IN)` でログイン完了。`emailRedirectTo` も残しているのでブラウザではメール内リンクからもログイン可。**コード桁数は Supabase の設定依存（このプロジェクトは8桁）**。入力欄は `maxlength=10`・検証は `\d{4,10}` で桁数変更にも耐える（以前 `maxlength=6` で8桁が切り詰められ検証失敗するバグを修正）。**前提: Supabase のメールテンプレートに `{{ .Token }}` を含める設定**（既定はリンクのみ送るため）
- **アプリアイコン・favicon を追加し PWA（standalone）対応**（2026-06-14）。「ホーム画面に追加」時のアイコン無し問題に対応。ふじキュンをパステル背景に合成した不透明アイコンを `assets/icons/`（apple-touch-icon 180／icon 192・512／favicon 16・32）とルート `favicon.ico` に配置。`<head>` に `icon`/`apple-touch-icon`/`manifest`/`theme-color(#9575cd)`/`apple-mobile-web-app-*` を追加、`site.webmanifest`（standalone・名称「ふじキュン♡」）。standalone を有効化したことが上記「ログインコード認証」への変更理由（マジックリンクが standalone で完結しないため）
- **設定モーダル・⚙️ボタンを削除**。テンプレートをハードルの高いビジネス場面に差し替え
- **Step 1/2/3 を UI から削除**（2026-06-08）。台本生成のエントリーポイントを「Q&Aで台本を作る」ダイアログのみに統一。通話相手・目的・敬語レベルはすべてダイアログ内の Q&A で収集する
- **Q&A をモーダルからインライン表示に変更**（2026-06-08）。「はじめる」ボタン・オーバーレイを廃止し、ページロード時に Q&A チャットが自動起動。台本生成後は即座にリセットされ次の台本作りを開始できる
- **展開別フォローアップ台本機能を追加**（2026-06-08）。メイン台本生成後、「この後の展開に備える」パネルが表示される。😤怒られた・🚫断られた・👔上司を出せ・💬揚げ足を取られた・🤔詳しく説明を求められた・⏳担当者が不在 の6シナリオを選択すると対応台本を追加生成。何段階でも連鎖可能（元台本〜これまでの対応をすべてコンテキストに含める）
- **印刷を専用台本レイアウトに刷新**（2026-06-13）。Web ページをそのまま印刷するのをやめ、印刷ボタン押下時に `buildPrintDoc()` が専用の印刷用ドキュメント（`#fC_printDoc`）を生成。タイトル・メタ情報（通話相手/目的/敬語レベル/作成日）・大きく読みやすいメイン台本・フォローアップ台本を、声に出して読むためのきれいなレイアウトで出力する。〇〇プレースホルダーは記入欄として強調表示
- **音読練習モードの台本を全文表示に変更**（2026-06-13）。`.fC_prac-script` の高さ制限（`max-height:140px; overflow-y:auto`）を撤廃し、スクロールなしで台本全体を一度に表示。読み上げやすいようフォント（0.88→0.95rem）・行間（1.7→1.85）も拡大
- **ふじキュンを実画像で登場させ、表情を出し分け**（2026-06-14）。「UI に可愛さ・親しみやすさがない」という指摘への対応。藤沢市公式イラスト（[利用ページ](https://www.city.fujisawa.kanagawa.jp/kouhou/fujikyun.html)）から場面別 10 ポーズを取得し Web 最適化（420px・55〜96KB）して `assets/fujikyun/` に同梱。絵文字代用をやめ、`FUJI` マップ＋`setFujiPose()` で状態に応じて表情を切り替える（normal/think/happy/cheer/listen/celebrate/love/bow/sparkle/surprise）。画像欠落時は `fujiImgErr()` で `data-emoji` のフォールバック表示
- **マスコットバーをキャラ＋吹き出し化＋タップ反応**（2026-06-14）。`#fC_mascotImg` を `.fC_mascot-char`（ぴょこぴょこ `fujiBob` アニメ）と `.fC_mascot-bubble`（しっぽ付き吹き出し）に再構成。ふじキュンをタップすると `fujiTap()` がランダムで一言＋ポーズ変化＋`burstHearts()`（ハート演出）を発火
- **成長カードを「ふじキュンとの関係」に再設計**（2026-06-14）。`LEVELS` の名称を関係性（はじめまして→顔なじみ→電話の相棒→心の友→無二の親友）に変更し、`pose` フィールドを追加。アバター `#fC_avatar` を絵文字 `<div>` から実画像 `<img>` に変更。レベルアップ演出を「仲が深まった」表現＋お祝いポーズ＋ハートに
- **電話後の報告・デイリーひとことを追加**（2026-06-14）。台本コピー時に `afterCopy()` が「いってらっしゃい（おじぎポーズ）＋ハート」を出し、報告カード `#fC_report`（😊できた / 😣緊張した → 労い）を表示。`init()` 起動時あいさつを日替わり文言＋応援ポーズに。Q&A 相手アイコン（`appendDlgMsg`）と練習フィードバックアイコンもふじキュン画像化
- **フッターに公式クレジットを追加**（2026-06-14）。`.fC_credit` に「イラスト：「キュンとするまち。藤沢」公式マスコットキャラクター ふじキュン♡ ©藤沢市」。公式の利用条件は **販売目的以外は無料・申請不要、名称または ©藤沢市 の付記が必要**

### 未解決の課題
- **【要対応】Supabase のメールテンプレートにログインコード `{{ .Token }}` を含めること**（ダッシュボード → Authentication → Email Templates → Magic Link/OTP）。未設定だとメールにコードが載らず、ホーム画面アプリでのコード入力ログインが成立しない。ブラウザでのリンクログインも併用するなら Redirect URLs に本番 URL の登録も必要。コード桁数は Authentication の設定依存（現状8桁。アプリ側は4〜10桁を許容）
- **コード認証の実機確認（コード送信→入力→ログイン→同期）はデプロイ後に要確認**。特に iOS ホーム画面アプリ（standalone）で完結するかを確認
- `onAuthStateChange` の `SIGNED_IN` 判定でログイン完了トーストを出しているが、古い supabase-js だと通常リロード時にも `SIGNED_IN` が発火する版があり、その場合リロードのたびにトーストが出る可能性あり（現行の `@supabase/supabase-js@2` は `INITIAL_SESSION` を発火するため問題なし）
- ~~【要対応】Vercel に `GEMINI_API_KEY` を設定し GROQ/HUME を削除~~ → **完了（2026-06-16）**。Vercel に `GEMINI_API_KEY` を設定・再デプロイし、本番で台本生成・音読練習（文字起こし＋スコア）を end-to-end 確認済み
- **iOS Safari での WAV 変換（`decodeAudioData`/`OfflineAudioContext`）と90秒超の録音（4.5MB上限）は環境次第で要確認**（基本フローは確認済み。特定端末で声分析が失敗する場合はここを疑う）
- **ふじキュン公式イラストを公開リポジトリに同梱している**。非販売の本アプリは公式の利用条件（申請不要・クレジット付記）の範囲内だが、再配布扱いを避けたい場合はフォールバック絵文字運用に戻せる
- ~~2026-06-14 のふじキュン演出は API を伴う一連の流れの本番通し確認が必要~~ → **本番で end-to-end 確認済み（2026-06-14）**：効果音トグル・Q&A→生成（入力反映）→台本リベール→〇〇強調→レベルアップ（お祝い＋紙吹雪＋ファンファーレ）→2×2アクション→コピー（おじぎ＋報告カード）まで通し、アプリ起因のコンソールエラーなし

### 次にやること
- クラウド同期（マジックリンクログイン → 履歴引き継ぎ）の動作確認
- 必要に応じてポーズ追加（公式 484 種から「困った顔」等）・Gemini 2.5 Flash TTS による台本読み上げ機能の追加

---

## 技術スタック

- **単一ファイル構成:** `index.html`（HTML + CSS + JS が一体）+ `api/` ディレクトリ（Vercel Serverless Functions）
- **外部依存:** Supabase JS SDK（CDN）、Google Fonts（Noto Sans JP）
- **AI:** Google Gemini（gemini-2.5-flash）— サーバー経由のみ
- **音声文字起こし＋声分析:** Gemini 2.5 Flash（音声をネイティブ入力）— サーバー経由のみ（`/api/analyze-voice` が1コールで文字起こし＋声の評価を返す）
- **クラウド同期:** Supabase（共有プロジェクト。ユーザーは URL/キー不要）

---

## Vercel 環境変数（必須・任意）

| 変数名 | 用途 | 必須 |
|---|---|---|
| `GEMINI_API_KEY` | 台本生成・音読練習の文字起こし＆声分析 | ✅ |
| `SUPABASE_URL` | クラウド同期 | ✅ |
| `SUPABASE_ANON_KEY` | クラウド同期 | ✅ |

> **取得先:** https://aistudio.google.com/apikey （無料枠：1,500 req/日・15 RPM・クレカ不要）。**無料枠は入力/出力がモデル改善に利用される**点に注意（MVP用途のため許容）。

---

## 主要機能

1. **台本生成** — ①自由記述 → ②AIが不足項目だけ質問（社内/社外・初回など）→ ③敬語レベル（謙譲語/標準/フレンドリー）→ Groq が台本を生成。生成後は不安アドバイス・敬語微調整つき作り直しも可能
2. **音読練習モード** — 録音 → クライアントで WAV(16kHz mono) 変換 → Gemini が文字起こし＋声の評価（自信度/不安度/エネルギー/落ち着き）を1コールで返す → ふじキュン♡フィードバック
3. **成長ゲーミフィケーション** — レベル・バッジシステム（localStorage）
4. **クラウド同期** — Supabase ログインコード認証後、台本履歴・統計をクロスデバイス共有

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
├── assets/
│   └── fujikyun/           # 藤沢市公式イラスト 10 ポーズ（©藤沢市・Web最適化済）
│       ├── normal.png      # 基本（待機・あいさつ）
│       ├── think.png       # ノートPC（考え中・生成中）
│       ├── happy.png       # OK看板（台本完成）
│       ├── cheer.png       # チア（応援・励まし）
│       ├── listen.png      # 大声（音読練習・録音中）
│       ├── celebrate.png   # おめでとう（レベルアップ）
│       ├── love.png        # ハート（労い・なぐさめ）
│       ├── bow.png         # おじぎ（いってらっしゃい）
│       ├── sparkle.png     # きらきら（タップ反応）
│       └── surprise.png    # おどろき（タップ反応）
│   └── icons/              # アプリアイコン・favicon（ふじキュンをパステル背景に合成）
│       ├── apple-touch-icon.png  # 180px・iOSホーム画面
│       ├── icon-192.png / icon-512.png  # Android/PWA
│       ├── favicon-16.png / favicon-32.png
│       └── site.webmanifest
├── favicon.ico             # ルート（ブラウザ自動取得・16/32/48）
├── api/
│   ├── config.js           # Supabase URL/anon key + hasVoiceKey を返す
│   ├── generate.js         # Gemini テキスト生成プロキシ
│   └── analyze-voice.js    # Gemini 音声分析プロキシ（文字起こし＋声の評価をJSONで返す）
├── .env.local.example      # 環境変数テンプレート
├── .gitignore              # .vercel / .claude を除外
├── CLAUDE.md               # このファイル
├── README.md               # 講義課題用（編集不要）
└── .vercel/                # Vercel 設定（Git 管理外）
```

---

## index.html の主要 JS 構造

```
IIFE 内の主要な変数・関数:
  LEVELS / BADGES           — レベル・バッジ定義（LEVELS は関係性名＋pose を持つ）
  DEMO_TEMPLATES            — デモモード用サンプル台本（6種、UI非表示だが残存）
  S                         — アプリ状態（callerType, keigoLevel, demoMode 等）
  _sb / _sbUser             — Supabase クライアント・ログインユーザー
  _voiceEnabled             — 声分析(Gemini)が有効かどうか（api/config の hasVoiceKey）
  _authStep / _authEmail    — コード認証フロー状態（idle / code_sent）
  FUJI                      — ふじキュンのポーズ→画像/絵文字フォールバック マップ
  setFujiPose(pose)         — マスコット画像 #fC_mascotImg を pose に切り替え（pop アニメ）
  mascot(msg, pose)         — 吹き出しメッセージ更新＋任意でポーズ切替
  window.fujiImgErr(img,e)  — 画像読み込み失敗時に data-emoji へフォールバック
  FUJI_TAPS / fujiTap()     — ふじキュンをタップした時のランダム反応
  burstHearts()             — ハートが舞う演出（#fC_fxLayer に生成）
  showReport()/handleReport()/afterCopy() — 電話後の報告カード（#fC_report）制御
  loadStats() / saveStats() — ゲーミフィケーション統計
  renderGrowth()            — 成長カード描画（アバターは #fC_avatar の <img>）
  callGemini()              — /api/generate を呼ぶ（旧 callGroqProxy）
  callAPI()                 — callGemini() に委譲
  callWithRetry()           — レート制限時の自動リトライ
  generate()                — 台本生成
  buildPrintDoc()           — 印刷用ドキュメント（#fC_printDoc）を生成。印刷ボタン押下時に呼ぶ
  analyzeVoice()            — WAV変換→/api/analyze-voice を呼び {transcript, scores} を返す
  blobToWav()/encodeWav()   — 録音(webm/opus)を 16kHz mono WAV に変換（Gemini対応・Vercel 4.5MB上限対策に最長90秒）
  renderPracticeResult()    — 練習結果描画
  initSupabase()            — /api/config フェッチ → _humeEnabled 設定 → Supabase 初期化
  openAuthModal()           — 認証（ログインコード）モーダルを開く。verifyOtp でコード検証
  renderAuthModal()         — 認証状態に応じた UI を描画（idle / link_sent / logged_in）
  syncFromCloud()           — クラウドから履歴・統計を取得
  _ac()/playTone()/playChord()/SFX/sfx()/haptic() — Web Audio 効果音＋触覚（既定OFF）
  toggleSound()/updateSoundBtn() — ヘッダー🔔/🔇トグル（fujiCall_sfx）
  burstHearts(opts)/burstConfetti() — ハート／レベルアップ紙吹雪（reduced-motionでJSガード）
  showThinking()/renderScriptBox()/revealEl()/focusScript() — 台本リベール・〇〇強調・フォーカス
  applyGeneratedScript()/onGenError() — 生成成功/失敗の共通処理（失敗時は直前台本を復元）
  renderDescribeStep()/submitDescribe() — Q&A①自由記述
  fetchClarify()/parseClarify()/renderClarifyStep() — Q&A②AIが不足項目だけ質問（失敗時 FALLBACK_QS）
  renderToneStep()/dlgFinish() — Q&A③敬語レベル→生成ボタン
  buildPromptFromCtx()/inferCaller() — S.genCtx から生成プロンプト・通話相手推定
  generate()                — 「作り直す」: S.lastPrompt（無ければ buildPrompt）で再生成
  generateFromDialog()      — Q&Aから生成。S.genCtx 保持。成功時のみ openDialog() でリセット
  adjustTone(dir)           — 同内容のまま敬語だけ変えて再生成（🙇もっと丁寧に/😊やわらかく）
  showAdvice()/hideAdvice()/handleConcern() — 生成後の不安アドバイス（台本とは別の励まし＋コツ）
  releaseMic()/abortRecording() — 録音中/取得待ち/解析中のマイク確実解放
  mergeStats()              — ローカル/クラウド統計の非破壊マージ
  updateStreak()/preloadFujiPoses() — 連続来訪・ポーズ画像先読み
  _authTrap()               — 認証モーダルのフォーカストラップ
  init()                    — アプリ起動処理
```

---

## localStorage キー（現在使用中）

| キー | 内容 |
|---|---|
| `fujiCall_history` | 台本履歴（最大3件）|
| `fujiCall_stats` | ゲーミフィケーション統計（total/badges/keigoStats/callerStats/streak/lastVisit）|
| `fujiCall_sfx` | 効果音＋触覚のON/OFF（`"on"`/`"off"`、既定OFF）|

※ `fujiCall_apiKey` / `fujiCall_provider` / `fujiCall_humeKey` / `fujiCall_sbUrl` / `fujiCall_sbKey` は init() で自動削除済み

---

## 過去の経緯

- **2026-06-16: AIを全面的に Gemini 2.5 Flash へ統合（Groq・Hume を廃止）**。きっかけは Hume Expression Measurement API のサンセット（2026-06-14 に API 完全終了 → 声分析が動かなくなった）。代替を検討（Deepgram はセンチメントが英語のみ＆テキストベースで不適、HF SER は無料サーバーレス推論が不安定）し、**無料枠があり音声をネイティブ入力できる Gemini に台本生成も含めて一本化**することにユーザーが決定（MVPのため無料枠の学習利用は許容）。実装: (1) `api/generate.js` を Gemini `generateContent`（gemini-2.5-flash・`thinkingBudget:0`・maxOutputTokens 1024・prompt上限 3000→8000）に置換、(2) `api/transcribe.js`＋`api/hume-*.js`(3本) を削除し `api/analyze-voice.js` を新設（音声を受け取り `responseSchema` で `{transcript, confidence, anxiety, energy, calmness, impressions}` を強制し `{transcript, scores}` を返す）、(3) `api/config.js` の `hasHumeKey`→`hasVoiceKey`(=`!!GEMINI_API_KEY`)、(4) クライアントは `callGroqProxy`→`callGemini`、`_humeEnabled`→`_voiceEnabled`、音声系4関数(`transcribeWithWhisper`/`analyzeWithHume`/`pollHumeJob`/`extractHumeScores`)を `analyzeVoice()` 1本に集約しポーリングを撤去。**Gemini が webm/opus 非対応**のため `blobToWav()`/`encodeWav()` を追加し録音を 16kHz mono WAV へ変換（OfflineAudioContext でリサンプル、Vercel 4.5MB ボディ上限対策で最長90秒に truncate）。inline JS と API の構文チェック済み。**Vercel 環境変数を差し替え（GEMINI_API_KEY 追加・GROQ/HUME 削除）て本番デプロイ・end-to-end 動作確認済み（2026-06-16）**
- **2026-06-14: 認証をマジックリンク→ログインコード入力に再変更**（ホーム画面アプリ対応）。ユーザー報告: 「ホーム画面に追加」した standalone アプリでマジックリンクをタップすると Safari で開いてしまい同期できない。原因は iOS standalone PWA がメール内リンクを Safari（別ストレージ領域）で開く仕様。リダイレクト不要のコード入力 UI を復活（`code_sent` ステート、`#fC_authCode` 入力、`verifyOtp({email, token, type:'email'})`）。standalone（`apple-mobile-web-app-capable`/`display:standalone`）は維持。`emailRedirectTo` は残しブラウザのリンクログインも併用可。**前提: Supabase メールテンプレに `{{ .Token }}` を含める設定が必要**。当初 6桁前提（`maxlength=6`）だったが Supabase の実コードは**8桁**だったため切り詰めで検証失敗 → `maxlength=10`・検証 `\d{4,10}`・表示「8桁」に修正（桁数変更にも耐える）
- **2026-06-14: アプリアイコン／favicon を追加**。「ホーム画面に追加」でアイコンが無かった問題に対応。ふじキュン（`normal.png`）をラベンダー→ピンクのパステル背景に合成した**不透明**正方形アイコンを Pillow で生成し `assets/icons/` に配置（apple-touch-icon 180／icon 192・512／favicon 16・32）。ルートに `favicon.ico`（16/32/48）。`<head>` に `icon`/`apple-touch-icon`/`manifest`/`theme-color(#9575cd)`/`apple-mobile-web-app-*` を追加し、`site.webmanifest`（standalone・名称「ふじキュン♡」）も用意。全て同一オリジン（CSP `img-src 'self'` 内）。ローカルで 200 配信・manifest 解析を確認（iOS実機のホーム画面追加はデプロイ後に要確認）
- **2026-06-14: Q&Aフロー再設計（自由記述 → AIが不足質問 → 敬語）**。ユーザー指摘（固定4択の軸が混在し社内/社外のお詫びを表現できない／「難しい点」が台本のどこに効くか不明／回答を編集して作り直せない）を受けて再設計。①自由記述、②記述を Groq に渡し不足項目だけ AI が質問（`fetchClarify`/`parseClarify`、寛容なJSON抽出＋12秒タイムアウト＋`FALLBACK_QS`、`response_format` は使わず堅牢化）、③敬語レベル。「難しい点」は生成後の別カード `#fC_advice` に分離し台本とは別の励まし＋コツへ。「作り直す」は `S.genCtx` 保持＋`adjustTone()` で同内容のまま敬語だけ変えて再生成（🙇もっと丁寧に/😊やわらかく）。差分は6観点で敵対的レビューし確定19件（parseClarifyの寛容抽出＋選択肢正規化、clarifyタイムアウト、[]とnullの区別、履歴読込で genCtx/advice リセット、adjustToneの履歴フォールバック、アドバイスchip再有効化＋古い応答の競合防止、aria-live、44pxターゲット）を反映。デプロイ環境で「社内のミスのお詫び」を入力し、AIが社内/社外を質問→社内のお詫び台本が生成され、アドバイス・敬語微調整も動作することを確認
- **2026-06-14: Q&A再設計のレビュー確定修正（敵対的レビューで確定した19件→主な実装）**
  - **parseClarify の寛容な抽出**: コードフェンス除去＋「questions を含む候補」優先＋複数候補トライ。前置きや余分な括弧があっても AI の質問を取りこぼさない（従来の貪欲 `{[\s\S]*}` だと先頭に `{` があると失敗→フォールバックに落ちていた）
  - **選択肢の正規化**: 文字列以外（`{label}`/`{value}` 等）を文字列化、空なら質問を破棄。`[object Object]` ボタンとプロンプト汚染を防止
  - **clarify のタイムアウト**: `Promise.race` で 12 秒。`/api/generate` が応答しなくても固定質問へ抜ける（無限スピナー防止）
  - **null と [] の区別**: null（失敗/遅延）→ `FALLBACK_QS`、[]（AIが「質問不要」）→ 敬語ステップへ直行
  - **読み込み中の a11y**: `submitDescribe` で `#fC_dialogStep` を `role=status` 化＋フォーカス移動（SR/キーボードが置き去りにならない）
  - **履歴読込のリセット**: `loadHistoryItem()` に `S.genCtx = null;` と `hideAdvice();` を追加。古い生成文脈・前の台本のアドバイスカードが残らない
  - **adjustTone の履歴フォールバック**: genCtx が無い（履歴読込後）でも、要求された方向に `S.keigoLevel` を直接シフトして `buildPrompt()` から再生成（方向を握りつぶさない）
  - **アドバイスの再相談＋競合防止**: チップは押した1つだけ無効化し完了後に再有効化（2つ目の不安も聞ける）。`_adviceRun` トークンで古い応答が新しいカードに描画されるのを防ぐ
  - **アドバイス結果の aria-live**: `#fC_adviceResult` に `role=status aria-live=polite`（スピナー→コツの差し替えを読み上げ）
  - **タッチターゲット**: `.fC_tone-chip` / `.fC_advice-chip` を 44px に統一
  - **AI質問の質**: 電話前提なので「連絡手段（電話/メール/面談）」を質問しないようプロンプトに明記（本番検証で混入を確認したため）
- **2026-06-14: v4.0.0 レビュー指摘の修正（差分の敵対的レビューで確定した7件）**
  - **コントラスト（AA 4.5:1 未満の文字 4 箇所）**: `.fC_report-btn.soft` の文字色を `--accent-deep`(#5e35b1) に、`link_sent` 見出し・`.fC_modal-desc a`・`.fC_followup-chip:hover` の文字色を `--primary-text`(#00747f) に。ボーダーは装飾（3:1 で可）なので `--accent`/`--primary` のまま
  - **デモCSS残存**: 機能削除後も残っていた `.fC_demo-*` / `.fC_btn-demo`（旧紫パレット約60行）を削除し、デモ subsystem の撤去を完了
  - **マイクリーク（取得待ち中）**: 録音許可が下りる前にパネルを閉じると `abortRecording()` が空振りしてマイクが起動し続ける問題。`_cancelRec` を無条件で立て、`startRecording()` の `getUserMedia().then` 冒頭でキャンセル時は即トラック停止して中断
  - **解析中の閉鎖描画**: 録音停止後にパネルを閉じても解析結果が非表示パネルに描画される問題。`analyzeRecording()` の解決/失敗時に `_cancelRec` またはパネル非表示なら描画を中断
  - **「作り直す」のスタール**: 履歴読込後に旧 `S.lastPrompt` で再生成されてしまう問題。`loadHistoryItem()` で `S.lastPrompt=""` にリセットし、表示中の条件から組み直す
  - **狭幅ヘッダーの折返し**: アイコン2個＋タイトルが ~320px で衝突。`.fC_header-title{min-width:0}` ＋ `@media(max-width:360px){.fC_ver{display:none}}`
- **2026-06-14:** **v4.0.0 全方位の品質磨き**。8観点の品質監査と差分の敵対的レビューをワークフローで実施し、確定指摘を反映。(1) Web Audio 合成の効果音＋触覚（既定OFF・🔔/🔇トグル・`fujiCall_sfx`）、(2) 配色をふじキュンのラベンダー（#9575cd）基調へ再スキン＋小ラベルのAAコントラスト（`--primary-text`/`--accent-deep`）、(3) 励まし・エラー文言を優しい友達ボイスに統一（戦士ペルソナ撤廃・生メッセージ漏れ除去）、(4) 台本リベール／押下フィードバック／紙吹雪／ドット演出、(5) reduced-motion全網羅・safe-area・Q&Aフォーカス・認証フォーカストラップ・2×2アクション・44pxターゲット・iOSズーム抑止、(6) デモ機能一式削除・「作り直す」の条件再利用・**生成失敗時のQ&A回答保持**・マイク確実解放・クラウド統計の非破壊マージ・ポーズ先読み・連続来訪ストリーク。レビューで見つかった7件（コントラスト4箇所/デモCSS残存/取得待ち中のマイクリーク/履歴読込後の再生成スタール/狭幅ヘッダー）も修正済み。バージョンを v4.0.0 に統一
- **2026-06-14:** **バグ修正** — Q&A の回答が台本に全く反映されない問題。`generateFromDialog()` が `openDialog()`（`_dlgAnswers` をリセット）を呼んだ**後**に `buildDialogPrompt()` を実行していたため、プロンプトが常に空→デフォルト値（社外・ご用件の確認・標準敬語）で生成されていた。`buildDialogPrompt()` をリセット前に実行してプロンプト文字列を確保するよう修正。デプロイ環境で「謝罪・個人情報流出・謙譲語」を入力し、内容が反映された謝罪台本が出ることを確認済み
- **2026-06-14:** 「UI に可愛さ・親しみやすさがない」という指摘に対応し、ふじキュンを実画像で登場させた。藤沢市公式イラストから 10 ポーズを取得・Web 最適化して `assets/fujikyun/` に同梱（©藤沢市クレジットをフッターに付記）。(1) マスコットバーをキャラ＋しっぽ付き吹き出し化し、`FUJI`/`setFujiPose()` で状態別に表情を出し分け＋ぴょこぴょこアニメ＋タップ反応（`fujiTap`/`burstHearts`）、(2) 成長カードを「ふじキュンとの関係」（はじめまして→無二の親友）に再設計しアバターを実画像化、(3) 電話後の報告カード（`#fC_report`）・起動時デイリーひとこと・Q&A/練習アイコンの画像化、(4) コピー時「いってらっしゃい」＋ハート演出。画像欠落時は `fujiImgErr()` で絵文字フォールバック。`.gitignore` に `.claude/` を追加
- **2026-06-13:** 認証を6桁コードからマジックリンクに変更。Supabase デフォルトのメールテンプレートが送るのはリンクのため、コード入力 UI（`verifyOtp`）を廃止し「メールのリンクをタップ→自動ログイン」方式に。`signInWithOtp` に `emailRedirectTo` を追加、`onAuthStateChange` の `SIGNED_IN` で復帰時にログイン完了トーストを表示。`_authStep` の `code_sent` を `link_sent` にリネーム
- **2026-06-13:** 音読練習モードの台本表示の高さ制限（`max-height:140px; overflow-y:auto`）を撤廃。スクロール不要で台本全体を一度に表示。フォント・行間も拡大
- **2026-06-13:** 印刷レイアウトを刷新。Web ページそのままの印刷をやめ、`buildPrintDoc()` が専用印刷ドキュメント（`#fC_printDoc`）を動的生成する方式に変更。`@media print` で `#fC_printDoc` 以外を非表示にし、タイトル・メタ情報・大きく読みやすいメイン台本・フォローアップ台本を台本として実用的なレイアウトで出力。〇〇プレースホルダーを記入欄として強調
- **2026-06-08:** 展開別フォローアップ台本機能を追加。メイン台本生成後に6シナリオ（怒られた・断られた・上司を出せ・揚げ足・詳しく説明・担当者不在）のチップを表示し、クリックで対応台本を連鎖生成
- **2026-06-08:** Q&A をモーダルから廃止しインライン表示に変更。ページロード時に自動起動、生成後に即リセット
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
