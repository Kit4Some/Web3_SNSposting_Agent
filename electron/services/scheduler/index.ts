import * as schedule from 'node-schedule';
import { newsService } from '../news';
import { twitterService, TwitterService } from '../twitter';
import { aiService } from '../ai';
import {
  settingsRepository,
  postRepository,
  newsRepository,
} from '../../database/repositories';
import { sessionRepository } from '../../database/repositories/session-repository';
import { logger } from '../../utils/logger';

export interface SchedulerStatus {
  newsCollectionEnabled: boolean;
  postingEnabled: boolean;
  nextNewsCollection?: Date;
  nextPosting?: Date;
  lastNewsCollection?: Date;
  lastPosting?: Date;
}

export class SchedulerService {
  private newsCollectionJob: schedule.Job | null = null;
  private postingJob: schedule.Job | null = null;
  private lastNewsCollection: Date | null = null;
  private lastPosting: Date | null = null;

  start(): void {
    this.scheduleNewsCollection();
    this.schedulePosting();
    console.log('Scheduler started');
  }

  stop(): void {
    if (this.newsCollectionJob) {
      this.newsCollectionJob.cancel();
      this.newsCollectionJob = null;
    }
    if (this.postingJob) {
      this.postingJob.cancel();
      this.postingJob = null;
    }
    console.log('Scheduler stopped');
  }

  restart(): void {
    this.stop();
    this.start();
  }

  getStatus(): SchedulerStatus {
    return {
      newsCollectionEnabled: this.newsCollectionJob !== null,
      postingEnabled: this.postingJob !== null,
      nextNewsCollection: this.newsCollectionJob?.nextInvocation() ?? undefined,
      nextPosting: this.postingJob?.nextInvocation() ?? undefined,
      lastNewsCollection: this.lastNewsCollection ?? undefined,
      lastPosting: this.lastPosting ?? undefined,
    };
  }

  private scheduleNewsCollection(): void {
    const interval = parseInt(settingsRepository.get('newsCollectionInterval') || '6', 10);

    // Run every X hours
    const rule = new schedule.RecurrenceRule();
    rule.minute = 0; // At the top of the hour

    // Create hours array for the interval
    const hours: number[] = [];
    for (let i = 0; i < 24; i += interval) {
      hours.push(i);
    }
    rule.hour = hours;

    this.newsCollectionJob = schedule.scheduleJob(rule, async () => {
      console.log('Running scheduled news collection...');
      await this.runNewsCollection();
    });

    console.log(
      `News collection scheduled every ${interval} hours at:`,
      hours.map((h) => `${h}:00`).join(', ')
    );
  }

  private schedulePosting(): void {
    const intervalDays = parseInt(
      settingsRepository.get('postingInterval') || '3',
      10
    );
    const postingTime = settingsRepository.get('postingTime') || '10:00';
    const [hours, minutes] = postingTime.split(':').map(Number);

    // Schedule based on interval
    // For simplicity, we'll check daily and post if enough time has passed
    const rule = new schedule.RecurrenceRule();
    rule.hour = hours;
    rule.minute = minutes;

    this.postingJob = schedule.scheduleJob(rule, async () => {
      console.log('Checking if posting is due...');
      await this.checkAndPost(intervalDays);
    });

    console.log(
      `Posting scheduled to check daily at ${postingTime}, posting every ${intervalDays} days`
    );
  }

  private async checkAndPost(intervalDays: number): Promise<void> {
    // First, check sessions for session-specific posting
    const enabledSessions = sessionRepository.getEnabled();

    for (const session of enabledSessions) {
      if (!sessionRepository.hasTwitterCredentials(session.id)) {
        logger.debug(`Session ${session.name} has no Twitter credentials, skipping`);
        continue;
      }

      // Check if session has pending posts
      const sessionPost = postRepository.getNextScheduledBySessionId(session.id);
      if (sessionPost) {
        logger.info(`Publishing post for session: ${session.name}`);
        await this.publishSessionPost(session.id, sessionPost.id);
        continue;
      }
    }

    // Also handle posts without session (using global credentials)
    const lastPostedAt = postRepository.getLastPostedDate();
    const now = Math.floor(Date.now() / 1000);
    const intervalSeconds = intervalDays * 24 * 60 * 60;

    // Check if enough time has passed since last post
    if (lastPostedAt && now - lastPostedAt < intervalSeconds) {
      logger.debug('Not enough time has passed since last post, skipping global posting');
      return;
    }

    // Check if there are scheduled posts (without session)
    const scheduledPost = postRepository.getNextScheduled();
    if (scheduledPost && !scheduledPost.sessionId) {
      await this.runPosting();
      return;
    }

    // If no scheduled posts, try to create one from unprocessed news
    const unprocessedNews = newsRepository.getUnprocessed(1);
    if (unprocessedNews.length > 0) {
      const newsItem = unprocessedNews[0];
      logger.info(`Creating post for news: ${newsItem.title}`);

      try {
        // Create post with AI content
        const postId = await aiService.createPost(newsItem.id, {
          scheduledFor: now,
        });

        logger.info(`Created post ${postId}, publishing...`);
        await twitterService.publishPost(postId);
        this.lastPosting = new Date();
      } catch (error) {
        logger.error('Failed to create and publish post:', error);
      }
    } else {
      logger.debug('No unprocessed news available for posting');
    }
  }

  private async publishSessionPost(sessionId: number, postId: number): Promise<void> {
    const creds = sessionRepository.getTwitterCredentials(sessionId);
    if (!creds || !creds.apiKey || !creds.apiSecret || !creds.accessToken || !creds.accessTokenSecret) {
      logger.error(`Session ${sessionId} missing Twitter credentials`);
      return;
    }

    const sessionTwitter = new TwitterService();
    sessionTwitter.configure({
      apiKey: creds.apiKey,
      apiSecret: creds.apiSecret,
      accessToken: creds.accessToken,
      accessTokenSecret: creds.accessTokenSecret,
    });

    try {
      await sessionTwitter.publishPost(postId);
      this.lastPosting = new Date();
      logger.info(`Successfully published post ${postId} for session ${sessionId}`);
    } catch (error) {
      logger.error(`Failed to publish post for session ${sessionId}:`, error);
    }
  }

  async runNewsCollection(): Promise<{
    totalNewItems: number;
    results: Array<{
      sourceId: number;
      sourceName: string;
      success: boolean;
      newItems: number;
      error?: string;
    }>;
  }> {
    try {
      const result = await newsService.fetchFromAllSources();
      this.lastNewsCollection = new Date();
      console.log(`News collection completed. New items: ${result.totalNewItems}`);
      return result;
    } catch (error) {
      console.error('News collection failed:', error);
      throw error;
    }
  }

  async runPosting(): Promise<{
    published: boolean;
    postId?: number;
    tweetId?: string;
    error?: string;
  }> {
    if (!twitterService.hasCredentials()) {
      return { published: false, error: 'Twitter credentials not configured' };
    }

    try {
      const result = await twitterService.publishNextScheduled();
      if (result.published) {
        this.lastPosting = new Date();
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Posting failed:', error);
      return { published: false, error: errorMessage };
    }
  }

  async triggerNewsCollection(): Promise<{
    totalNewItems: number;
    results: Array<{
      sourceId: number;
      sourceName: string;
      success: boolean;
      newItems: number;
      error?: string;
    }>;
  }> {
    return await this.runNewsCollection();
  }

  async triggerPosting(): Promise<{
    published: boolean;
    postId?: number;
    tweetId?: string;
    error?: string;
  }> {
    return await this.runPosting();
  }
}

export const schedulerService = new SchedulerService();
