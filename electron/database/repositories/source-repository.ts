import { queryAll, queryOne, execQuery } from '../index';
import type { NewsSource, SourceConfig } from '@shared/types';

export class SourceRepository {
  getAll(): NewsSource[] {
    const rows = queryAll<any>('SELECT * FROM sources ORDER BY name');
    return rows.map(this.mapRowToSource);
  }

  getBySessionId(sessionId: number | null): NewsSource[] {
    const rows = sessionId !== null
      ? queryAll<any>('SELECT * FROM sources WHERE session_id = ? ORDER BY name', [sessionId])
      : queryAll<any>('SELECT * FROM sources WHERE session_id IS NULL ORDER BY name');
    return rows.map(this.mapRowToSource);
  }

  getEnabled(): NewsSource[] {
    const rows = queryAll<any>('SELECT * FROM sources WHERE enabled = 1 ORDER BY name');
    return rows.map(this.mapRowToSource);
  }

  getEnabledBySessionId(sessionId: number | null): NewsSource[] {
    const rows = sessionId !== null
      ? queryAll<any>('SELECT * FROM sources WHERE enabled = 1 AND session_id = ? ORDER BY name', [sessionId])
      : queryAll<any>('SELECT * FROM sources WHERE enabled = 1 AND session_id IS NULL ORDER BY name');
    return rows.map(this.mapRowToSource);
  }

  getById(id: number): NewsSource | null {
    const row = queryOne<any>('SELECT * FROM sources WHERE id = ?', [id]);
    return row ? this.mapRowToSource(row) : null;
  }

  insert(source: Omit<NewsSource, 'id' | 'createdAt' | 'updatedAt'>): number {
    const result = execQuery(
      `
        INSERT INTO sources (name, type, url, enabled, config, session_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        source.name,
        source.type,
        source.url,
        source.enabled ? 1 : 0,
        source.config ? JSON.stringify(source.config) : null,
        source.sessionId ?? null
      ]
    );

    return result.lastInsertRowid;
  }

  assignToSession(sourceId: number, sessionId: number | null): void {
    execQuery(
      "UPDATE sources SET session_id = ?, updated_at = strftime('%s', 'now') WHERE id = ?",
      [sessionId, sourceId]
    );
  }

  updateLastFetched(id: number): void {
    execQuery(
      "UPDATE sources SET last_fetched_at = strftime('%s', 'now'), updated_at = strftime('%s', 'now') WHERE id = ?",
      [id]
    );
  }

  toggleEnabled(id: number): boolean {
    execQuery(
      "UPDATE sources SET enabled = NOT enabled, updated_at = strftime('%s', 'now') WHERE id = ?",
      [id]
    );

    const row = queryOne<any>('SELECT enabled FROM sources WHERE id = ?', [id]);
    return !!row?.enabled;
  }

  delete(id: number): void {
    execQuery('DELETE FROM sources WHERE id = ?', [id]);
  }

  update(id: number, source: Partial<Omit<NewsSource, 'id' | 'createdAt'>>): void {
    const updates: string[] = [];
    const values: any[] = [];

    if (source.name !== undefined) {
      updates.push('name = ?');
      values.push(source.name);
    }
    if (source.type !== undefined) {
      updates.push('type = ?');
      values.push(source.type);
    }
    if (source.url !== undefined) {
      updates.push('url = ?');
      values.push(source.url);
    }
    if (source.enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(source.enabled ? 1 : 0);
    }
    if (source.config !== undefined) {
      updates.push('config = ?');
      values.push(JSON.stringify(source.config));
    }
    if (source.lastFetchedAt !== undefined) {
      updates.push('last_fetched_at = ?');
      values.push(source.lastFetchedAt);
    }
    if (source.sessionId !== undefined) {
      updates.push('session_id = ?');
      values.push(source.sessionId);
    }

    if (updates.length > 0) {
      updates.push("updated_at = strftime('%s', 'now')");
      values.push(id);
      execQuery(`UPDATE sources SET ${updates.join(', ')} WHERE id = ?`, values);
    }
  }

  private mapRowToSource(row: any): NewsSource {
    let config: SourceConfig | undefined;
    if (row.config) {
      try {
        config = JSON.parse(row.config);
      } catch {
        config = undefined;
      }
    }

    return {
      id: row.id,
      sessionId: row.session_id ?? undefined,
      name: row.name,
      type: row.type,
      url: row.url,
      enabled: !!row.enabled,
      config,
      lastFetchedAt: row.last_fetched_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const sourceRepository = new SourceRepository();
