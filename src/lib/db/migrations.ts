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
];
