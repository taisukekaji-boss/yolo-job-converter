import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, isSnowflakeConfigured } from '@/lib/snowflake/connection';

// 正しいJOINパス（2026-03-19確認済み）:
// PART_TIME_SALARY_VIEW.PART_TIME_JOB_CATEGORY_REF_ID → PART_TIME_JOB_CATEGORY_REF_VIEW.ID
// PART_TIME_JOB_CATEGORY_REF_VIEW.PART_TIME_JOB_CATEGORY_ID → PART_TIME_JOB_CATEGORY_VIEW.ID
// PART_TIME_JOB_CATEGORY_REF_VIEW.PART_TIME_ID → PART_TIME_VIEW.ID
// PART_TIME_VIEW.WORK_PREFECTURE = 都道府県コード（"27"=大阪等）

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const MONTHS_RANGE = 6;

// 都道府県 → JISコード
const PREF_CODE: Record<string, string> = {
  '北海道':'1','青森県':'2','岩手県':'3','宮城県':'4','秋田県':'5','山形県':'6','福島県':'7',
  '茨城県':'8','栃木県':'9','群馬県':'10','埼玉県':'11','千葉県':'12','東京都':'13','神奈川県':'14',
  '新潟県':'15','富山県':'16','石川県':'17','福井県':'18','山梨県':'19','長野県':'20',
  '岐阜県':'21','静岡県':'22','愛知県':'23','三重県':'24',
  '滋賀県':'25','京都府':'26','大阪府':'27','兵庫県':'28','奈良県':'29','和歌山県':'30',
  '鳥取県':'31','島根県':'32','岡山県':'33','広島県':'34','山口県':'35',
  '徳島県':'36','香川県':'37','愛媛県':'38','高知県':'39',
  '福岡県':'40','佐賀県':'41','長崎県':'42','熊本県':'43','大分県':'44','宮崎県':'45','鹿児島県':'46','沖縄県':'47',
};

// salary_type → PAYMENT_TYPE
const PAYMENT_TYPE_MAP: Record<string, string> = {
  '時給': 'hour', '日給': 'day', '月給': 'month',
};

// ホワイトカラー系カテゴリID
const WHITE_COLLAR_IDS = [
  6,  // 受付スタッフ
  36, // データ入力スタッフ
  37, // 一般事務スタッフ
  38, // 営業事務スタッフ
  39, // テレフォンアポインター
  40,41,42,43,44, // 語学スタッフ
  45,46,47,48,49,50,51,52, // 講師・インストラクター
  53, // ケアマネージャー
  56,57,58, // 歯科・病院事務
  59, // 施術スタッフ
  64, // Webデザイナー
  65, // ECサイト運営
  69, // マーケティング
  76, // 営業スタッフ
  79,80, // プロモーション・オペレーション
  83, // Webライター
  90, // 運転手兼事務員
  99, // 保育補助
  100,101,102, // エンジニア系
  105, // 総合職
  106, // 管理監督者
  109,110, // エンジニア系
  113, // 企画・開発・管理
  115, // カウンターセールス・コールセンター
  116, // 海外営業
  117, // 新規開拓・ルートセールス
  118,119,120, // WEB・クリエイティブ・マーケティング
  122, // 建築設計・施工管理
  124,125,126, // エンジニア・設計・研究
  128, // マネージャー
  130,131,132, // 経営・金融・コンサル
  133, // 一般事務・営業事務
  134, // 法務・知的財産
  135, // 運用・カスタマーサポート
  136, // セールス
  138, // 経理・税務・IR
  139, // 研究・開発
  140, // 翻訳・通訳
  141, // 人事・庶務・総務
  143, // エンジニア・プログラマー
  146, // 講師・教育関連職
  149,150, // 医師・看護師・針灸
  154, // 不動産開発
  160, // 事務職
  162, // 店長候補
  164, // RPAエンジニア
  165, // カスタマーサービス
  173, // ホテル支配人
  176, // 事務兼販売業務
  177, // 衛星・品管・管理
  184, // 通訳・翻訳
];

// ブルーカラー系カテゴリID
const BLUE_COLLAR_IDS = [
  1,2,3,4,5, // レジ・品出し・販売・製造・店舗
  7,8,9,10,11,12,13,14, // キッチン・ホール・調理・バーテンダー等
  15,16, // 案内・サービス
  17,18, // 設備管理・キャディ
  19,20,21,22,23, // 清掃・イベント・カウンター・フロント・ベッドメイキング
  24,25,26, // メンテナンス・保守・警備
  27,28,29,30,31,32,33,34,35, // 仕分け・梱包・検品・倉庫・ライン等
  54,55, // 補助・訪問介護
  60, // その他
  61,62,63, // 農業・配達・除菌
  66,67,68, // 建設・整備・配達
  72,73,74,75, // パック詰め・牧場・縫製
  77,78, // 介護・生活支援員
  81,82, // イベント参加者・大型ドライバー
  84, // 作業員兼運転手
  91,92,93,94,95,96, // 多能工・交通誘導・解体・製造技術・食肉加工
  98, // ダクト
  103,104, // 鮮魚加工・スキャニング
  107,108, // 配送センター・野菜加工
  111, // 鉄筋作業員
  114, // 接客・売り場・宅配
  123, // 設置・組立・修理
  129, // 運搬・設置
  137, // 製造・生産管理
  151,152,153, // 廃棄物・機械組立・オペレーター
  155,156,157,158,159, // 配管工・廃棄物・現場・斫工・リフト
  161, // 耕種農業
  166,167,168,169,170, // 調理・シール貼り・コンテナ・セメント・車チェック
  171,172, // 学童・金属加工
  174,175, // 表面処理・フォークリフト
  178,179,180,181,182,183, // 加工・カット・水産・組立・溶接・塗装
  185,186, // 製造加工・調理補助
  188, // 自立支援員
];

interface SalaryRow { AVG_SALARY: number; JOB_COUNT: number; }
interface ApplicantRow { TOTAL_APPLICANTS: number; }
interface CategoryRow { ID: number; NAME: string; }

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    const { job_category, job_group, salary_type, prefecture } = await request.json();

    if (!isSnowflakeConfigured()) {
      return NextResponse.json({ error: 'Snowflakeが設定されていません' }, { status: 500, headers: CORS_HEADERS });
    }

    // パラメータ変換
    const paymentType = PAYMENT_TYPE_MAP[salary_type] || 'hour';
    const prefCode = prefecture ? PREF_CODE[prefecture] : null;

    // カテゴリグループのID配列を決定
    let groupIds: number[] = [];
    let groupLabel = '';
    if (job_group === 'ホワイトカラー') {
      groupIds = WHITE_COLLAR_IDS;
      groupLabel = 'ホワイトカラー系';
    } else if (job_group === 'ブルーカラー') {
      groupIds = BLUE_COLLAR_IDS;
      groupLabel = 'ブルーカラー系';
    }

    // 職種カテゴリIDを特定（個別マッチ）
    const filterByCategory = job_category && job_category !== '全職種';
    let matchedCategoryIds: number[] = [];
    let matchedCategoryName: string | null = null;

    if (filterByCategory) {
      try {
        const cats = await executeQuery<CategoryRow>(
          `SELECT ID, NAME FROM AWS.YOLO_JAPAN.PART_TIME_JOB_CATEGORY_VIEW WHERE OP != 'D' AND NAME ILIKE ?`,
          [`%${job_category}%`]
        );
        matchedCategoryIds = cats.map(c => c.ID);
        matchedCategoryName = cats.length > 0 ? cats[0].NAME : null;
      } catch (err) {
        console.error('[market-data] カテゴリ検索エラー:', err);
      }
    }

    // フィルタ用ID配列を決定（個別マッチ > グループ > 全件）
    const filterIds = matchedCategoryIds.length > 0
      ? matchedCategoryIds
      : (groupIds.length > 0 ? groupIds : []);

    const catIdList = filterIds.length > 0 ? filterIds.join(',') : '';
    const catFilter = catIdList ? `AND ref.PART_TIME_JOB_CATEGORY_ID IN (${catIdList})` : '';
    const prefFilter = prefCode ? `AND pt.WORK_PREFECTURE = '${prefCode}'` : '';
    const needPrefJoin = !!prefCode;

    let avgSalary: number | null = null;
    let jobCount = 0;
    let totalApplicants = 0;

    // ① 平均給与（PART_TIME_SALARY_VIEWベース）
    try {
      const prefJoin = needPrefJoin
        ? `JOIN AWS.YOLO_JAPAN.PART_TIME_VIEW pt ON pt.ID = ref.PART_TIME_ID AND pt.OP != 'D'`
        : '';

      const salaryQuery = `
        SELECT ROUND(AVG(ps.MINIMUM_WAGE)) AS AVG_SALARY, COUNT(DISTINCT ps.ID) AS JOB_COUNT
        FROM AWS.YOLO_JAPAN.PART_TIME_SALARY_VIEW ps
        JOIN AWS.YOLO_JAPAN.PART_TIME_JOB_CATEGORY_REF_VIEW ref
          ON ref.ID = ps.PART_TIME_JOB_CATEGORY_REF_ID AND ref.OP != 'D'
        ${prefJoin}
        WHERE ps.OP != 'D'
          AND ps.PAYMENT_TYPE = '${paymentType}'
          AND ps.MINIMUM_WAGE > 0
          ${catFilter}
          ${prefFilter}
      `;

      console.log('[market-data] 給与SQL:', salaryQuery.trim().replace(/\s+/g, ' '));
      const rows = await executeQuery<SalaryRow>(salaryQuery);
      console.log('[market-data] 給与結果:', rows);
      if (rows.length > 0) {
        avgSalary = rows[0].AVG_SALARY || null;
        jobCount = rows[0].JOB_COUNT || 0;
      }
    } catch (err) {
      console.error('[market-data] 給与クエリエラー:', err);
    }

    // ② 月間応募数（3段階フォールバック）
    let searchLevel = 'category';
    const prefJoinSql = needPrefJoin
      ? `JOIN AWS.YOLO_JAPAN.PART_TIME_VIEW pt ON pt.ID = sj.ID AND pt.OP != 'D'`
      : '';
    const baseApplicantSql = `
      FROM AWS.YOLO_JAPAN.APPLICATION_OPPORTUNITY_VIEW ao
      JOIN AWS.YOLO_JAPAN.SWIFT_JOB_USER_VIEW sju ON sju.APPLICATION_OPPORTUNITY_ID = ao.ID AND sju.OP != 'D'
      JOIN AWS.YOLO_JAPAN.SWIFT_JOB_VIEW sj ON sj.ID = sju.SWIFT_JOB_ID AND sj.OP != 'D'
      JOIN AWS.YOLO_JAPAN.PART_TIME_JOB_CATEGORY_REF_VIEW ref ON ref.PART_TIME_ID = sj.ID AND ref.OP != 'D'
      ${prefJoinSql}
      WHERE ao.OP != 'D'
        AND ao.CREATED_AT >= DATEADD('month', -${MONTHS_RANGE}, CURRENT_DATE())
        ${prefFilter}
    `;

    // STEP1: 個別カテゴリ
    if (matchedCategoryIds.length > 0) {
      try {
        const catIds = matchedCategoryIds.join(',');
        const q = `SELECT COUNT(DISTINCT ao.ID) AS TOTAL_APPLICANTS ${baseApplicantSql} AND ref.PART_TIME_JOB_CATEGORY_ID IN (${catIds})`;
        console.log('[market-data] 応募STEP1(カテゴリ) catIds:', catIds);
        const rows = await executeQuery<ApplicantRow>(q);
        totalApplicants = rows[0]?.TOTAL_APPLICANTS || 0;
        console.log('[market-data] STEP1結果:', totalApplicants, 'raw:', rows[0]);
        searchLevel = 'category';
      } catch (err) {
        console.error('[market-data] 応募STEP1エラー:', err);
      }
    }

    // STEP2: グループ全体（STEP1が0件の場合）
    if (totalApplicants < 5 && groupIds.length > 0) {
      try {
        const grpIds = groupIds.join(',');
        const q = `SELECT COUNT(DISTINCT ao.ID) AS TOTAL_APPLICANTS ${baseApplicantSql} AND ref.PART_TIME_JOB_CATEGORY_ID IN (${grpIds})`;
        console.log('[market-data] 応募STEP2(グループ)');
        const rows = await executeQuery<ApplicantRow>(q);
        totalApplicants = rows[0]?.TOTAL_APPLICANTS || 0;
        searchLevel = 'group';
      } catch (err) {
        console.error('[market-data] 応募STEP2エラー:', err);
      }
    }

    // STEP3: 都道府県のみ（STEP2も0件の場合）
    if (totalApplicants < 5 && needPrefJoin) {
      try {
        const q = `SELECT COUNT(DISTINCT ao.ID) AS TOTAL_APPLICANTS ${baseApplicantSql}`;
        console.log('[market-data] 応募STEP3(都道府県のみ)');
        const rows = await executeQuery<ApplicantRow>(q);
        totalApplicants = rows[0]?.TOTAL_APPLICANTS || 0;
        searchLevel = 'prefecture';
      } catch (err) {
        console.error('[market-data] 応募STEP3エラー:', err);
      }
    }

    const monthlyAvg = Math.round(totalApplicants / MONTHS_RANGE);

    // ラベル生成
    const prefLabel = prefecture || '全国';
    const salaryLabel = salary_type || '時給';
    const displayLabel = groupLabel
      ? `${prefLabel}${groupLabel}平均${salaryLabel}`
      : `${prefLabel}同職種平均${salaryLabel}`;

    // 応募ラベル
    let applicantLabel = '同職種の月間応募予測';
    if (searchLevel === 'group') applicantLabel = '同系統の月間応募予測';
    if (searchLevel === 'prefecture') applicantLabel = `${prefLabel}全体の月間応募予測`;

    console.log('[market-data] 集計:', { avgSalary, jobCount, totalApplicants, monthlyAvg, searchLevel, matchedCategoryName, groupLabel, prefLabel });

    if (avgSalary === null && jobCount === 0 && totalApplicants === 0) {
      return NextResponse.json({
        avg_salary: null, monthly_applicants: 0, job_count: 0,
        no_data: true, display_label: displayLabel, applicant_label: applicantLabel, search_level: searchLevel,
      }, { headers: CORS_HEADERS });
    }

    return NextResponse.json({
      avg_salary: avgSalary,
      monthly_applicants: monthlyAvg,
      job_count: jobCount,
      matched_category: matchedCategoryName,
      job_group: groupLabel || null,
      prefecture: prefLabel,
      display_label: displayLabel,
      applicant_label: applicantLabel,
      search_level: searchLevel,
      no_data: false,
    }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('[market-data] エラー:', error);
    return NextResponse.json(
      { error: 'マーケットデータの取得に失敗しました' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
