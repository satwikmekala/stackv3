import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// Sixteen bytes have 22 unpadded base64url characters; the final two bits
// can only encode A, Q, g or w. Reject non-canonical aliases as well.
export const ROUTINE_SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{21}[AQgw]$/;
export const generateRoutineShareId = () => randomBytes(16).toString('base64url');

/** Insert-only snapshots. This path MUST be on a Railway persistent volume. */
export const openRoutineShareStore = (filename) => {
  if (!filename || !path.isAbsolute(filename)) {
    throw new Error('ROUTINE_SHARES_DB_PATH must be an absolute persistent-volume path.');
  }
  mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  try {
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = FULL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS routine_shares (
        share_id TEXT PRIMARY KEY NOT NULL CHECK(length(share_id) = 22),
        protocol_version INTEGER NOT NULL CHECK(protocol_version = 1),
        payload TEXT NOT NULL CHECK(json_valid(payload)),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      ) STRICT;
      CREATE TRIGGER IF NOT EXISTS routine_shares_no_update
        BEFORE UPDATE ON routine_shares BEGIN
          SELECT RAISE(ABORT, 'Routine shares are immutable');
        END;
      CREATE TRIGGER IF NOT EXISTS routine_shares_no_delete
        BEFORE DELETE ON routine_shares BEGIN
          SELECT RAISE(ABORT, 'Routine shares cannot be deleted or reused');
        END;
    `);
    const insert = db.prepare(`INSERT INTO routine_shares (share_id, protocol_version, payload)
      VALUES (?, ?, ?) ON CONFLICT(share_id) DO NOTHING`);
    const read = db.prepare('SELECT payload FROM routine_shares WHERE share_id = ?');
    return {
      insert: (id, version, payload) => {
        if (!ROUTINE_SHARE_ID_PATTERN.test(id)) throw new Error('Invalid generated share ID.');
        return Number(insert.run(id, version, payload).changes) === 1;
      },
      get: (id) => read.get(id)?.payload ?? null,
      close: () => db.close(),
    };
  } catch (error) {
    db.close();
    throw error;
  }
};

/** The unique constraint, rather than a prior lookup, arbitrates collisions. */
export const persistRoutineShare = async (store, payload, version, generateId = generateRoutineShareId) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = generateId();
    if (!ROUTINE_SHARE_ID_PATTERN.test(id)) throw new Error('Invalid generated share ID.');
    if (await store.insert(id, version, payload)) return id;
  }
  throw new Error('Share ID allocation failed.');
};
