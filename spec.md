# YOLO WORK 求人変換APIサーバー spec.md

## 目的
Chrome拡張機能からのリクエストを受け取り
Claude APIとSnowflakeを使って求人変換・市場データを返すAPIサーバー

## エンドポイント

### POST /api/convert
求人テキストをYOLO WORK形式のJSONに変換する

リクエスト：
```json
{
  "content": "求人ページのテキスト",
  "url": "元のURL"
}
```

レスポンス：YOLO WORK形式のJSON（job_title, appeal_point等）

### POST /api/market-data
職種・給与タイプから市場データを返す

リクエスト：
```json
{
  "job_category": "ホールスタッフ",
  "salary_type": "時給",
  "employment_type": "アルバイト"
}
```

レスポンス：
```json
{
  "avg_salary": 1030,
  "monthly_applicants": 8,
  "no_data": false
}
```

## Snowflake構成
- アカウント：VFCNXQW-OT58552
- DB：AWS
- スキーマ：YOLO_JAPAN
- ウェアハウス：YOLOWORK_WH
- 認証：キーペア（.env.localに設定済み）

## 主要テーブル
- SWIFT_JOB_VIEW：求人データ（PAY=給与、OP='D'が削除済み）
- APPLICATION_OPPORTUNITY_VIEW：応募データ
- SWIFT_JOB_USER_VIEW：応募↔求人の中間テーブル
- PART_TIME_JOB_CATEGORY_VIEW：職種カテゴリマスタ（188件）
- PART_TIME_JOB_CATEGORY_REF_VIEW：求人↔職種カテゴリの紐付け

## JOINパス（正しい経路）
```
APPLICATION_OPPORTUNITY_VIEW.ID
→ SWIFT_JOB_USER_VIEW.APPLICATION_OPPORTUNITY_ID
→ SWIFT_JOB_USER_VIEW.SWIFT_JOB_ID
→ SWIFT_JOB_VIEW.ID
→ PART_TIME_JOB_CATEGORY_REF_VIEW.PART_TIME_ID
→ PART_TIME_JOB_CATEGORY_VIEW.ID
```

## 既知の問題
- SWIFT_JOB_VIEW.PAYは98%がnull → PART_TIME_SALARY_VIEW.MINIMUM_WAGEに切替済み
- PART_TIME_SALARY_VIEW: PAYMENT_TYPE(hour/month/day), MINIMUM_WAGE, BEST_WAGE, HOURLY_SALARY
- ホワイトカラー/ブルーカラー分類を188カテゴリに対して実装済み
- 将来はlocalhost:3002をクラウドサーバーに移行予定
  （popup.jsのAPI_BASE_URLを変更するだけで対応可能）

## 環境変数（.env.local）
- ANTHROPIC_API_KEY=設定済み
- SNOWFLAKE_ACCOUNT=設定済み
- SNOWFLAKE_USERNAME=設定済み
- SNOWFLAKE_DATABASE=AWS
- SNOWFLAKE_SCHEMA=YOLO_JAPAN
- SNOWFLAKE_ROLE=YOLOWORKADMIN
- SNOWFLAKE_WAREHOUSE=YOLOWORK_WH
- SNOWFLAKE_PRIVATE_KEY=設定済み
