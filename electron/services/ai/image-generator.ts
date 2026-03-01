import OpenAI from 'openai';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { settingsRepository, templateRepository } from '../../database/repositories';
import type { NewsItem, Template } from '@shared/types';

export class ImageGenerator {
  private openai: OpenAI | null = null;
  private _imagesDir: string | null = null;

  private get imagesDir(): string {
    if (!this._imagesDir) {
      this._imagesDir = path.join(app.getPath('userData'), 'generated-images');
      this.ensureImagesDir();
    }
    return this._imagesDir;
  }

  private ensureImagesDir(): void {
    if (this._imagesDir && !fs.existsSync(this._imagesDir)) {
      fs.mkdirSync(this._imagesDir, { recursive: true });
    }
  }

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

  async generateImage(
    newsItem: NewsItem,
    templateId?: number
  ): Promise<{ imageUrl: string; prompt: string }> {
    const client = this.getClient();

    // Get template
    let template: Template | null = null;
    if (templateId) {
      template = templateRepository.getById(templateId);
    }
    if (!template) {
      template = templateRepository.getDefault('image');
    }
    if (!template) {
      throw new Error('No image template found');
    }

    // Apply template variables
    const prompt = this.applyTemplate(template.content, newsItem);

    try {
      const response = await client.images.generate({
        model: 'dall-e-3',
        prompt,
        size: '1024x1024',
        quality: 'standard',
        style: 'vivid',
        n: 1,
      });

      const imageUrl = response.data[0]?.url;
      if (!imageUrl) {
        throw new Error('No image URL returned');
      }

      // Download and save locally
      const localPath = await this.downloadImage(imageUrl);

      return { imageUrl: localPath, prompt };
    } catch (error) {
      console.error('Failed to generate image:', error);
      throw error;
    }
  }

  async generateImageWithCustomPrompt(
    customPrompt: string
  ): Promise<{ imageUrl: string; prompt: string }> {
    const client = this.getClient();

    try {
      const response = await client.images.generate({
        model: 'dall-e-3',
        prompt: customPrompt,
        size: '1024x1024',
        quality: 'standard',
        style: 'vivid',
        n: 1,
      });

      const imageUrl = response.data[0]?.url;
      if (!imageUrl) {
        throw new Error('No image URL returned');
      }

      // Download and save locally
      const localPath = await this.downloadImage(imageUrl);

      return { imageUrl: localPath, prompt: customPrompt };
    } catch (error) {
      console.error('Failed to generate image:', error);
      throw error;
    }
  }

  private async downloadImage(url: string): Promise<string> {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 60000,
    });

    const filename = `image_${Date.now()}.png`;
    const filepath = path.join(this.imagesDir, filename);

    fs.writeFileSync(filepath, Buffer.from(response.data));

    return filepath;
  }

  resetClient(): void {
    this.openai = null;
  }

  private applyTemplate(
    template: string,
    newsItem: NewsItem
  ): string {
    const replacements: Record<string, string> = {
      '{{name}}': newsItem.title || 'security incident',
      '{{title}}': newsItem.title || 'security incident',
      '{{chain}}': newsItem.chain || 'blockchain',
      '{{classification}}': newsItem.classification || 'security incident',
      '{{technique}}': newsItem.technique || 'exploit',
    };

    let result = template;
    for (const [key, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    }

    return result;
  }

  getImagesDirectory(): string {
    return this.imagesDir;
  }

  cleanupOldImages(daysToKeep = 30): number {
    const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    try {
      const files = fs.readdirSync(this.imagesDir);
      for (const file of files) {
        const filepath = path.join(this.imagesDir, file);
        const stats = fs.statSync(filepath);

        if (stats.mtimeMs < cutoff) {
          fs.unlinkSync(filepath);
          deletedCount++;
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old images:', error);
    }

    return deletedCount;
  }
}

export const imageGenerator = new ImageGenerator();
