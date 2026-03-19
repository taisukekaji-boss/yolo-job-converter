# YOLO WORK 求人変換ツール

## セットアップ

1. 依存関係のインストール

```bash
npm install
```

2. 環境変数の設定

`.env.example` を `.env.local` にコピーして、`ANTHROPIC_API_KEY` を設定する

```bash
cp .env.example .env.local
```

3. 開発サーバーの起動

```bash
npm run dev
```

4. ブラウザで開く

http://localhost:3000

## 将来の拡張予定

- YOLO WORK DBへの直接登録機能
- 画像の取り込み機能
- 変換履歴の保存
