import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { twitterService } from '../services/twitter';

export function registerTwitterHandlers(): void {
  // Test Twitter connection
  ipcMain.handle(IPC_CHANNELS.TWITTER.TEST_CONNECTION, async () => {
    try {
      const result = await twitterService.testConnection();
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  // Get Twitter user info
  ipcMain.handle(IPC_CHANNELS.TWITTER.GET_USER_INFO, async () => {
    try {
      const user = await twitterService.getUserInfo();
      if (!user) {
        return { success: false, error: 'Failed to get user info' };
      }
      return { success: true, data: user };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  // Start OAuth 2.0 PKCE authorization flow
  ipcMain.handle(IPC_CHANNELS.TWITTER.START_OAUTH2, async () => {
    try {
      const result = await twitterService.startOAuth2Flow();
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  // Revoke OAuth 2.0 authorization
  ipcMain.handle(IPC_CHANNELS.TWITTER.REVOKE_OAUTH2, async () => {
    try {
      twitterService.revokeOAuth2();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  // Check if OAuth 2.0 is authorized
  ipcMain.handle(IPC_CHANNELS.TWITTER.IS_OAUTH2_AUTHORIZED, async () => {
    try {
      const isAuthorized = twitterService.isOAuth2Authorized();
      return { success: true, data: isAuthorized };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  // Refresh OAuth 2.0 token
  ipcMain.handle(IPC_CHANNELS.TWITTER.REFRESH_OAUTH2_TOKEN, async () => {
    try {
      const success = await twitterService.refreshOAuth2Token();
      return { success };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });
}
