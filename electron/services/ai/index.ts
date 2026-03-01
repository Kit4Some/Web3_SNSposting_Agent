import { textGenerator, TextGenerator } from './text-generator';
import { imageGenerator, ImageGenerator } from './image-generator';
import { newsRepository, postRepository } from '../../database/repositories';
import type { NewsItem, Post } from '@shared/types';

export class AIService {
  private textGen: TextGenerator;
  private imageGen: ImageGenerator;

  constructor() {
    this.textGen = textGenerator;
    this.imageGen = imageGenerator;
  }

  async generateSummary(newsItemId: number, templateId?: number): Promise<string> {
    const newsItem = newsRepository.getById(newsItemId);
    if (!newsItem) {
      throw new Error('News item not found');
    }

    const summary = await this.textGen.generateSummary(newsItem, templateId);

    // Save summary to news item
    newsRepository.updateSummary(newsItemId, summary);

    return summary;
  }

  async generateImage(
    newsItemId: number,
    templateId?: number
  ): Promise<{ imageUrl: string; prompt: string }> {
    const newsItem = newsRepository.getById(newsItemId);
    if (!newsItem) {
      throw new Error('News item not found');
    }

    return await this.imageGen.generateImage(newsItem, templateId);
  }

  async generateFullPost(
    newsItemId: number,
    options?: {
      summaryTemplateId?: number;
      imageTemplateId?: number;
      sessionId?: number;
    }
  ): Promise<Omit<Post, 'id' | 'createdAt' | 'updatedAt'>> {
    const newsItem = newsRepository.getById(newsItemId);
    if (!newsItem) {
      throw new Error('News item not found');
    }

    // Generate summary
    const content = await this.textGen.generateSummary(
      newsItem,
      options?.summaryTemplateId
    );

    // Generate image
    const { imageUrl, prompt } = await this.imageGen.generateImage(
      newsItem,
      options?.imageTemplateId
    );

    // Save summary to news item
    newsRepository.updateSummary(newsItemId, content);

    return {
      newsItemId,
      sessionId: options?.sessionId,
      content,
      imageUrl,
      imagePrompt: prompt,
      status: 'draft',
    };
  }

  async createPost(
    newsItemId: number,
    options?: {
      summaryTemplateId?: number;
      imageTemplateId?: number;
      scheduledFor?: number;
      sessionId?: number;
    }
  ): Promise<number> {
    const postData = await this.generateFullPost(newsItemId, options);

    if (options?.scheduledFor) {
      postData.status = 'scheduled';
      postData.scheduledFor = options.scheduledFor;
    }

    const postId = postRepository.insert(postData);

    // Mark news as processed
    newsRepository.markProcessed(newsItemId);

    return postId;
  }

  async regenerateSummary(postId: number, templateId?: number): Promise<string> {
    const post = postRepository.getById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    const newsItem = newsRepository.getById(post.newsItemId);
    if (!newsItem) {
      throw new Error('News item not found');
    }

    const content = await this.textGen.generateSummary(newsItem, templateId);

    postRepository.update(postId, { content });

    return content;
  }

  async regenerateImage(
    postId: number,
    templateId?: number
  ): Promise<{ imageUrl: string; prompt: string }> {
    const post = postRepository.getById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    const newsItem = newsRepository.getById(post.newsItemId);
    if (!newsItem) {
      throw new Error('News item not found');
    }

    const { imageUrl, prompt } = await this.imageGen.generateImage(
      newsItem,
      templateId
    );

    postRepository.update(postId, { imageUrl, imagePrompt: prompt });

    return { imageUrl, prompt };
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    return await this.textGen.testConnection();
  }

  resetClients(): void {
    this.textGen.resetClient();
    this.imageGen.resetClient();
  }

  cleanupOldImages(daysToKeep = 30): number {
    return this.imageGen.cleanupOldImages(daysToKeep);
  }
}

export const aiService = new AIService();
export { textGenerator, TextGenerator } from './text-generator';
export { imageGenerator, ImageGenerator } from './image-generator';
