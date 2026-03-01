import { queryAll, queryOne, execQuery } from '../index';
import { Session, SessionWithStats } from '../../../shared/types';
import { safeStorage } from 'electron';

interface SessionRow {
  id: number;
  name: string;
  description: string | null;
  twitter_api_key: string | null;
  twitter_api_secret: string | null;
  twitter_access_token: string | null;
  twitter_access_token_secret: string | null;
  enabled: number;
  posting_interval: number;
  posting_time: string;
  created_at: number;
  updated_at: number;
}

interface SessionWithStatsRow extends SessionRow {
  source_count: number;
  pending_posts: number;
  posted_count: number;
}

function encryptValue(value: string | undefined): string | null {
  if (!value) return null;
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(value).toString('base64');
  }
  return value;
}

function decryptValue(value: string | null): string | undefined {
  if (!value) return undefined;
  if (safeStorage.isEncryptionAvailable()) {
    try {
      const buffer = Buffer.from(value, 'base64');
      return safeStorage.decryptString(buffer);
    } catch {
      return value;
    }
  }
  return value;
}

function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    twitterApiKey: decryptValue(row.twitter_api_key),
    twitterApiSecret: decryptValue(row.twitter_api_secret),
    twitterAccessToken: decryptValue(row.twitter_access_token),
    twitterAccessTokenSecret: decryptValue(row.twitter_access_token_secret),
    enabled: Boolean(row.enabled),
    postingInterval: row.posting_interval,
    postingTime: row.posting_time,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSessionWithStats(row: SessionWithStatsRow): SessionWithStats {
  return {
    ...rowToSession(row),
    sourceCount: row.source_count,
    pendingPosts: row.pending_posts,
    postedCount: row.posted_count,
  };
}

export const sessionRepository = {
  getAll(): Session[] {
    const rows = queryAll<SessionRow>(`
      SELECT * FROM sessions
      ORDER BY created_at DESC
    `);
    return rows.map(rowToSession);
  },

  getAllWithStats(): SessionWithStats[] {
    const rows = queryAll<SessionWithStatsRow>(`
      SELECT
        s.*,
        COALESCE(src.source_count, 0) as source_count,
        COALESCE(pp.pending_posts, 0) as pending_posts,
        COALESCE(pc.posted_count, 0) as posted_count
      FROM sessions s
      LEFT JOIN (
        SELECT session_id, COUNT(*) as source_count
        FROM sources
        WHERE session_id IS NOT NULL
        GROUP BY session_id
      ) src ON s.id = src.session_id
      LEFT JOIN (
        SELECT session_id, COUNT(*) as pending_posts
        FROM posts
        WHERE session_id IS NOT NULL AND status IN ('draft', 'scheduled')
        GROUP BY session_id
      ) pp ON s.id = pp.session_id
      LEFT JOIN (
        SELECT session_id, COUNT(*) as posted_count
        FROM posts
        WHERE session_id IS NOT NULL AND status = 'posted'
        GROUP BY session_id
      ) pc ON s.id = pc.session_id
      ORDER BY s.created_at DESC
    `);
    return rows.map(rowToSessionWithStats);
  },

  getById(id: number): Session | null {
    const row = queryOne<SessionRow>('SELECT * FROM sessions WHERE id = ?', [id]);
    return row ? rowToSession(row) : null;
  },

  getEnabled(): Session[] {
    const rows = queryAll<SessionRow>(`
      SELECT * FROM sessions
      WHERE enabled = 1
      ORDER BY created_at ASC
    `);
    return rows.map(rowToSession);
  },

  create(session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>): Session {
    const result = execQuery(`
      INSERT INTO sessions (
        name, description, twitter_api_key, twitter_api_secret,
        twitter_access_token, twitter_access_token_secret,
        enabled, posting_interval, posting_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      session.name,
      session.description || null,
      encryptValue(session.twitterApiKey),
      encryptValue(session.twitterApiSecret),
      encryptValue(session.twitterAccessToken),
      encryptValue(session.twitterAccessTokenSecret),
      session.enabled ? 1 : 0,
      session.postingInterval,
      session.postingTime
    ]);

    return this.getById(result.lastInsertRowid as number)!;
  },

  update(id: number, session: Partial<Session>): Session | null {
    const current = this.getById(id);
    if (!current) return null;

    const updates: string[] = [];
    const values: any[] = [];

    if (session.name !== undefined) {
      updates.push('name = ?');
      values.push(session.name);
    }
    if (session.description !== undefined) {
      updates.push('description = ?');
      values.push(session.description || null);
    }
    if (session.twitterApiKey !== undefined) {
      updates.push('twitter_api_key = ?');
      values.push(encryptValue(session.twitterApiKey));
    }
    if (session.twitterApiSecret !== undefined) {
      updates.push('twitter_api_secret = ?');
      values.push(encryptValue(session.twitterApiSecret));
    }
    if (session.twitterAccessToken !== undefined) {
      updates.push('twitter_access_token = ?');
      values.push(encryptValue(session.twitterAccessToken));
    }
    if (session.twitterAccessTokenSecret !== undefined) {
      updates.push('twitter_access_token_secret = ?');
      values.push(encryptValue(session.twitterAccessTokenSecret));
    }
    if (session.enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(session.enabled ? 1 : 0);
    }
    if (session.postingInterval !== undefined) {
      updates.push('posting_interval = ?');
      values.push(session.postingInterval);
    }
    if (session.postingTime !== undefined) {
      updates.push('posting_time = ?');
      values.push(session.postingTime);
    }

    if (updates.length === 0) return current;

    updates.push("updated_at = strftime('%s', 'now')");
    values.push(id);

    execQuery(`
      UPDATE sessions SET ${updates.join(', ')} WHERE id = ?
    `, values);

    return this.getById(id);
  },

  delete(id: number): boolean {
    // First, unassign all sources from this session
    execQuery('UPDATE sources SET session_id = NULL WHERE session_id = ?', [id]);
    // Then delete the session
    const result = execQuery('DELETE FROM sessions WHERE id = ?', [id]);
    return result.changes > 0;
  },

  toggle(id: number): Session | null {
    const current = this.getById(id);
    if (!current) return null;

    execQuery(`
      UPDATE sessions
      SET enabled = ?, updated_at = strftime('%s', 'now')
      WHERE id = ?
    `, [current.enabled ? 0 : 1, id]);

    return this.getById(id);
  },

  getTwitterCredentials(id: number): {
    apiKey?: string;
    apiSecret?: string;
    accessToken?: string;
    accessTokenSecret?: string;
  } | null {
    const session = this.getById(id);
    if (!session) return null;

    return {
      apiKey: session.twitterApiKey,
      apiSecret: session.twitterApiSecret,
      accessToken: session.twitterAccessToken,
      accessTokenSecret: session.twitterAccessTokenSecret,
    };
  },

  hasTwitterCredentials(id: number): boolean {
    const creds = this.getTwitterCredentials(id);
    if (!creds) return false;
    return !!(creds.apiKey && creds.apiSecret && creds.accessToken && creds.accessTokenSecret);
  },
};
