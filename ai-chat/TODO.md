# TODO — 残タスク一覧

優先度: 🔴 P0（バグ・動作不全） / 🟠 P1（機能不足） / 🟡 P2（品質向上） / 🟢 P3（将来対応）

---

## 🔴 P0 — バグ・動作不全

### 1. ページリロード時に会話履歴が消える
**ファイル**: `src/app/page.tsx`

`GET /api/sessions/:sessionId` を実装済みだが、フロントエンドから**呼び出していない**。
ページ初回マウント時に `useEffect` でセッション履歴を取得し、`messages` に復元する処理が必要。

```ts
// page.tsx に追加すべき
useEffect(() => {
  const sessionId = localStorage.getItem(`ai-chat-session-${specialty}`)
  if (!sessionId) return
  fetch(`/api/sessions/${sessionId}`)
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (data?.messages) setMessages(data.messages)
    })
}, [specialty])
```

---

### 2. `navigator.mediaDevices` の null チェックなし → TypeError
**ファイル**: `src/components/InputBar.tsx` L33

HTTP + LAN IP アクセスでは `navigator.mediaDevices` が `undefined` になる。
現在の `catch` ブロックは `getUserMedia` 呼び出し後の例外をキャッチするが、
`undefined.getUserMedia` のアクセス自体で TypeError が throw されると catch に到達しない可能性がある。

```ts
// 修正案
const startRecording = async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    alert('このブラウザ・接続ではマイクを使用できません（HTTPS または localhost が必要です）')
    return
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    ...
  }
}
```

---

### 3. `NEXT_PUBLIC_APP_URL` がビルド時にバンドルされない
**ファイル**: `Dockerfile`

`NEXT_PUBLIC_*` 変数は **ビルド時**にバンドルに埋め込まれる仕様。
Cloud Run の `--set-env-vars` でランタイム設定しても効果なし。
`Dockerfile` に `ARG` を追加し、Cloud Build 時に `--build-arg` で渡す必要がある。

```dockerfile
# Dockerfile に追加
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
```

```bash
# gcloud builds submit に追加
--substitutions "_APP_URL=https://ai-chat-xxxx-an.a.run.app" \
--build-arg "NEXT_PUBLIC_APP_URL=$_APP_URL"
```

---

## 🟠 P1 — 機能不足

### 4. Markdown レンダリング未実装
**ファイル**: `src/components/MessageBubble.tsx` L24
**CLAUDE.md 要件**: 「マークダウンレンダリング対応」と明記されている

AI の返答が箇条書き・コードブロック・太字を含んでも、現状は `whitespace-pre-wrap` のプレーンテキスト表示。
`react-markdown` + `remark-gfm` のインストールと適用が必要。

```bash
npm install react-markdown remark-gfm
```

```tsx
// MessageBubble.tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// content を <ReactMarkdown> でラップ
<ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
```

---

### 5. メッセージ最大長のバリデーションなし
**ファイル**: `src/server/hono/routes/chat.ts` L9-13

極端に長いメッセージが送られると Claude API のコスト・タイムアウトのリスクがある。

```ts
const chatSchema = z.object({
  message: z.string().min(1).max(4000), // 上限を追加
  ...
})
```

---

### 6. `sessions.ts` の `limit` バリデーションが壊れやすい
**ファイル**: `src/server/hono/routes/sessions.ts` L22

`Number(undefined)` → `NaN`、`Math.min(NaN, 100)` → `NaN`。
Prisma の `take: NaN` は例外を throw する。クエリパラメータの型安全な取り扱いが必要。

```ts
const rawLimit = c.req.query('limit')
const limit = Math.min(Math.max(1, parseInt(rawLimit ?? '20', 10) || 20), 100)
```

---

### 7. 既存会話の `specialty` 不一致チェックなし
**ファイル**: `src/server/hono/routes/chat.ts` L25-29

既存の `conversation.specialty` と POST された `specialty` が違う場合
（例: 内科で作った sessionId を神経内科で使いまわした場合）、
DB は "naika" のままエージェントだけ "shinkei" が処理する不整合が生じる。

```ts
if (conversation && conversation.specialty !== specialty) {
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { specialty },
  })
}
```

---

### 8. API にレート制限なし
**ファイル**: `src/server/hono/index.ts`

`--allow-unauthenticated` でパブリック公開するため、
悪意ある大量リクエストで Claude API コストが急増するリスクがある。
Hono のミドルウェアまたは Cloud Run のリクエスト制限で対処が必要。

```ts
// 簡易的な IP ベースのレート制限（例）
import { rateLimiter } from 'hono-rate-limiter'
app.use('/api/chat/*', rateLimiter({ windowMs: 60_000, limit: 20 }))
```

---

### 9. AIレスポンス待機中のローディング表示なし
**ファイル**: `src/app/page.tsx`, `src/components/ChatWindow.tsx`

ユーザーメッセージ送信後、ストリーミング開始（`streamingContent` が空でない状態）になるまでの数秒間、
画面に何も変化がなく応答を待っているか判別できない。
`isStreaming && !streamingContent` の間にスピナーやドット点滅を表示すべき。

---

## 🟡 P2 — 品質向上

### 10. `handleClear` がエラーを無視している
**ファイル**: `src/app/page.tsx` L108-115

DELETE API が失敗しても `localStorage` を削除して UI をリセットしてしまう。
サーバー側の削除失敗時はユーザーに通知すべき。

```ts
const res = await fetch(`/api/chat/${sessionId}`, { method: 'DELETE' })
if (!res.ok) {
  alert('履歴の削除に失敗しました')
  return
}
```

---

### 11. `allowedDevOrigins` のハードコード
**ファイル**: `next.config.ts` L5

`192.168.1.203` がハードコードされており、別環境・別デバイスで IP が変わると再設定が必要。
環境変数化するか、開発時のみ `0.0.0.0/0` を許可する対応が望ましい。

```ts
allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS?.split(',') ?? [],
```

---

### 12. React エラーバウンダリなし
**ファイル**: 新規作成 `src/components/ErrorBoundary.tsx`

予期しない例外でコンポーネントツリーが白画面になるリスクがある。
`ChatWindow` などを `ErrorBoundary` でラップすることで、
エラーが発生しても最低限のメッセージを表示できる。

---

### 13. `lookupDrug` の薬剤DBが4件のみ
**ファイル**: `src/lib/mastra/tools/lookupDrug.ts`

現在アムロジピン・メトホルミン・アセトアミノフェン・アモキシシリンの4薬剤のみ。
頻用薬（スタチン、PPI、抗凝固薬、降圧薬各種等）を最低30〜50件に拡充するか、
外部の薬剤 API（KEGG DRUG、日本語医薬品添付文書 API 等）に接続する設計に変更する。

---

### 14. `checkLabValues` の性別・年齢別基準値が未実装
**ファイル**: `src/lib/mastra/tools/checkLabValues.ts`

現在は一律の基準値のみ。臨床では Hgb・Hct・RBC などは性別で基準値が異なる。
`inputSchema` に `sex?: 'male' | 'female'` と `age?: number` を追加し、
基準値を分岐させることで精度が上がる。

---

### 15. Hono のグローバルエラーハンドラなし
**ファイル**: `src/server/hono/index.ts`

Prisma 接続エラーや予期せぬ例外が素のスタックトレースとして返る可能性がある。
`app.onError()` でグローバルエラーハンドラを設定し、500 エラーを安全な JSON で返すべき。

```ts
app.onError((err, c) => {
  console.error('[hono] unhandled error:', err)
  return c.json({ error: 'Internal Server Error' }, 500)
})
```

---

## 🟢 P3 — 将来対応

### 16. 認証機能なし
現在 `--allow-unauthenticated` で完全公開状態。
医療情報を扱うアプリとして、最低限 Basic Auth や Google OAuth での保護が望ましい。
Cloud Run の IAM 認証（`--no-allow-unauthenticated` + Identity-Aware Proxy）が最もシンプル。

### 17. CORS 設定なし
**ファイル**: `src/server/hono/index.ts`
フロントと同一オリジンの現構成では問題ないが、
将来的に API を外部から呼ぶ場合に備え `hono/cors` ミドルウェアを用意しておく。

### 18. `Makefile` の `deploy-init` に URL プレースホルダー
**ファイル**: `Makefile` L62
`NEXT_PUBLIC_APP_URL=https://$(SERVICE)-xxxx-an.a.run.app` の `xxxx` 部分は
初回デプロイ後にしか確定しない。初回デプロイ → URL 取得 → 環境変数更新 → 再デプロイの
2ステップ手順をドキュメント化するか、`make url` → `make deploy` のワークフローに整理する。

### 19. ストリーミング中断時のリカバリーなし
**ファイル**: `src/app/page.tsx` L69-82

ネットワーク切断でストリームが途中終了した場合、
`accumulated` の途中状態がメッセージとして保存される。
`AbortController` を使ったキャンセル機能と、再接続ロジックの検討が必要。

### 20. 会話履歴の件数上限なし
**ファイル**: `src/server/hono/routes/chat.ts` L38-43

長期利用でメッセージが数百件になった場合、`allMessages` がコンテキストウィンドウを超える。
直近 N 件のみを Mastra に渡す「コンテキスト圧縮」の実装が必要。

```ts
const MAX_CONTEXT_MESSAGES = 20
const history = conversation.messages
  .slice(-MAX_CONTEXT_MESSAGES)
  .map(...)
```

---

## 実装優先度サマリー

| # | タスク | 優先度 | 工数 |
|---|--------|--------|------|
| 1 | ページリロード時の履歴復元 | 🔴 P0 | 小 |
| 2 | `mediaDevices` null チェック | 🔴 P0 | 小 |
| 3 | Dockerfile の `NEXT_PUBLIC_APP_URL` 対応 | 🔴 P0 | 小 |
| 4 | Markdown レンダリング | 🟠 P1 | 小 |
| 5 | message 最大長バリデーション | 🟠 P1 | 小 |
| 6 | sessions limit バリデーション | 🟠 P1 | 小 |
| 7 | specialty 不一致チェック | 🟠 P1 | 小 |
| 8 | レート制限 | 🟠 P1 | 中 |
| 9 | ローディング表示 | 🟠 P1 | 小 |
| 10 | handleClear エラーハンドリング | 🟡 P2 | 小 |
| 11 | allowedDevOrigins 環境変数化 | 🟡 P2 | 小 |
| 12 | React エラーバウンダリ | 🟡 P2 | 小 |
| 13 | 薬剤DB拡充 | 🟡 P2 | 大 |
| 14 | 検査値の性別・年齢別基準値 | 🟡 P2 | 中 |
| 15 | Hono グローバルエラーハンドラ | 🟡 P2 | 小 |
| 16 | 認証機能 | 🟢 P3 | 大 |
| 17 | CORS 設定 | 🟢 P3 | 小 |
| 18 | deploy-init URL 手順整備 | 🟢 P3 | 小 |
| 19 | ストリーム中断リカバリー | 🟢 P3 | 中 |
| 20 | コンテキスト圧縮（長期会話） | 🟢 P3 | 中 |
