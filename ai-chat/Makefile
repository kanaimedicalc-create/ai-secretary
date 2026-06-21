# =============================================================================
# 設定 — 必要に応じて変更してください
# =============================================================================
PROJECT_ID  ?= your-gcp-project-id
REGION      ?= asia-northeast1
SERVICE     ?= ai-chat
IMAGE       := $(REGION)-docker.pkg.dev/$(PROJECT_ID)/$(SERVICE)/$(SERVICE):latest

# NEXT_PUBLIC_APP_URL: 初回 make deploy-init の後に make url で確認し、
#                      make push APP_URL=https://... で再ビルドする
APP_URL     ?= http://localhost:3000

# =============================================================================
# 初期化
# =============================================================================

## 依存インストール + Prisma クライアント生成
.PHONY: init
init:
	npm install
	npx prisma generate

## MongoDB にスキーマを反映（初回 or スキーマ変更時）
.PHONY: db-push
db-push:
	npx prisma db push

## init + db-push をまとめて実行
.PHONY: setup
setup: init db-push

# =============================================================================
# 開発
# =============================================================================

## 開発サーバー起動（Next.js のみ）
.PHONY: dev
dev:
	npm run dev

## 開発サーバー + WhisperX を同時起動
.PHONY: dev-all
dev-all:
	npm run dev:all

## 型チェック
.PHONY: typecheck
typecheck:
	npx tsc --noEmit

## Lint
.PHONY: lint
lint:
	npm run lint

# =============================================================================
# ビルド
# =============================================================================

## ローカルでプロダクションビルド
.PHONY: build
build:
	npm run build

## ビルド前に型チェック・Lint も実行
.PHONY: build-full
build-full: typecheck lint build

## Docker イメージをローカルでビルド（要 Docker Desktop）
.PHONY: docker-build
docker-build:
	docker build -t $(SERVICE):local .

## Docker コンテナをローカルで起動（要 .env.local）
.PHONY: docker-run
docker-run:
	docker run --rm -p 3000:3000 \
	  --env-file .env.local \
	  $(SERVICE):local

# =============================================================================
# デプロイ（要 gcloud 認証済み・PROJECT_ID 設定済み）
# =============================================================================

## Artifact Registry にリポジトリ作成（初回のみ）
.PHONY: gcp-repo
gcp-repo:
	gcloud artifacts repositories create $(SERVICE) \
	  --repository-format=docker \
	  --location=$(REGION) \
	  --project=$(PROJECT_ID)
	gcloud auth configure-docker $(REGION)-docker.pkg.dev

## Cloud Build でイメージをビルド & プッシュ
## 本番 URL が決まったら: make push APP_URL=https://ai-chat-xxxx-an.a.run.app
.PHONY: push
push:
	gcloud builds submit \
	  --config cloudbuild.yaml \
	  --substitutions "_APP_URL=$(APP_URL),_IMAGE=$(IMAGE)" \
	  --project $(PROJECT_ID)

## Cloud Run にデプロイ（初回）
## 手順: 1) make deploy-init  2) make url  3) make push APP_URL=<URL>  4) make deploy
.PHONY: deploy-init
deploy-init:
	gcloud run deploy $(SERVICE) \
	  --image $(IMAGE) \
	  --platform managed \
	  --region $(REGION) \
	  --allow-unauthenticated \
	  --port 3000 \
	  --memory 1Gi \
	  --cpu 1 \
	  --min-instances 0 \
	  --max-instances 3 \
	  --set-secrets "ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest,DATABASE_URL=DATABASE_URL:latest" \
	  --set-env-vars "NODE_ENV=production,WHISPERX_URL=" \
	  --project $(PROJECT_ID)

## Cloud Run を最新イメージで更新（2回目以降）
.PHONY: deploy
deploy:
	gcloud run deploy $(SERVICE) \
	  --image $(IMAGE) \
	  --region $(REGION) \
	  --allow-unauthenticated \
	  --project $(PROJECT_ID)

## ビルド & デプロイを一括実行
.PHONY: release
release: push deploy

## デプロイ済みサービスの URL を表示
.PHONY: url
url:
	@gcloud run services describe $(SERVICE) \
	  --region $(REGION) \
	  --project $(PROJECT_ID) \
	  --format 'value(status.url)'

## ログを tail
.PHONY: logs
logs:
	gcloud run services logs read $(SERVICE) \
	  --region $(REGION) \
	  --project $(PROJECT_ID) \
	  --limit 50

# =============================================================================
# ヘルプ
# =============================================================================

.PHONY: help
help:
	@echo ""
	@echo "Usage: make <target> [PROJECT_ID=xxx]"
	@echo ""
	@echo "  初期化:"
	@echo "    setup         npm install + prisma generate + db push"
	@echo "    init          npm install + prisma generate"
	@echo "    db-push       MongoDB にスキーマ反映"
	@echo ""
	@echo "  開発:"
	@echo "    dev           開発サーバー起動 (localhost:3000)"
	@echo "    dev-all       開発サーバー + WhisperX 起動"
	@echo "    typecheck     型チェック"
	@echo "    lint          ESLint"
	@echo ""
	@echo "  ビルド:"
	@echo "    build         プロダクションビルド"
	@echo "    build-full    型チェック + lint + ビルド"
	@echo "    docker-build  Docker イメージをローカルビルド"
	@echo "    docker-run    Docker コンテナをローカル起動"
	@echo ""
	@echo "  デプロイ (PROJECT_ID 必須):"
	@echo "    gcp-repo      Artifact Registry リポジトリ作成 (初回)"
	@echo "    push          Cloud Build でビルド & プッシュ [APP_URL=https://...]"
	@echo "    deploy-init   Cloud Run に初回デプロイ"
	@echo "    deploy        Cloud Run を最新イメージで更新"
	@echo "    release       push + deploy を一括実行 [APP_URL=https://...]"
	@echo "    url           デプロイ済み URL を表示"
	@echo "    logs          Cloud Run ログを表示"
	@echo ""
	@echo "  初回デプロイ手順:"
	@echo "    1) make deploy-init PROJECT_ID=xxx   # 仮イメージでサービス作成"
	@echo "    2) make url PROJECT_ID=xxx            # URL を確認"
	@echo "    3) make push APP_URL=<URL> PROJECT_ID=xxx  # URL を埋め込んでリビルド"
	@echo "    4) make deploy PROJECT_ID=xxx         # 再デプロイ"
	@echo ""

.DEFAULT_GOAL := help
