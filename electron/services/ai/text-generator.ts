import OpenAI from 'openai';
import { settingsRepository, templateRepository } from '../../database/repositories';
import type { NewsItem, Template } from '@shared/types';

export class TextGenerator {
  private openai: OpenAI | null = null;

  private getClient(): OpenAI {
    const apiKey = settingsRepository.get('openaiApiKey');
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!this.openai) {
      this.openai = new OpenAI({ apiKey });
    }

    return this.openai;
  }

  async generateSummary(
    newsItem: NewsItem,
    templateId?: number
  ): Promise<string> {
    const client = this.getClient();

    // Get template
    let template: Template | null = null;
    if (templateId) {
      template = templateRepository.getById(templateId);
    }
    if (!template) {
      template = templateRepository.getDefault('summary');
    }
    if (!template) {
      throw new Error('No summary template found');
    }

    // Apply template variables
    const prompt = this.applyTemplate(template.content, newsItem);

    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content:
              'You are a Web3 security news analyst. Your job is to create engaging, informative X (Twitter) posts about security incidents. Keep responses concise and within Twitter character limits.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content generated');
      }

      return content.trim();
    } catch (error) {
      console.error('Failed to generate summary:', error);
      throw error;
    }
  }

  async generateSummaryWithCustomPrompt(
    newsItem: NewsItem,
    customPrompt: string
  ): Promise<string> {
    const client = this.getClient();
    const prompt = this.applyTemplate(customPrompt, newsItem);

    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content:
              'You are a Web3 security news analyst. Create engaging, informative content about security incidents.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content generated');
      }

      return content.trim();
    } catch (error) {
      console.error('Failed to generate summary:', error);
      throw error;
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const client = this.getClient();
      await client.models.list();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  resetClient(): void {
    this.openai = null;
  }

  private applyTemplate(template: string, newsItem: NewsItem): string {
    const replacements: Record<string, string> = {
      '{{name}}': newsItem.title || 'Unknown',
      '{{title}}': newsItem.title || 'Unknown',
      '{{amountLost}}': newsItem.amountLost
        ? this.formatAmount(newsItem.amountLost)
        : 'Unknown',
      '{{chain}}': newsItem.chain || 'Unknown',
      '{{classification}}': newsItem.classification || 'Security Incident',
      '{{technique}}': newsItem.technique || 'Unknown',
      '{{content}}': newsItem.content || '',
      '{{url}}': newsItem.url || '',
    };

    let result = template;
    for (const [key, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    }

    return result;
  }

  private formatAmount(amount: number): string {
    if (amount >= 1_000_000_000) {
      return `${(amount / 1_000_000_000).toFixed(2)}B`;
    }
    if (amount >= 1_000_000) {
      return `${(amount / 1_000_000).toFixed(2)}M`;
    }
    if (amount >= 1_000) {
      return `${(amount / 1_000).toFixed(2)}K`;
    }
    return amount.toFixed(2);
  }
}

export const textGenerator = new TextGenerator();
