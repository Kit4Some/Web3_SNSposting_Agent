import { queryAll, queryOne, execQuery } from '../index';
import type { Post, PostWithNews, PostStatus } from '@shared/types';

export class PostRepository {
  getAll(limit = 100, offset = 0): PostWithNews[] {
    const rows = queryAll<any>(
      `
        SELECT
          p.*,
          n.title as news_title,
          n.content as news_content,
          n.url as news_url,
          n.amount_lost as news_amount_lost,
          n.chain as news_chain,
          n.classification as news_classification,
          n.published_at as news_published_at
        FROM posts p
        LEFT JOIN news_items n ON p.news_item_id = n.id
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `,
      [limit, offset]
    );

    return rows.map(this.mapRowToPostWithNews);
  }

  getQueue(): PostWithNews[] {
    const rows = queryAll<any>(
      `
        SELECT
          p.*,
          n.title as news_title,
          n.content as news_content,
          n.url as news_url,
          n.amount_lost as news_amount_lost,
          n.chain as news_chain,
          n.classification as news_classification,
          n.published_at as news_published_at
        FROM posts p
        LEFT JOIN news_items n ON p.news_item_id = n.id
        WHERE p.status IN ('draft', 'scheduled')
        ORDER BY p.scheduled_for ASC, p.created_at DESC
      `
    );

    return rows.map(this.mapRowToPostWithNews);
  }

  getHistory(limit = 50): PostWithNews[] {
    const rows = queryAll<any>(
      `
        SELECT
          p.*,
          n.title as news_title,
          n.content as news_content,
          n.url as news_url,
          n.amount_lost as news_amount_lost,
          n.chain as news_chain,
          n.classification as news_classification,
          n.published_at as news_published_at
        FROM posts p
        LEFT JOIN news_items n ON p.news_item_id = n.id
        WHERE p.status IN ('posted', 'failed')
        ORDER BY p.posted_at DESC, p.created_at DESC
        LIMIT ?
      `,
      [limit]
    );

    return rows.map(this.mapRowToPostWithNews);
  }

  getScheduled(): PostWithNews[] {
    const rows = queryAll<any>(
      `
        SELECT
          p.*,
          n.title as news_title,
          n.content as news_content,
          n.url as news_url,
          n.amount_lost as news_amount_lost,
          n.chain as news_chain,
          n.classification as news_classification,
          n.published_at as news_published_at
        FROM posts p
        LEFT JOIN news_items n ON p.news_item_id = n.id
        WHERE p.status = 'scheduled'
        ORDER BY p.scheduled_for ASC
      `
    );

    return rows.map(this.mapRowToPostWithNews);
  }

  getNextScheduled(): PostWithNews | null {
    const now = Math.floor(Date.now() / 1000);
    const row = queryOne<any>(
      `
        SELECT
          p.*,
          n.title as news_title,
          n.content as news_content,
          n.url as news_url,
          n.amount_lost as news_amount_lost,
          n.chain as news_chain,
          n.classification as news_classification,
          n.published_at as news_published_at
        FROM posts p
        LEFT JOIN news_items n ON p.news_item_id = n.id
        WHERE p.status = 'scheduled' AND p.scheduled_for <= ?
        ORDER BY p.scheduled_for ASC
        LIMIT 1
      `,
      [now]
    );

    return row ? this.mapRowToPostWithNews(row) : null;
  }

  getById(id: number): PostWithNews | null {
    const row = queryOne<any>(
      `
        SELECT
          p.*,
          n.title as news_title,
          n.content as news_content,
          n.url as news_url,
          n.amount_lost as news_amount_lost,
          n.chain as news_chain,
          n.classification as news_classification,
          n.published_at as news_published_at
        FROM posts p
        LEFT JOIN news_items n ON p.news_item_id = n.id
        WHERE p.id = ?
      `,
      [id]
    );

    return row ? this.mapRowToPostWithNews(row) : null;
  }

  insert(post: Omit<Post, 'id' | 'createdAt' | 'updatedAt'>): number {
    const result = execQuery(
      `
        INSERT INTO posts
        (news_item_id, session_id, content, image_url, image_prompt, status, scheduled_for, posted_at, tweet_id, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        post.newsItemId,
        post.sessionId ?? null,
        post.content,
        post.imageUrl || null,
        post.imagePrompt || null,
        post.status,
        post.scheduledFor || null,
        post.postedAt || null,
        post.tweetId || null,
        post.errorMessage || null
      ]
    );

    return result.lastInsertRowid;
  }

  update(id: number, post: Partial<Omit<Post, 'id' | 'createdAt'>>): void {
    const updates: string[] = [];
    const values: any[] = [];

    if (post.content !== undefined) {
      updates.push('content = ?');
      values.push(post.content);
    }
    if (post.imageUrl !== undefined) {
      updates.push('image_url = ?');
      values.push(post.imageUrl);
    }
    if (post.imagePrompt !== undefined) {
      updates.push('image_prompt = ?');
      values.push(post.imagePrompt);
    }
    if (post.status !== undefined) {
      updates.push('status = ?');
      values.push(post.status);
    }
    if (post.scheduledFor !== undefined) {
      updates.push('scheduled_for = ?');
      values.push(post.scheduledFor);
    }
    if (post.postedAt !== undefined) {
      updates.push('posted_at = ?');
      values.push(post.postedAt);
    }
    if (post.tweetId !== undefined) {
      updates.push('tweet_id = ?');
      values.push(post.tweetId);
    }
    if (post.errorMessage !== undefined) {
      updates.push('error_message = ?');
      values.push(post.errorMessage);
    }
    if (post.sessionId !== undefined) {
      updates.push('session_id = ?');
      values.push(post.sessionId);
    }

    if (updates.length > 0) {
      updates.push("updated_at = strftime('%s', 'now')");
      values.push(id);
      execQuery(`UPDATE posts SET ${updates.join(', ')} WHERE id = ?`, values);
    }
  }

  updateStatus(id: number, status: PostStatus, errorMessage?: string): void {
    if (status === 'posted') {
      execQuery(
        "UPDATE posts SET status = ?, posted_at = strftime('%s', 'now'), updated_at = strftime('%s', 'now') WHERE id = ?",
        [status, id]
      );
    } else if (status === 'failed' && errorMessage) {
      execQuery(
        "UPDATE posts SET status = ?, error_message = ?, updated_at = strftime('%s', 'now') WHERE id = ?",
        [status, errorMessage, id]
      );
    } else {
      execQuery(
        "UPDATE posts SET status = ?, updated_at = strftime('%s', 'now') WHERE id = ?",
        [status, id]
      );
    }
  }

  schedule(id: number, scheduledFor: number): void {
    execQuery(
      "UPDATE posts SET status = 'scheduled', scheduled_for = ?, updated_at = strftime('%s', 'now') WHERE id = ?",
      [scheduledFor, id]
    );
  }

  markPosted(id: number, tweetId: string): void {
    execQuery(
      "UPDATE posts SET status = 'posted', tweet_id = ?, posted_at = strftime('%s', 'now'), updated_at = strftime('%s', 'now') WHERE id = ?",
      [tweetId, id]
    );
  }

  delete(id: number): void {
    execQuery('DELETE FROM posts WHERE id = ?', [id]);
  }

  getScheduledCount(): number {
    const row = queryOne<any>("SELECT COUNT(*) as count FROM posts WHERE status = 'scheduled'");
    return row?.count ?? 0;
  }

  getPostedCount(): number {
    const row = queryOne<any>("SELECT COUNT(*) as count FROM posts WHERE status = 'posted'");
    return row?.count ?? 0;
  }

  getLastPostedDate(): number | null {
    const row = queryOne<any>(
      "SELECT posted_at FROM posts WHERE status = 'posted' ORDER BY posted_at DESC LIMIT 1"
    );
    return row?.posted_at || null;
  }

  getQueueBySessionId(sessionId: number | null): PostWithNews[] {
    const query = sessionId !== null
      ? `
        SELECT
          p.*,
          n.title as news_title,
          n.content as news_content,
          n.url as news_url,
          n.amount_lost as news_amount_lost,
          n.chain as news_chain,
          n.classification as news_classification,
          n.published_at as news_published_at
        FROM posts p
        LEFT JOIN news_items n ON p.news_item_id = n.id
        WHERE p.status IN ('draft', 'scheduled') AND p.session_id = ?
        ORDER BY p.scheduled_for ASC, p.created_at DESC
      `
      : `
        SELECT
          p.*,
          n.title as news_title,
          n.content as news_content,
          n.url as news_url,
          n.amount_lost as news_amount_lost,
          n.chain as news_chain,
          n.classification as news_classification,
          n.published_at as news_published_at
        FROM posts p
        LEFT JOIN news_items n ON p.news_item_id = n.id
        WHERE p.status IN ('draft', 'scheduled') AND p.session_id IS NULL
        ORDER BY p.scheduled_for ASC, p.created_at DESC
      `;

    const rows = sessionId !== null
      ? queryAll<any>(query, [sessionId])
      : queryAll<any>(query);

    return rows.map(this.mapRowToPostWithNews);
  }

  getNextScheduledBySessionId(sessionId: number): PostWithNews | null {
    const now = Math.floor(Date.now() / 1000);
    const row = queryOne<any>(
      `
        SELECT
          p.*,
          n.title as news_title,
          n.content as news_content,
          n.url as news_url,
          n.amount_lost as news_amount_lost,
          n.chain as news_chain,
          n.classification as news_classification,
          n.published_at as news_published_at
        FROM posts p
        LEFT JOIN news_items n ON p.news_item_id = n.id
        WHERE p.status = 'scheduled' AND p.scheduled_for <= ? AND p.session_id = ?
        ORDER BY p.scheduled_for ASC
        LIMIT 1
      `,
      [now, sessionId]
    );

    return row ? this.mapRowToPostWithNews(row) : null;
  }

  private mapRowToPostWithNews(row: any): PostWithNews {
    return {
      id: row.id,
      sessionId: row.session_id ?? undefined,
      newsItemId: row.news_item_id,
      content: row.content,
      imageUrl: row.image_url,
      imagePrompt: row.image_prompt,
      status: row.status,
      scheduledFor: row.scheduled_for,
      postedAt: row.posted_at,
      tweetId: row.tweet_id,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      newsItem: {
        id: row.news_item_id,
        sourceId: 0,
        title: row.news_title,
        content: row.news_content,
        url: row.news_url,
        amountLost: row.news_amount_lost,
        chain: row.news_chain,
        classification: row.news_classification,
        publishedAt: row.news_published_at,
        fetchedAt: 0,
        processed: true,
        createdAt: 0,
      },
    };
  }
}

export const postRepository = new PostRepository();
