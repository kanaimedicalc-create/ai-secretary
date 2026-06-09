# ai-chat — 医療AIチャットアシスタント

## プロジェクト概要

医師（院長）の治療提案・臨床判断をサポートするAIチャットボット。
専門科（内科・神経内科・小児科）ごとにシステムプロンプトを切り替え、
音声入力で手軽に使えることを重視する。

## 技術スタック

| レイヤー | 技術 |
|--------|------|
| フロントエンド | Next.js 15+ (App Router, TypeScript, Tailwind CSS 4) |
| API サーバー | Hono（`@hono/next` 経由で Next.js に統合） |
| ORM | Prisma（MongoDB ドライバー） |
| データベース | MongoDB |
| AIエージェント | Mastra |
| AIモデル | Claude API（`claude-sonnet-4-6` 以降） |
| 音声入力 | WhisperX（ローカルサーバー、別途起動） |
| デプロイ | Google Cloud Run（Docker コンテナ） |

## アーキテクチャ

```
[ブラウザ]
    ↓ HTTP/SSE
[Next.js App Router]
    ├── /app/             # React フロントエンド
    └── /app/api/[[...route]]/route.ts   # Hono ハンドラー（catch-all）
            ↓
        [Hono ルーター]
            ├── POST /api/chat          # Mastra エージェント呼び出し
            └── POST /api/transcribe    # WhisperX プロキシ
                    ↓
            [Mastra Agent]
                ├── Claude API（チャット生成）
                ├── Tool Use（検査値・薬剤ツール）
                └── Prisma → MongoDB（会話履歴の保存・取得）
```

Hono は Next.js の catch-all API ルートに `handle()` でマウントし、単一 Cloud Run サービスとして動作させる。

## 機能要件

### 1. 専門科切り替え
- **対応科**: 内科 / 神経内科 / 小児科
- UIのセレクタで切り替え、選択中の専門科に対応した Mastra エージェントに切り替える
- 切り替え時に会話をリセットするか確認ダイアログを表示

### 2. 音声入力
- マイクボタンを押すと WhisperX ローカルサーバー（デフォルト `http://localhost:9000`）に音声を送信
- `/api/transcribe` が Next.js 側でプロキシし、文字起こし結果を返す
- WhisperX が未起動の場合はエラートーストを表示し、テキスト入力で fallback

### 3. チャット機能
- テキスト入力（音声変換後の編集も可）
- Mastra の Tool Use を通じてカスタムツールを呼び出す
- ストリーミングレスポンス（SSE）
- マークダウンレンダリング対応

### 4. 会話履歴
- MongoDB に保存（`Conversation` / `Message` コレクション）
- セッション ID でブラウザとサーバーを紐付け（Cookie or localStorage に sessionId を保持）
- 「履歴をクリア」ボタンで当該セッションの履歴を削除

### 5. UI / UX
- テーマ: 医療らしい清潔感（白・淡青・グレー系）
- 言語: 日本語
- 認証: なし（誰でもアクセス可）
- レスポンシブ対応（タブレット・PC）

## Mastra エージェント設計

専門科ごとに個別のエージェントを定義する。

```
src/mastra/
├── index.ts              # Mastra インスタンス初期化
├── agents/
│   ├── naika.ts          # 内科エージェント
│   ├── shinkei.ts        # 神経内科エージェント
│   └── shonika.ts        # 小児科エージェント
└── tools/
    ├── checkLabValues.ts  # 検査値正常値チェック
    └── lookupDrug.ts      # 薬剤情報参照
```

各エージェントは Claude API（`claude-sonnet-4-6`）をモデルに、専門科固有のシステムプロンプトと共通ツールを持つ。

### 共通ツール

| ツール名 | 説明 |
|--------|------|
| `checkLabValues` | 検査値（血液・尿等）の正常値・異常判定を返す |
| `lookupDrug` | 薬剤名・成分名から用量・禁忌・副作用を返す |

## Prisma スキーマ（MongoDB）

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

model Conversation {
  id        String    @id @default(auto()) @map("_id") @db.ObjectId
  sessionId String    @unique
  specialty String    // "naika" | "shinkei" | "shonika"
  messages  Message[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Message {
  id             String       @id @default(auto()) @map("_id") @db.ObjectId
  conversationId String       @db.ObjectId
  conversation   Conversation @relation(fields: [conversationId], references: [id])
  role           String       // "user" | "assistant"
  content        String
  createdAt      DateTime     @default(now())
}
```

## ディレクトリ構成

```
ai-chat/
├── app/
│   ├── api/
│   │   └── [[...route]]/
│   │       └── route.ts        # Hono catch-all（GET/POST/PUT/DELETE を委譲）
│   ├── (chat)/
│   │   └── page.tsx            # メインチャット画面
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ChatWindow.tsx           # メッセージ一覧
│   ├── InputBar.tsx             # テキスト入力 + マイクボタン
│   ├── SpecialtySelector.tsx    # 専門科切り替え
│   └── MessageBubble.tsx        # 1メッセージ表示
├── src/
│   ├── hono/
│   │   ├── index.ts             # Hono アプリ定義（basePath: /api）
│   │   └── routes/
│   │       ├── chat.ts          # POST /api/chat
│   │       └── transcribe.ts   # POST /api/transcribe
│   ├── mastra/
│   │   ├── index.ts
│   │   ├── agents/
│   │   │   ├── naika.ts
│   │   │   ├── shinkei.ts
│   │   │   └── shonika.ts
│   │   └── tools/
│   │       ├── checkLabValues.ts
│   │       └── lookupDrug.ts
│   └── db/
│       └── client.ts            # Prisma Client シングルトン
├── prisma/
│   └── schema.prisma
├── prompts/
│   ├── base.txt                 # 共通免責プロンプト
│   ├── naika.txt
│   ├── shinkei.txt
│   └── shonika.txt
├── types/
│   └── chat.ts                  # Message, Specialty, Conversation 型定義
├── public/
├── Dockerfile
├── .env.local
├── next.config.ts
├── package.json
└── tsconfig.json
```

## 環境変数

```env
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/ai-chat
WHISPERX_URL=http://localhost:9000
```

## WhisperX 連携

WhisperX は別プロセスで起動し、`/api/transcribe` がプロキシとして中継する。

```bash
# WhisperX サーバー起動例（別ターミナル）
whisperx-server --host 0.0.0.0 --port 9000 --model large-v3
```

## Dockerfile（Cloud Run 用）

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

`next.config.ts` に `output: 'standalone'` を設定すること。

## Cloud Run デプロイ

```bash
# イメージビルドと push
gcloud builds submit --tag gcr.io/<PROJECT_ID>/ai-chat

# Cloud Run にデプロイ
gcloud run deploy ai-chat \
  --image gcr.io/<PROJECT_ID>/ai-chat \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars ANTHROPIC_API_KEY=...,DATABASE_URL=...
```

## 開発コマンド

```bash
# 依存インストール
npm install

# Prisma クライアント生成
npx prisma generate

# 開発サーバー起動
npm run dev

# 型チェック
npx tsc --noEmit

# Lint
npm run lint

# ビルド
npm run build
```

## タスク完了チェックリスト

コーディングタスク完了時に必ず実行:

1. `npx tsc --noEmit` — 型エラーなし
2. `npm run lint` — ESLint パス
3. `npm run build` — ビルド成功

## 実装上の注意

- 医療情報を扱うため、AIの回答には必ず「これはAIによるアシストであり、最終判断は医師が行う」旨のフッターを表示する
- 患者の個人情報（氏名・生年月日等）は入力しないよう UI 上で案内する
- Prisma の MongoDB ドライバーはマイグレーション非対応のため `prisma db push` でスキーマを反映する
- Hono の `handle()` は Edge Runtime に非対応。`next.config.ts` でランタイムを `nodejs` に固定する
- WhisperX が未起動でもテキスト入力で使えるよう fallback を用意する
- Mastra エージェントのストリーミングは Hono の `streamText()` と組み合わせて SSE で返す
