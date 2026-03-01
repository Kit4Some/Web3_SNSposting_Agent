import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { sessionRepository } from '../database/repositories/session-repository';
import { sourceRepository } from '../database/repositories/source-repository';
import { TwitterService } from '../services/twitter';
import { Session } from '../../shared/types';
import { logger } from '../utils/logger';

export function registerSessionHandlers(): void {
  // Get all sessions
  ipcMain.handle(IPC_CHANNELS.SESSIONS.GET_ALL, async () => {
    try {
      const sessions = sessionRepository.getAll();
      return { success: true, data: sessions };
    } catch (error) {
      logger.error('Failed to get sessions', error);
      return { success: false, error: String(error) };
    }
  });

  // Get all sessions with stats
  ipcMain.handle(IPC_CHANNELS.SESSIONS.GET_ALL_WITH_STATS, async () => {
    try {
      const sessions = sessionRepository.getAllWithStats();
      return { success: true, data: sessions };
    } catch (error) {
      logger.error('Failed to get sessions with stats', error);
      return { success: false, error: String(error) };
    }
  });

  // Get session by ID
  ipcMain.handle(IPC_CHANNELS.SESSIONS.GET_BY_ID, async (_event, id: number) => {
    try {
      const session = sessionRepository.getById(id);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }
      return { success: true, data: session };
    } catch (error) {
      logger.error('Failed to get session', error);
      return { success: false, error: String(error) };
    }
  });

  // Create session
  ipcMain.handle(
    IPC_CHANNELS.SESSIONS.CREATE,
    async (_event, sessionData: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const session = sessionRepository.create(sessionData);
        logger.info('Session created', { id: session.id, name: session.name });
        return { success: true, data: session };
      } catch (error) {
        logger.error('Failed to create session', error);
        return { success: false, error: String(error) };
      }
    }
  );

  // Update session
  ipcMain.handle(
    IPC_CHANNELS.SESSIONS.UPDATE,
    async (_event, id: number, sessionData: Partial<Session>) => {
      try {
        const session = sessionRepository.update(id, sessionData);
        if (!session) {
          return { success: false, error: 'Session not found' };
        }
        logger.info('Session updated', { id: session.id, name: session.name });
        return { success: true, data: session };
      } catch (error) {
        logger.error('Failed to update session', error);
        return { success: false, error: String(error) };
      }
    }
  );

  // Delete session
  ipcMain.handle(IPC_CHANNELS.SESSIONS.DELETE, async (_event, id: number) => {
    try {
      const deleted = sessionRepository.delete(id);
      if (!deleted) {
        return { success: false, error: 'Session not found' };
      }
      logger.info('Session deleted', { id });
      return { success: true };
    } catch (error) {
      logger.error('Failed to delete session', error);
      return { success: false, error: String(error) };
    }
  });

  // Toggle session enabled status
  ipcMain.handle(IPC_CHANNELS.SESSIONS.TOGGLE, async (_event, id: number) => {
    try {
      const session = sessionRepository.toggle(id);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }
      logger.info('Session toggled', { id, enabled: session.enabled });
      return { success: true, data: session };
    } catch (error) {
      logger.error('Failed to toggle session', error);
      return { success: false, error: String(error) };
    }
  });

  // Test Twitter connection for a session
  ipcMain.handle(IPC_CHANNELS.SESSIONS.TEST_TWITTER, async (_event, id: number) => {
    try {
      const creds = sessionRepository.getTwitterCredentials(id);
      if (!creds || !creds.apiKey || !creds.apiSecret || !creds.accessToken || !creds.accessTokenSecret) {
        return { success: false, error: 'Twitter credentials not configured for this session' };
      }

      const twitterService = new TwitterService();
      twitterService.configure({
        apiKey: creds.apiKey,
        apiSecret: creds.apiSecret,
        accessToken: creds.accessToken,
        accessTokenSecret: creds.accessTokenSecret,
      });

      const user = await twitterService.verifyCredentials();
      logger.info('Twitter connection verified for session', { sessionId: id, username: user.username });
      return { success: true, data: user };
    } catch (error) {
      logger.error('Failed to test Twitter connection for session', error);
      return { success: false, error: String(error) };
    }
  });

  // Assign source to session
  ipcMain.handle(
    IPC_CHANNELS.SESSIONS.ASSIGN_SOURCE,
    async (_event, sourceId: number, sessionId: number | null) => {
      try {
        sourceRepository.assignToSession(sourceId, sessionId);
        logger.info('Source assigned to session', { sourceId, sessionId });
        return { success: true };
      } catch (error) {
        logger.error('Failed to assign source to session', error);
        return { success: false, error: String(error) };
      }
    }
  );
}
