import snowflake from 'snowflake-sdk';
import { readFileSync } from 'fs';
const envText = readFileSync('.env.local', 'utf8');
const vars = {};
let curKey = null, curVal = '', inML = false;
for (const line of envText.split('\n')) {
  if (inML) { curVal += '\n' + line; if (line.includes('-----END PRIVATE KEY-----')) { vars[curKey] = curVal.replace(/^"|"$/g, ''); inML = false; } }
  else if (line.startsWith('#') || !line.trim()) continue;
  else { const idx = line.indexOf('='); if (idx > 0) { const k = line.substring(0, idx), v = line.substring(idx + 1); if (v.includes('BEGIN PRIVATE KEY')) { curKey = k; curVal = v; inML = true; } else vars[k] = v.replace(/^"|"$/g, ''); } }
}
snowflake.configure({ logLevel: 'OFF' });
const conn = snowflake.createConnection({ account: vars.SNOWFLAKE_ACCOUNT, username: vars.SNOWFLAKE_USERNAME, authenticator: 'SNOWFLAKE_JWT', privateKey: vars.SNOWFLAKE_PRIVATE_KEY, warehouse: vars.SNOWFLAKE_WAREHOUSE, database: vars.SNOWFLAKE_DATABASE, schema: vars.SNOWFLAKE_SCHEMA, role: vars.SNOWFLAKE_ROLE });
function query(sql) { return new Promise((resolve, reject) => { conn.execute({ sqlText: sql, complete: (e, s, r) => e ? reject(e) : resolve(r) }); }); }

conn.connect(async (err) => {
  if (err) { console.error('接続エラー:', err.message); process.exit(1); }

  console.log('=== 大阪府 カテゴリ別応募数 TOP20 ===');
  const rows = await query(`
    SELECT cat.NAME, cat.ID, COUNT(*) AS TOTAL
    FROM AWS.YOLO_JAPAN.APPLICATION_OPPORTUNITY_VIEW ao
    JOIN AWS.YOLO_JAPAN.SWIFT_JOB_USER_VIEW sju ON sju.APPLICATION_OPPORTUNITY_ID = ao.ID
    JOIN AWS.YOLO_JAPAN.SWIFT_JOB_VIEW sj ON sj.ID = sju.SWIFT_JOB_ID
    JOIN AWS.YOLO_JAPAN.PART_TIME_JOB_CATEGORY_REF_VIEW ref ON ref.PART_TIME_ID = sj.ID
    JOIN AWS.YOLO_JAPAN.PART_TIME_JOB_CATEGORY_VIEW cat ON cat.ID = ref.PART_TIME_JOB_CATEGORY_ID
    JOIN AWS.YOLO_JAPAN.PART_TIME_VIEW pt ON pt.ID = sj.ID
    WHERE ao.OP != 'D' AND sj.OP != 'D' AND pt.OP != 'D'
    AND pt.WORK_PREFECTURE = '27'
    AND ao.CREATED_AT >= DATEADD('month', -6, CURRENT_DATE())
    GROUP BY cat.NAME, cat.ID ORDER BY TOTAL DESC LIMIT 20
  `);
  rows.forEach(r => console.log(`${r.TOTAL}\tID:${r.ID}\t${r.NAME}`));

  conn.destroy(() => process.exit(0));
});
