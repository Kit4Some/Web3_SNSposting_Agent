import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';

// Type-safe API exposure
const api = {
  // News API
  news: {
    fetchAll: () => ipcRenderer.invoke(IPC_CHANNELS.NEWS.FETCH_ALL),
    getList: (params?: { limit?: number; offset?: number; unprocessedOnly?: boolean }) =>
      ipcRenderer.invoke(IPC_CHANNELS.NEWS.GET_LIST, params),
    getItem: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.NEWS.GET_ITEM, id),
    markProcessed: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.NEWS.MARK_PROCESSED, id),
    delete: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.NEWS.DELETE, id),
  },

  // Sources API
  sources: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.SOURCES.GET_ALL),
    add: (source: any) => ipcRenderer.invoke(IPC_CHANNELS.SOURCES.ADD, source),
    update: (id: number, source: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.SOURCES.UPDATE, { id, source }),
    delete: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.SOURCES.DELETE, id),
    toggle: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.SOURCES.TOGGLE, id),
    fetchFromSource: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.SOURCES.FETCH_FROM_SOURCE, id),
  },

  // Posts API
  posts: {
    getQueue: () => ipcRenderer.invoke(IPC_CHANNELS.POSTS.GET_QUEUE),
    getHistory: (limit?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.POSTS.GET_HISTORY, limit),
    create: (params: {
      newsItemId: number;
      summaryTemplateId?: number;
      imageTemplateId?: number;
      scheduledFor?: number;
    }) => ipcRenderer.invoke(IPC_CHANNELS.POSTS.CREATE, params),
    update: (id: number, post: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.POSTS.UPDATE, { id, post }),
    delete: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.POSTS.DELETE, id),
    schedule: (id: number, scheduledFor: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.POSTS.SCHEDULE, { id, scheduledFor }),
    publish: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.POSTS.PUBLISH, id),
    publishNow: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.POSTS.PUBLISH_NOW, id),
  },

  // AI API
  ai: {
    generateSummary: (newsItemId: number, templateId?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.AI.GENERATE_SUMMARY, {
        newsItemId,
        templateId,
      }),
    generateImage: (newsItemId: number, templateId?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.AI.GENERATE_IMAGE, {
        newsItemId,
        templateId,
      }),
    testConnection: () => ipcRenderer.invoke(IPC_CHANNELS.AI.TEST_CONNECTION),
  },

  // Templates API
  templates: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.TEMPLATES.GET_ALL),
    getByType: (type: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEMPLATES.GET_BY_TYPE, type),
    add: (template: any) => ipcRenderer.invoke(IPC_CHANNELS.TEMPLATES.ADD, template),
    update: (id: number, template: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEMPLATES.UPDATE, { id, template }),
    delete: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.TEMPLATES.DELETE, id),
    setDefault: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEMPLATES.SET_DEFAULT, id),
  },

  // Settings API
  settings: {
    get: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.GET, key),
    set: (key: string, value: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.SET, { key, value }),
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.GET_ALL),
    saveAll: (settings: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.SAVE_ALL, settings),
  },

  // Scheduler API
  scheduler: {
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.SCHEDULER.GET_STATUS),
    start: () => ipcRenderer.invoke(IPC_CHANNELS.SCHEDULER.START),
    stop: () => ipcRenderer.invoke(IPC_CHANNELS.SCHEDULER.STOP),
    triggerNewsCollection: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SCHEDULER.TRIGGER_NEWS_COLLECTION),
    triggerPosting: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SCHEDULER.TRIGGER_POSTING),
  },

  // Twitter API
  twitter: {
    testConnection: () => ipcRenderer.invoke(IPC_CHANNELS.TWITTER.TEST_CONNECTION),
    getUserInfo: () => ipcRenderer.invoke(IPC_CHANNELS.TWITTER.GET_USER_INFO),
    // OAuth 2.0 PKCE flow
    startOAuth2: () => ipcRenderer.invoke(IPC_CHANNELS.TWITTER.START_OAUTH2),
    revokeOAuth2: () => ipcRenderer.invoke(IPC_CHANNELS.TWITTER.REVOKE_OAUTH2),
    isOAuth2Authorized: () => ipcRenderer.invoke(IPC_CHANNELS.TWITTER.IS_OAUTH2_AUTHORIZED),
    refreshOAuth2Token: () => ipcRenderer.invoke(IPC_CHANNELS.TWITTER.REFRESH_OAUTH2_TOKEN),
  },

  // App API
  app: {
    getDashboardStats: () =>
      ipcRenderer.invoke(IPC_CHANNELS.APP.GET_DASHBOARD_STATS),
    minimizeToTray: () => ipcRenderer.invoke(IPC_CHANNELS.APP.MINIMIZE_TO_TRAY),
    quit: () => ipcRenderer.invoke(IPC_CHANNELS.APP.QUIT),
    // Window controls for custom titlebar
    minimize: () => ipcRenderer.send('window-minimize'),
    toggleMaximize: () => ipcRenderer.send('window-toggle-maximize'),
    close: () => ipcRenderer.send('window-close'),
    onMaximizeChange: (callback: (event: any, maximized: boolean) => void) => {
      ipcRenderer.on('window-maximize-change', callback);
    },
    offMaximizeChange: (callback: (event: any, maximized: boolean) => void) => {
      ipcRenderer.removeListener('window-maximize-change', callback);
    },
  },

  // Sessions API (multi-account support)
  sessions: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.SESSIONS.GET_ALL),
    getAllWithStats: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSIONS.GET_ALL_WITH_STATS),
    getById: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSIONS.GET_BY_ID, id),
    create: (session: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSIONS.CREATE, session),
    update: (id: number, session: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSIONS.UPDATE, id, session),
    delete: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSIONS.DELETE, id),
    toggle: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSIONS.TOGGLE, id),
    testTwitter: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSIONS.TEST_TWITTER, id),
    assignSource: (sourceId: number, sessionId: number | null) =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSIONS.ASSIGN_SOURCE, sourceId, sessionId),
  },
};

// Expose in the main world
contextBridge.exposeInMainWorld('api', api);

// Type declaration for the renderer
export type ElectronAPI = typeof api;
