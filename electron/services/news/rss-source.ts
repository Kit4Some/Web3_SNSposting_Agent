import Parser from 'rss-parser';
import { BaseNewsSource } from './base-source';
import type { NewsItem } from '@shared/types';

interface RssItem {
  title?: string;
  link?: string;
  content?: string;
  contentSnippet?: string;
  pubDate?: string;
  isoDate?: string;
  guid?: string;
  creator?: string;
  categories?: string[];
}

export class RssSource extends BaseNewsSource {
  private parser: Parser;

  constructor(source: any) {
    super(source);
    this.parser = new Parser({
      timeout: 30000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
  }

  async fetch(): Promise<Omit<NewsItem, 'id' | 'createdAt' | 'fetchedAt'>[]> {
    try {
      const feed = await this.parser.parseURL(this.source.url);
      const limit = this.source.config?.itemLimit || 20;

      const items = (feed.items || []).slice(0, limit);

      return items.map((item) => this.transformItem(item as RssItem));
    } catch (error) {
      console.error(`Failed to fetch RSS from ${this.source.url}:`, error);
      throw error;
    }
  }

  private transformItem(
    item: RssItem
  ): Omit<NewsItem, 'id' | 'createdAt' | 'fetchedAt'> {
    // Generate external ID from guid or link
    const externalId = `rss_${
      item.guid ||
      item.link ||
      Buffer.from(item.title || '').toString('base64').slice(0, 32)
    }`;

    // Parse date
    let publishedAt: number | undefined;
    if (item.isoDate) {
      publishedAt = Math.floor(new Date(item.isoDate).getTime() / 1000);
    } else if (item.pubDate) {
      publishedAt = Math.floor(new Date(item.pubDate).getTime() / 1000);
    }

    // Extract content
    const content = item.content || item.contentSnippet || '';

    // Try to extract amount from title or content
    const amountLost = this.extractAmount(
      (item.title || '') + ' ' + content
    );

    // Try to extract chain from categories or content
    const chain = this.extractChain(item.categories, content);

    return this.createNewsItem({
      externalId,
      title: item.title || 'Untitled',
      content: this.cleanHtml(content),
      url: item.link,
      amountLost,
      chain,
      publishedAt,
    });
  }

  private cleanHtml(html: string): string {
    // Remove HTML tags
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractAmount(text: string): number | undefined {
    const patterns = [
      /\$(\d+(?:\.\d+)?)\s*[Bb](?:illion)?/i,
      /\$(\d+(?:\.\d+)?)\s*[Mm](?:illion)?/i,
      /\$(\d+(?:\.\d+)?)\s*[Kk]/i,
      /\$(\d{1,3}(?:,\d{3})+(?:\.\d+)?)/,
      /(\d+(?:\.\d+)?)\s*(?:USD|USDT|USDC)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let amount = parseFloat(match[1].replace(/,/g, ''));

        if (/[Bb](?:illion)?/i.test(match[0])) {
          amount *= 1_000_000_000;
        } else if (/[Mm](?:illion)?/i.test(match[0])) {
          amount *= 1_000_000;
        } else if (/[Kk]/i.test(match[0])) {
          amount *= 1_000;
        }

        return amount;
      }
    }

    return undefined;
  }

  private extractChain(
    categories: string[] | undefined,
    content: string
  ): string | undefined {
    const knownChains = [
      'Ethereum',
      'BSC',
      'Binance Smart Chain',
      'Polygon',
      'Arbitrum',
      'Optimism',
      'Avalanche',
      'Solana',
      'Fantom',
      'Base',
      'zkSync',
      'Cronos',
      'Gnosis',
    ];

    // Check categories first
    if (categories) {
      for (const category of categories) {
        for (const chain of knownChains) {
          if (category.toLowerCase().includes(chain.toLowerCase())) {
            return chain;
          }
        }
      }
    }

    // Check content
    const foundChains: string[] = [];
    for (const chain of knownChains) {
      if (content.toLowerCase().includes(chain.toLowerCase())) {
        foundChains.push(chain);
      }
    }

    return foundChains.length > 0 ? foundChains.join(', ') : undefined;
  }
}
