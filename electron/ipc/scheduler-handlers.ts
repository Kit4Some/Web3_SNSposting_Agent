import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { schedulerService } from '../services/scheduler';

export function registerSchedulerHandlers(): void {
  // Get scheduler status
  ipcMain.handle(IPC_CHANNELS.SCHEDULER.GET_STATUS, async () => {
    try {
      const status = schedulerService.getStatus();
      return { success: true, data: status };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  // Start scheduler
  ipcMain.handle(IPC_CHANNELS.SCHEDULER.START, async () => {
    try {
      schedulerService.start();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  // Stop scheduler
  ipcMain.handle(IPC_CHANNELS.SCHEDULER.STOP, async () => {
    try {
      schedulerService.stop();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  // Trigger news collection manually
  ipcMain.handle(IPC_CHANNELS.SCHEDULER.TRIGGER_NEWS_COLLECTION, async () => {
    try {
      const result = await schedulerService.triggerNewsCollection();
      return { success: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  // Trigger posting manually
  ipcMain.handle(IPC_CHANNELS.SCHEDULER.TRIGGER_POSTING, async () => {
    try {
      const result = await schedulerService.triggerPosting();
      return { success: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });
}
