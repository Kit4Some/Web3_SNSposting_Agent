import type { NewsItem, NewsSource } from '@shared/types';

export abstract class BaseNewsSource {
  protected source: NewsSource;

  constructor(source: NewsSource) {
    this.source = source;
  }

  abstract fetch(): Promise<Omit<NewsItem, 'id' | 'createdAt' | 'fetchedAt'>[]>;

  protected createNewsItem(
    data: Partial<NewsItem>
  ): Omit<NewsItem, 'id' | 'createdAt' | 'fetchedAt'> {
    return {
      sourceId: this.source.id,
      externalId: data.externalId,
      title: data.title || 'Untitled',
      content: data.content,
      summary: data.summary,
      url: data.url,
      amountLost: data.amountLost,
      chain: data.chain,
      classification: data.classification,
      technique: data.technique,
      publishedAt: data.publishedAt,
      processed: false,
    };
  }

  protected formatAmount(amount: number | null | undefined): string {
    if (!amount) return 'Unknown';
    if (amount >= 1_000_000_000) {
      return `$${(amount / 1_000_000_000).toFixed(2)}B`;
    }
    if (amount >= 1_000_000) {
      return `$${(amount / 1_000_000).toFixed(2)}M`;
    }
    if (amount >= 1_000) {
      return `$${(amount / 1_000).toFixed(2)}K`;
    }
    return `$${amount.toFixed(2)}`;
  }
}
