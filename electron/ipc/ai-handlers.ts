import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { aiService } from '../services/ai';

export function registerAIHandlers(): void {
  // Generate summary for a news item
  ipcMain.handle(
    IPC_CHANNELS.AI.GENERATE_SUMMARY,
    async (_, params: { newsItemId: number; templateId?: number }) => {
      try {
        const summary = await aiService.generateSummary(
          params.newsItemId,
          params.templateId
        );
        return { success: true, data: { summary } };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );

  // Generate image for a news item
  ipcMain.handle(
    IPC_CHANNELS.AI.GENERATE_IMAGE,
    async (_, params: { newsItemId: number; templateId?: number }) => {
      try {
        const result = await aiService.generateImage(
          params.newsItemId,
          params.templateId
        );
        return { success: true, data: result };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );

  // Test AI connection
  ipcMain.handle(IPC_CHANNELS.AI.TEST_CONNECTION, async () => {
    try {
      const result = await aiService.testConnection();
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });
}
