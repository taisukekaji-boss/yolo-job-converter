import snowflake from 'snowflake-sdk';

let connection: snowflake.Connection | null = null;

function getConnectionConfig(): snowflake.ConnectionOptions {
  const privateKey = process.env.SNOWFLAKE_PRIVATE_KEY;

  if (privateKey) {
    return {
      account: process.env.SNOWFLAKE_ACCOUNT!,
      username: process.env.SNOWFLAKE_USERNAME!,
      authenticator: 'SNOWFLAKE_JWT',
      privateKey: privateKey,
      warehouse: process.env.SNOWFLAKE_WAREHOUSE!,
      database: process.env.SNOWFLAKE_DATABASE || 'AWS',
      schema: process.env.SNOWFLAKE_SCHEMA || 'YOLO_JAPAN',
      role: process.env.SNOWFLAKE_ROLE,
    };
  }

  return {
    account: process.env.SNOWFLAKE_ACCOUNT!,
    username: process.env.SNOWFLAKE_USERNAME!,
    password: process.env.SNOWFLAKE_PASSWORD!,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE!,
    database: process.env.SNOWFLAKE_DATABASE || 'AWS',
    schema: process.env.SNOWFLAKE_SCHEMA || 'YOLO_JAPAN',
    role: process.env.SNOWFLAKE_ROLE,
  };
}

export async function getSnowflakeConnection(): Promise<snowflake.Connection> {
  if (connection) return connection;

  const conn = snowflake.createConnection(getConnectionConfig());

  return new Promise((resolve, reject) => {
    conn.connect((err, c) => {
      if (err) {
        console.error('[Snowflake] 接続エラー:', err.message);
        reject(err);
        return;
      }
      console.log('[Snowflake] 接続成功');
      connection = c;
      resolve(c);
    });
  });
}

export async function executeQuery<T>(sql: string, binds: (string | number)[] = []): Promise<T[]> {
  const conn = await getSnowflakeConnection();
  return new Promise((resolve, reject) => {
    conn.execute({
      sqlText: sql,
      binds,
      complete: (err, _stmt, rows) => {
        if (err) {
          console.error('[Snowflake] クエリエラー:', err.message);
          reject(err);
          return;
        }
        resolve((rows || []) as T[]);
      },
    });
  });
}

export function isSnowflakeConfigured(): boolean {
  return !!(process.env.SNOWFLAKE_ACCOUNT && process.env.SNOWFLAKE_USERNAME);
}
