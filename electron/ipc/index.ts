import { BrowserWindow } from 'electron';
import { registerNewsHandlers } from './news-handlers';
import { registerSourceHandlers } from './source-handlers';
import { registerPostHandlers } from './post-handlers';
import { registerAIHandlers } from './ai-handlers';
import { registerTemplateHandlers } from './template-handlers';
import { registerSettingsHandlers } from './settings-handlers';
import { registerSchedulerHandlers } from './scheduler-handlers';
import { registerTwitterHandlers } from './twitter-handlers';
import { registerAppHandlers } from './app-handlers';
import { registerSessionHandlers } from './session-handlers';

export function registerAllHandlers(mainWindow: BrowserWindow): void {
  registerNewsHandlers();
  registerSourceHandlers();
  registerPostHandlers();
  registerAIHandlers();
  registerTemplateHandlers();
  registerSettingsHandlers();
  registerSchedulerHandlers();
  registerTwitterHandlers();
  registerAppHandlers(mainWindow);
  registerSessionHandlers();

  console.log('All IPC handlers registered');
}
