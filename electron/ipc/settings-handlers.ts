import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { settingsRepository } from '../database/repositories';
import { aiService } from '../services/ai';
import { twitterService } from '../services/twitter';
import { schedulerService } from '../services/scheduler';
import type { AppSettings } from '@shared/types';

export function registerSettingsHandlers(): void {
  // Get single setting
  ipcMain.handle(IPC_CHANNELS.SETTINGS.GET, async (_, key: string) => {
    try {
      const value = settingsRepository.get(key);
      return { success: true, data: value };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  // Set single setting
  ipcMain.handle(
    IPC_CHANNELS.SETTINGS.SET,
    async (_, { key, value }: { key: string; value: string }) => {
      try {
        settingsRepository.set(key, value);

        // Reset clients if API keys changed
        if (key === 'openaiApiKey' || key === 'anthropicApiKey') {
          aiService.resetClients();
        }
        if (key.startsWith('twitter')) {
          twitterService.resetClient();
        }
        // Restart scheduler if schedule settings changed
        if (
          key === 'postingInterval' ||
          key === 'postingTime' ||
          key === 'newsCollectionInterval'
        ) {
          schedulerService.restart();
        }

        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );

  // Get all settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS.GET_ALL, async () => {
    try {
      const settings = settingsRepository.getAll();
      // Mask sensitive values for display
      const maskedSettings = {
        ...settings,
        openaiApiKey: settings.openaiApiKey ? '••••••••' : undefined,
        anthropicApiKey: settings.anthropicApiKey ? '••••••••' : undefined,
        twitterApiKey: settings.twitterApiKey ? '••••••••' : undefined,
        twitterApiSecret: settings.twitterApiSecret ? '••••••••' : undefined,
        twitterAccessToken: settings.twitterAccessToken ? '••••••••' : undefined,
        twitterAccessTokenSecret: settings.twitterAccessTokenSecret
          ? '••••••••'
          : undefined,
        twitterClientId: settings.twitterClientId ? '••••••••' : undefined,
        twitterClientSecret: settings.twitterClientSecret ? '••••••••' : undefined,
      };
      return { success: true, data: maskedSettings };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  // Save all settings
  ipcMain.handle(
    IPC_CHANNELS.SETTINGS.SAVE_ALL,
    async (_, settings: Partial<AppSettings>) => {
      try {
        // Filter out masked values
        const filteredSettings: Partial<AppSettings> = {};
        for (const [key, value] of Object.entries(settings)) {
          if (value !== '••••••••' && value !== undefined) {
            (filteredSettings as any)[key] = value;
          }
        }

        settingsRepository.saveAll(filteredSettings);

        // Reset clients if API keys changed
        if (
          filteredSettings.openaiApiKey ||
          filteredSettings.anthropicApiKey
        ) {
          aiService.resetClients();
        }
        if (
          filteredSettings.twitterApiKey ||
          filteredSettings.twitterApiSecret ||
          filteredSettings.twitterAccessToken ||
          filteredSettings.twitterAccessTokenSecret ||
          filteredSettings.twitterAuthType ||
          filteredSettings.twitterClientId ||
          filteredSettings.twitterClientSecret
        ) {
          twitterService.resetClient();
        }
        // Restart scheduler if schedule settings changed
        if (
          filteredSettings.postingInterval ||
          filteredSettings.postingTime ||
          filteredSettings.newsCollectionInterval
        ) {
          schedulerService.restart();
        }

        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );
}
