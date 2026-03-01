import { ipcMain, app, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { newsRepository, postRepository } from '../database/repositories';

export function registerAppHandlers(mainWindow: BrowserWindow): void {
  // Get dashboard stats
  ipcMain.handle(IPC_CHANNELS.APP.GET_DASHBOARD_STATS, async () => {
    try {
      const totalNews = newsRepository.getCount();
      const unprocessedNews = newsRepository.getUnprocessedCount();
      const scheduledPosts = postRepository.getScheduledCount();
      const postedCount = postRepository.getPostedCount();
      const lastPostDate = postRepository.getLastPostedDate();

      // Get next scheduled post
      const scheduledPost = postRepository.getScheduled();
      const nextScheduledPost =
        scheduledPost.length > 0 ? scheduledPost[0].scheduledFor : undefined;

      return {
        success: true,
        data: {
          totalNews,
          unprocessedNews,
          scheduledPosts,
          postedCount,
          lastPostDate,
          nextScheduledPost,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  // Minimize to tray
  ipcMain.handle(IPC_CHANNELS.APP.MINIMIZE_TO_TRAY, async () => {
    try {
      mainWindow.hide();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  // Quit app
  ipcMain.handle(IPC_CHANNELS.APP.QUIT, async () => {
    try {
      app.quit();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });
}
