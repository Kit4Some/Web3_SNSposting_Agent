import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { sourceRepository } from '../database/repositories';
import { newsService } from '../services/news';
import type { NewsSource } from '@shared/types';

export function registerSourceHandlers(): void {
  // Get all sources
  ipcMain.handle(IPC_CHANNELS.SOURCES.GET_ALL, async () => {
    try {
      const sources = sourceRepository.getAll();
      return { success: true, data: sources };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  // Add new source
  ipcMain.handle(
    IPC_CHANNELS.SOURCES.ADD,
    async (_, source: Omit<NewsSource, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const id = sourceRepository.insert(source);
        return { success: true, data: { id } };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );

  // Update source
  ipcMain.handle(
    IPC_CHANNELS.SOURCES.UPDATE,
    async (
      _,
      { id, source }: { id: number; source: Partial<NewsSource> }
    ) => {
      try {
        sourceRepository.update(id, source);
        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );

  // Delete source
  ipcMain.handle(IPC_CHANNELS.SOURCES.DELETE, async (_, id: number) => {
    try {
      sourceRepository.delete(id);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  // Toggle source enabled/disabled
  ipcMain.handle(IPC_CHANNELS.SOURCES.TOGGLE, async (_, id: number) => {
    try {
      const enabled = sourceRepository.toggleEnabled(id);
      return { success: true, data: { enabled } };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  // Fetch from specific source
  ipcMain.handle(
    IPC_CHANNELS.SOURCES.FETCH_FROM_SOURCE,
    async (_, id: number) => {
      try {
        const result = await newsService.fetchFromSource(id);
        return { success: result.success, data: result };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );
}
