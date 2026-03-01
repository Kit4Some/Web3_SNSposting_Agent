import { BaseNewsSource } from './base-source';
import { DefiLlamaSource } from './defillama-source';
import { RektNewsSource } from './rekt-news-source';
import { RssSource } from './rss-source';
import { sourceRepository, newsRepository } from '../../database/repositories';
import type { NewsSource, NewsItem } from '@shared/types';

export class NewsService {
  private createSourceHandler(source: NewsSource): BaseNewsSource | null {
    // Check if it's DeFiLlama
    if (source.url.includes('api.llama.fi')) {
      return new DefiLlamaSource(source);
    }

    // Check by type
    switch (source.type) {
      case 'api':
        // For now, only DeFiLlama API is supported
        if (source.url.includes('llama.fi')) {
          return new DefiLlamaSource(source);
        }
        return null;

      case 'scrape':
        if (source.url.includes('rekt.news')) {
          return new RektNewsSource(source);
        }
        // Generic scraping not implemented yet
        return null;

      case 'rss':
        return new RssSource(source);

      default:
        return null;
    }
  }

  async fetchFromSource(sourceId: number): Promise<{
    success: boolean;
    newItems: number;
    error?: string;
  }> {
    const source = sourceRepository.getById(sourceId);
    if (!source) {
      return { success: false, newItems: 0, error: 'Source not found' };
    }

    if (!source.enabled) {
      return { success: false, newItems: 0, error: 'Source is disabled' };
    }

    const handler = this.createSourceHandler(source);
    if (!handler) {
      return {
        success: false,
        newItems: 0,
        error: `Unsupported source type: ${source.type}`,
      };
    }

    try {
      const items = await handler.fetch();

      // Filter out duplicates
      const newItems = items.filter(
        (item) =>
          item.externalId &&
          !newsRepository.existsByExternalId(source.id, item.externalId)
      );

      // Insert new items
      const insertedCount = newsRepository.insertMany(newItems);

      // Update source last fetched time
      sourceRepository.updateLastFetched(sourceId);

      return { success: true, newItems: insertedCount };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to fetch from source ${source.name}:`, error);
      return { success: false, newItems: 0, error: errorMessage };
    }
  }

  async fetchFromAllSources(): Promise<{
    totalNewItems: number;
    results: Array<{
      sourceId: number;
      sourceName: string;
      success: boolean;
      newItems: number;
      error?: string;
    }>;
  }> {
    const sources = sourceRepository.getEnabled();
    const results: Array<{
      sourceId: number;
      sourceName: string;
      success: boolean;
      newItems: number;
      error?: string;
    }> = [];

    let totalNewItems = 0;

    for (const source of sources) {
      // Add delay between sources to avoid rate limiting
      if (results.length > 0) {
        await this.delay(2000);
      }

      const result = await this.fetchFromSource(source.id);
      results.push({
        sourceId: source.id,
        sourceName: source.name,
        ...result,
      });

      if (result.success) {
        totalNewItems += result.newItems;
      }
    }

    return { totalNewItems, results };
  }

  getNewsList(
    options: {
      limit?: number;
      offset?: number;
      unprocessedOnly?: boolean;
    } = {}
  ): NewsItem[] | import('@shared/types').NewsItemWithSource[] {
    const { limit = 100, offset = 0, unprocessedOnly = false } = options;

    if (unprocessedOnly) {
      return newsRepository.getUnprocessed(limit);
    }

    return newsRepository.getAll(limit, offset);
  }

  getNewsItem(id: number) {
    return newsRepository.getById(id);
  }

  markAsProcessed(id: number): void {
    newsRepository.markProcessed(id);
  }

  deleteNews(id: number): void {
    newsRepository.delete(id);
  }

  getStats(): {
    totalNews: number;
    unprocessedNews: number;
  } {
    return {
      totalNews: newsRepository.getCount(),
      unprocessedNews: newsRepository.getUnprocessedCount(),
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const newsService = new NewsService();
export { BaseNewsSource } from './base-source';
export { DefiLlamaSource } from './defillama-source';
export { RektNewsSource } from './rekt-news-source';
export { RssSource } from './rss-source';
