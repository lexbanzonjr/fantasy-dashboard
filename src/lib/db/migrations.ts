// Schema changes, applied in order and tracked in the schema_version table. Only ever append.
export const MIGRATIONS: string[] = [
  // 1: the CBS league connection. One user, so at most one row (id = 1).
  `CREATE TABLE cbs_connection (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    league_id TEXT NOT NULL,
    league_name TEXT,
    my_team_id TEXT,
    token_ciphertext TEXT NOT NULL,
    token_updated_at TEXT,
    last_verified_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  // 2: AI pickup research, one row per free agent per position and scoring period. Kept so a page
  // visit shows the last run instead of paying for a new one.
  `CREATE TABLE pickup_reports (
    position TEXT NOT NULL,
    period INTEGER NOT NULL,
    player_id TEXT NOT NULL,
    report_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (position, period, player_id)
  )`,
  // 3: how the AI reached each report (prompt, web searches, thinking summary). Null on older rows.
  `ALTER TABLE pickup_reports ADD COLUMN trace_json TEXT`,
];
