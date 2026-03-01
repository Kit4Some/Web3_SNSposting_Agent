import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { templateRepository } from '../database/repositories';
import type { Template, TemplateType } from '@shared/types';

export function registerTemplateHandlers(): void {
  // Get all templates
  ipcMain.handle(IPC_CHANNELS.TEMPLATES.GET_ALL, async () => {
    try {
      const templates = templateRepository.getAll();
      return { success: true, data: templates };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  // Get templates by type
  ipcMain.handle(
    IPC_CHANNELS.TEMPLATES.GET_BY_TYPE,
    async (_, type: TemplateType) => {
      try {
        const templates = templateRepository.getByType(type);
        return { success: true, data: templates };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );

  // Add new template
  ipcMain.handle(
    IPC_CHANNELS.TEMPLATES.ADD,
    async (_, template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const id = templateRepository.insert(template);
        const created = templateRepository.getById(id);
        return { success: true, data: created };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );

  // Update template
  ipcMain.handle(
    IPC_CHANNELS.TEMPLATES.UPDATE,
    async (_, { id, template }: { id: number; template: Partial<Template> }) => {
      try {
        templateRepository.update(id, template);
        const updated = templateRepository.getById(id);
        return { success: true, data: updated };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );

  // Delete template
  ipcMain.handle(IPC_CHANNELS.TEMPLATES.DELETE, async (_, id: number) => {
    try {
      templateRepository.delete(id);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  // Set template as default
  ipcMain.handle(IPC_CHANNELS.TEMPLATES.SET_DEFAULT, async (_, id: number) => {
    try {
      templateRepository.setDefault(id);
      const updated = templateRepository.getById(id);
      return { success: true, data: updated };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });
}
