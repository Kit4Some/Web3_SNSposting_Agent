import axios from 'axios';
import * as cheerio from 'cheerio';
import { BaseNewsSource } from './base-source';
import type { NewsItem } from '@shared/types';

interface RektArticle {
  title: string;
  url: string;
  excerpt: string;
  date?: string;
  amountLost?: number;
}

export class RektNewsSource extends BaseNewsSource {
  private readonly BASE_URL = 'https://rekt.news';

  async fetch(): Promise<Omit<NewsItem, 'id' | 'createdAt' | 'fetchedAt'>[]> {
    try {
      const response = await axios.get(this.BASE_URL, {
        timeout: 30000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      const $ = cheerio.load(response.data);
      const articles: RektArticle[] = [];

      // Parse article cards from the main page
      // Note: Selectors may need adjustment based on actual site structure
      $('article, .post, .article-card, [class*="post"]').each((_, element) => {
        const $el = $(element);

        // Try various selectors for title
        const title =
          $el.find('h2, h3, .title, .post-title').first().text().trim() ||
          $el.find('a').first().text().trim();

        // Try various selectors for link
        let link = $el.find('a').first().attr('href') || '';
        if (link && !link.startsWith('http')) {
          link = `${this.BASE_URL}${link.startsWith('/') ? '' : '/'}${link}`;
        }

        // Try various selectors for excerpt/content
        const excerpt =
          $el.find('.excerpt, .summary, .description, p').first().text().trim() || '';

        // Try to extract amount from title or excerpt
        const amountLost = this.extractAmount(title + ' ' + excerpt);

        if (title && link && title.length > 5) {
          articles.push({
            title,
            url: link,
            excerpt,
            amountLost,
          });
        }
      });

      // Alternative: Try parsing from leaderboard if main parsing fails
      if (articles.length === 0) {
        await this.fetchFromLeaderboard(articles);
      }

      return articles.slice(0, 20).map((article) => this.transformArticle(article));
    } catch (error) {
      console.error('Failed to fetch from Rekt News:', error);
      throw error;
    }
  }

  private async fetchFromLeaderboard(articles: RektArticle[]): Promise<void> {
    try {
      const response = await axios.get(`${this.BASE_URL}/leaderboard`, {
        timeout: 30000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const $ = cheerio.load(response.data);

      // Parse leaderboard table
      $('table tr, .leaderboard-item').each((_, element) => {
        const $el = $(element);
        const cells = $el.find('td');

        if (cells.length >= 2) {
          const name = cells.eq(0).text().trim() || cells.eq(1).text().trim();
          const amountText = cells.eq(1).text().trim() || cells.eq(2).text().trim();
          const link = $el.find('a').attr('href');

          if (name && amountText) {
            const amountLost = this.extractAmount(amountText);
            articles.push({
              title: `${name} - ${amountText}`,
              url: link ? `${this.BASE_URL}${link}` : this.BASE_URL,
              excerpt: `Rekt Leaderboard: ${name} lost ${amountText}`,
              amountLost,
            });
          }
        }
      });
    } catch (error) {
      console.error('Failed to fetch from Rekt News leaderboard:', error);
    }
  }

  private transformArticle(
    article: RektArticle
  ): Omit<NewsItem, 'id' | 'createdAt' | 'fetchedAt'> {
    // Create a unique ID from URL
    const externalId = `rekt_${Buffer.from(article.url).toString('base64').slice(0, 32)}`;

    return this.createNewsItem({
      externalId,
      title: article.title,
      content: article.excerpt,
      url: article.url,
      amountLost: article.amountLost,
      classification: 'Security Incident',
      publishedAt: article.date ? new Date(article.date).getTime() / 1000 : undefined,
    });
  }

  private extractAmount(text: string): number | undefined {
    // Match patterns like "$100M", "$1.5B", "$500K", "$1,000,000"
    const patterns = [
      /\$(\d+(?:\.\d+)?)\s*[Bb](?:illion)?/i,
      /\$(\d+(?:\.\d+)?)\s*[Mm](?:illion)?/i,
      /\$(\d+(?:\.\d+)?)\s*[Kk]/i,
      /\$(\d{1,3}(?:,\d{3})+(?:\.\d+)?)/,
      /\$(\d+(?:\.\d+)?)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let amount = parseFloat(match[1].replace(/,/g, ''));

        // Check for multiplier
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
}
