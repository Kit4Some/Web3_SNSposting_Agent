// API wrapper for IPC communication
// All API calls are available via window.api

export const api = {
  news: {
    fetchAll: () => window.api.news.fetchAll(),
    getList: (params?: { limit?: number; offset?: number; unprocessedOnly?: boolean }) =>
      window.api.news.getList(params),
    getItem: (id: number) => window.api.news.getItem(id),
    markProcessed: (id: number) => window.api.news.markProcessed(id),
    delete: (id: number) => window.api.news.delete(id),
  },

  sources: {
    getAll: () => window.api.sources.getAll(),
    add: (source: any) => window.api.sources.add(source),
    update: (id: number, source: any) => window.api.sources.update(id, source),
    delete: (id: number) => window.api.sources.delete(id),
    toggle: (id: number) => window.api.sources.toggle(id),
    fetchFromSource: (id: number) => window.api.sources.fetchFromSource(id),
  },

  posts: {
    getQueue: () => window.api.posts.getQueue(),
    getHistory: (limit?: number) => window.api.posts.getHistory(limit),
    create: (params: {
      newsItemId: number;
      summaryTemplateId?: number;
      imageTemplateId?: number;
      scheduledFor?: number;
    }) => window.api.posts.create(params),
    update: (id: number, post: any) => window.api.posts.update(id, post),
    delete: (id: number) => window.api.posts.delete(id),
    schedule: (id: number, scheduledFor: number) =>
      window.api.posts.schedule(id, scheduledFor),
    publish: (id: number) => window.api.posts.publish(id),
    publishNow: (id: number) => window.api.posts.publishNow(id),
  }, 

  ai: {
    generateSummary: (newsItemId: number, templateId?: number) =>
      window.api.ai.generateSummary(newsItemId, templateId),
    generateImage: (newsItemId: number, templateId?: number) =>
      window.api.ai.generateImage(newsItemId, templateId),
    testConnection: () => window.api.ai.testConnection(),
  },

  templates: {
    getAll: () => window.api.templates.getAll(),
    getByType: (type: string) => window.api.templates.getByType(type),
    add: (template: any) => window.api.templates.add(template),
    update: (id: number, template: any) => window.api.templates.update(id, template),
    delete: (id: number) => window.api.templates.delete(id),
    setDefault: (id: number) => window.api.templates.setDefault(id),
  },

  settings: {
    get: (key: string) => window.api.settings.get(key),
    set: (key: string, value: string) => window.api.settings.set(key, value),
    getAll: () => window.api.settings.getAll(),
    saveAll: (settings: any) => window.api.settings.saveAll(settings),
  },

  scheduler: {
    getStatus: () => window.api.scheduler.getStatus(),
    start: () => window.api.scheduler.start(),
    stop: () => window.api.scheduler.stop(),
    triggerNewsCollection: () => window.api.scheduler.triggerNewsCollection(),
    triggerPosting: () => window.api.scheduler.triggerPosting(),
  },

  twitter: {
    testConnection: () => window.api.twitter.testConnection(),
    getUserInfo: () => window.api.twitter.getUserInfo(),
  },

  app: {
    getDashboardStats: () => window.api.app.getDashboardStats(),
    minimizeToTray: () => window.api.app.minimizeToTray(),
    quit: () => window.api.app.quit(),
  },

  sessions: {
    getAll: () => window.api.sessions.getAll(),
    getAllWithStats: () => window.api.sessions.getAllWithStats(),
    getById: (id: number) => window.api.sessions.getById(id),
    create: (session: any) => window.api.sessions.create(session),
    update: (id: number, session: any) => window.api.sessions.update(id, session),
    delete: (id: number) => window.api.sessions.delete(id),
    toggle: (id: number) => window.api.sessions.toggle(id),
    testTwitter: (id: number) => window.api.sessions.testTwitter(id),
    assignSource: (sourceId: number, sessionId: number | null) =>
      window.api.sessions.assignSource(sourceId, sessionId),
  },
};
