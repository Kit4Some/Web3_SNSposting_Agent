import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { newsService } from '../services/news';
import { newsRepository } from '../database/repositories';

export function registerNewsHandlers(): void {
  // Fetch news from all enabled sources
  ipcMain.handle(IPC_CHANNELS.NEWS.FETCH_ALL, async () => {
    try {
      const result = await newsService.fetchFromAllSources();
      return { success: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  // Get news list
  ipcMain.handle(
    IPC_CHANNELS.NEWS.GET_LIST,
    async (
      _,
      params: { limit?: number; offset?: number; unprocessedOnly?: boolean }
    ) => {
      try {
        const items = newsService.getNewsList(params);
        return { success: true, data: items };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );

  // Get single news item
  ipcMain.handle(IPC_CHANNELS.NEWS.GET_ITEM, async (_, id: number) => {
    try {
      const item = newsService.getNewsItem(id);
      if (!item) {
        return { success: false, error: 'News item not found' };
      }
      return { success: true, data: item };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  // Mark news as processed
  ipcMain.handle(IPC_CHANNELS.NEWS.MARK_PROCESSED, async (_, id: number) => {
    try {
      newsService.markAsProcessed(id);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  // Delete news item
  ipcMain.handle(IPC_CHANNELS.NEWS.DELETE, async (_, id: number) => {
    try {
      newsService.deleteNews(id);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });
}
