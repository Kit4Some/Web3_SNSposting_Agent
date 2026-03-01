import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { postRepository } from '../database/repositories';
import { twitterService, TwitterService } from '../services/twitter';
import { aiService } from '../services/ai';
import { sessionRepository } from '../database/repositories/session-repository';
import type { Post } from '@shared/types';

export function registerPostHandlers(): void {
  // Get post queue (draft + scheduled)
  ipcMain.handle(IPC_CHANNELS.POSTS.GET_QUEUE, async () => {
    try {
      const posts = postRepository.getQueue();
      return { success: true, data: posts };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  // Get post history (posted + failed)
  ipcMain.handle(
    IPC_CHANNELS.POSTS.GET_HISTORY,
    async (_, limit?: number) => {
      try {
        const posts = postRepository.getHistory(limit);
        return { success: true, data: posts };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );

  // Create new post from news item
  ipcMain.handle(
    IPC_CHANNELS.POSTS.CREATE,
    async (
      _,
      params: {
        newsItemId: number;
        summaryTemplateId?: number;
        imageTemplateId?: number;
        scheduledFor?: number;
        sessionId?: number;
      }
    ) => {
      try {
        const postId = await aiService.createPost(params.newsItemId, {
          summaryTemplateId: params.summaryTemplateId,
          imageTemplateId: params.imageTemplateId,
          scheduledFor: params.scheduledFor,
          sessionId: params.sessionId,
        });
        const post = postRepository.getById(postId);
        return { success: true, data: post };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );

  // Update post
  ipcMain.handle(
    IPC_CHANNELS.POSTS.UPDATE,
    async (_, { id, post }: { id: number; post: Partial<Post> }) => {
      try {
        postRepository.update(id, post);
        const updated = postRepository.getById(id);
        return { success: true, data: updated };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );

  // Delete post
  ipcMain.handle(IPC_CHANNELS.POSTS.DELETE, async (_, id: number) => {
    try {
      postRepository.delete(id);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  // Schedule post
  ipcMain.handle(
    IPC_CHANNELS.POSTS.SCHEDULE,
    async (_, { id, scheduledFor }: { id: number; scheduledFor: number }) => {
      try {
        postRepository.schedule(id, scheduledFor);
        const updated = postRepository.getById(id);
        return { success: true, data: updated };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );

  // Publish scheduled post
  ipcMain.handle(IPC_CHANNELS.POSTS.PUBLISH, async (_, id: number) => {
    try {
      const tweetId = await twitterService.publishPost(id);
      const updated = postRepository.getById(id);
      return { success: true, data: { tweetId, post: updated } };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  // Publish now (bypass schedule)
  ipcMain.handle(IPC_CHANNELS.POSTS.PUBLISH_NOW, async (_, id: number) => {
    try {
      const post = postRepository.getById(id);
      if (!post) {
        return { success: false, error: 'Post not found' };
      }

      let tweetId: string;

      // If post has a session, use session's Twitter credentials
      if (post.sessionId) {
        const creds = sessionRepository.getTwitterCredentials(post.sessionId);
        if (!creds || !creds.apiKey || !creds.apiSecret || !creds.accessToken || !creds.accessTokenSecret) {
          return { success: false, error: 'Session Twitter credentials not configured' };
        }

        const sessionTwitter = new TwitterService();
        sessionTwitter.configure({
          apiKey: creds.apiKey,
          apiSecret: creds.apiSecret,
          accessToken: creds.accessToken,
          accessTokenSecret: creds.accessTokenSecret,
        });
        tweetId = await sessionTwitter.publishPost(id);
      } else {
        // Use global Twitter credentials
        tweetId = await twitterService.publishPost(id);
      }

      const updated = postRepository.getById(id);
      return { success: true, data: { tweetId, post: updated } };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });
}
