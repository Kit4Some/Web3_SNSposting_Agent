import axios from 'axios';
import { BaseNewsSource } from './base-source';
import type { NewsItem, DefiLlamaHack } from '@shared/types';

export class DefiLlamaSource extends BaseNewsSource {
  private readonly API_URL = 'https://api.llama.fi/hacks';

  async fetch(): Promise<Omit<NewsItem, 'id' | 'createdAt' | 'fetchedAt'>[]> {
    try {
      const response = await axios.get<DefiLlamaHack[]>(this.API_URL, {
        timeout: 30000,
      });

      const hacks = response.data;

      // Filter to recent hacks (last 30 days)
      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
      const recentHacks = hacks.filter((hack) => hack.date > thirtyDaysAgo);

      // Sort by date descending
      recentHacks.sort((a, b) => b.date - a.date);

      return recentHacks.map((hack) => this.transformHack(hack));
    } catch (error) {
      console.error('Failed to fetch from DeFiLlama:', error);
      throw error;
    }
  }

  private transformHack(
    hack: DefiLlamaHack
  ): Omit<NewsItem, 'id' | 'createdAt' | 'fetchedAt'> {
    const chains = Array.isArray(hack.chain) ? hack.chain.join(', ') : hack.chain;
    const externalId = `defillama_${hack.name}_${hack.date}`;

    // Create detailed content
    const content = this.buildContent(hack);

    return this.createNewsItem({
      externalId,
      title: `${hack.name} - ${this.formatAmount(hack.amount)} Lost`,
      content,
      url: hack.source || undefined,
      amountLost: hack.amount || undefined,
      chain: chains,
      classification: hack.classification,
      technique: hack.technique,
      publishedAt: hack.date,
    });
  }

  private buildContent(hack: DefiLlamaHack): string {
    const parts: string[] = [];

    parts.push(`Protocol: ${hack.name}`);
    parts.push(`Amount Lost: ${this.formatAmount(hack.amount)}`);

    if (hack.chain && hack.chain.length > 0) {
      const chains = Array.isArray(hack.chain) ? hack.chain.join(', ') : hack.chain;
      parts.push(`Chain(s): ${chains}`);
    }

    if (hack.classification) {
      parts.push(`Classification: ${hack.classification}`);
    }

    if (hack.technique) {
      parts.push(`Attack Technique: ${hack.technique}`);
    }

    if (hack.targetType) {
      parts.push(`Target Type: ${hack.targetType}`);
    }

    if (hack.bridgeHack) {
      parts.push('Note: This was a bridge exploit');
    }

    if (hack.returnedFunds && hack.returnedFunds > 0) {
      parts.push(`Returned Funds: ${this.formatAmount(hack.returnedFunds)}`);
    }

    return parts.join('\n');
  }
}
