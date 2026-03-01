import { queryAll, queryOne, execQuery, runTransaction } from '../index';
import type { NewsItem, NewsItemWithSource } from '@shared/types';

export class NewsRepository {
  getAll(limit = 100, offset = 0): NewsItemWithSource[] {
    const rows = queryAll<any>(
      `
        SELECT
          n.*,
          s.name as source_name,
          s.type as source_type,
          s.url as source_url
        FROM news_items n
        LEFT JOIN sources s ON n.source_id = s.id
        ORDER BY n.published_at DESC, n.created_at DESC
        LIMIT ? OFFSET ?
      `,
      [limit, offset]
    );

    return rows.map(this.mapRowToNewsItemWithSource);
  }

  getUnprocessed(limit = 50): NewsItem[] {
    const rows = queryAll<any>(
      `
        SELECT * FROM news_items
        WHERE processed = 0
        ORDER BY published_at DESC, created_at DESC
        LIMIT ?
      `,
      [limit]
    );

    return rows.map(this.mapRowToNewsItem);
  }

  getById(id: number): NewsItemWithSource | null {
    const row = queryOne<any>(
      `
        SELECT
          n.*,
          s.name as source_name,
          s.type as source_type,
          s.url as source_url
        FROM news_items n
        LEFT JOIN sources s ON n.source_id = s.id
        WHERE n.id = ?
      `,
      [id]
    );

    return row ? this.mapRowToNewsItemWithSource(row) : null;
  }

  insert(item: Omit<NewsItem, 'id' | 'createdAt' | 'fetchedAt'>): number {
    const result = execQuery(
      `
        INSERT OR IGNORE INTO news_items
        (source_id, external_id, title, content, summary, url, amount_lost, chain, classification, technique, published_at, processed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        item.sourceId,
        item.externalId || null,
        item.title,
        item.content || null,
        item.summary || null,
        item.url || null,
        item.amountLost || null,
        item.chain || null,
        item.classification || null,
        item.technique || null,
        item.publishedAt || null,
        item.processed ? 1 : 0
      ]
    );

    return result.lastInsertRowid;
  }

  insertMany(items: Omit<NewsItem, 'id' | 'createdAt' | 'fetchedAt'>[]): number {
    let inserted = 0;

    runTransaction(() => {
      for (const item of items) {
        const result = execQuery(
          `
          INSERT OR IGNORE INTO news_items
          (source_id, external_id, title, content, summary, url, amount_lost, chain, classification, technique, published_at, processed)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            item.sourceId,
            item.externalId || null,
            item.title,
            item.content || null,
            item.summary || null,
            item.url || null,
            item.amountLost || null,
            item.chain || null,
            item.classification || null,
            item.technique || null,
            item.publishedAt || null,
            item.processed ? 1 : 0
          ]
        );
        if (result.changes > 0) inserted++;
      }
    });

    return inserted;
  }

  updateSummary(id: number, summary: string): void {
    execQuery('UPDATE news_items SET summary = ? WHERE id = ?', [summary, id]);
  }

  markProcessed(id: number): void {
    execQuery('UPDATE news_items SET processed = 1 WHERE id = ?', [id]);
  }

  delete(id: number): void {
    execQuery('DELETE FROM news_items WHERE id = ?', [id]);
  }

  getCount(): number {
    const row = queryOne<any>('SELECT COUNT(*) as count FROM news_items');
    return row?.count ?? 0;
  }

  getUnprocessedCount(): number {
    const row = queryOne<any>('SELECT COUNT(*) as count FROM news_items WHERE processed = 0');
    return row?.count ?? 0;
  }

  existsByExternalId(sourceId: number, externalId: string): boolean {
    const row = queryOne('SELECT 1 FROM news_items WHERE source_id = ? AND external_id = ?', [sourceId, externalId]);
    return !!row;
  }

  private mapRowToNewsItem(row: any): NewsItem {
    return {
      id: row.id,
      sourceId: row.source_id,
      externalId: row.external_id,
      title: row.title,
      content: row.content,
      summary: row.summary,
      url: row.url,
      amountLost: row.amount_lost,
      chain: row.chain,
      classification: row.classification,
      technique: row.technique,
      publishedAt: row.published_at,
      fetchedAt: row.fetched_at,
      processed: !!row.processed,
      createdAt: row.created_at,
    };
  }

  private mapRowToNewsItemWithSource(row: any): NewsItemWithSource {
    return {
      ...this.mapRowToNewsItem(row),
      source: {
        id: row.source_id,
        name: row.source_name,
        type: row.source_type,
        url: row.source_url,
        enabled: true,
        createdAt: 0,
        updatedAt: 0,
      },
    };
  }
}

export const newsRepository = new NewsRepository();
