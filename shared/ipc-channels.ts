export const IPC_CHANNELS = {
  // News related channels
  NEWS: {
    FETCH_ALL: 'news:fetch-all',
    GET_LIST: 'news:get-list',
    GET_ITEM: 'news:get-item',
    MARK_PROCESSED: 'news:mark-processed',
    DELETE: 'news:delete',
  },

  // Source related channels
  SOURCES: {
    GET_ALL: 'sources:get-all',
    ADD: 'sources:add',
    UPDATE: 'sources:update',
    DELETE: 'sources:delete',
    TOGGLE: 'sources:toggle',
    FETCH_FROM_SOURCE: 'sources:fetch-from-source',
  },

  // Post related channels
  POSTS: {
    GET_QUEUE: 'posts:get-queue',
    GET_HISTORY: 'posts:get-history',
    CREATE: 'posts:create',
    UPDATE: 'posts:update',
    DELETE: 'posts:delete',
    SCHEDULE: 'posts:schedule',
    PUBLISH: 'posts:publish',
    PUBLISH_NOW: 'posts:publish-now',
  },

  // AI related channels
  AI: {
    GENERATE_SUMMARY: 'ai:generate-summary',
    GENERATE_IMAGE: 'ai:generate-image',
    TEST_CONNECTION: 'ai:test-connection',
  },

  // Template related channels
  TEMPLATES: {
    GET_ALL: 'templates:get-all',
    GET_BY_TYPE: 'templates:get-by-type',
    ADD: 'templates:add',
    UPDATE: 'templates:update',
    DELETE: 'templates:delete',
    SET_DEFAULT: 'templates:set-default',
  },

  // Settings related channels
  SETTINGS: {
    GET: 'settings:get',
    SET: 'settings:set',
    GET_ALL: 'settings:get-all',
    SAVE_ALL: 'settings:save-all',
  },

  // Scheduler related channels
  SCHEDULER: {
    GET_STATUS: 'scheduler:get-status',
    START: 'scheduler:start',
    STOP: 'scheduler:stop',
    TRIGGER_NEWS_COLLECTION: 'scheduler:trigger-news-collection',
    TRIGGER_POSTING: 'scheduler:trigger-posting',
  },

  // Twitter related channels
  TWITTER: {
    TEST_CONNECTION: 'twitter:test-connection',
    GET_USER_INFO: 'twitter:get-user-info',
    // OAuth 2.0 PKCE flow
    START_OAUTH2: 'twitter:start-oauth2',
    REVOKE_OAUTH2: 'twitter:revoke-oauth2',
    IS_OAUTH2_AUTHORIZED: 'twitter:is-oauth2-authorized',
    REFRESH_OAUTH2_TOKEN: 'twitter:refresh-oauth2-token',
  },

  // App related channels
  APP: {
    GET_DASHBOARD_STATS: 'app:get-dashboard-stats',
    MINIMIZE_TO_TRAY: 'app:minimize-to-tray',
    QUIT: 'app:quit',
  },

  // Session related channels (multi-account support)
  SESSIONS: {
    GET_ALL: 'sessions:get-all',
    GET_ALL_WITH_STATS: 'sessions:get-all-with-stats',
    GET_BY_ID: 'sessions:get-by-id',
    CREATE: 'sessions:create',
    UPDATE: 'sessions:update',
    DELETE: 'sessions:delete',
    TOGGLE: 'sessions:toggle',
    TEST_TWITTER: 'sessions:test-twitter',
    ASSIGN_SOURCE: 'sessions:assign-source',
  },
} as const;

// Type helper for channel names
export type IpcChannel =
  | typeof IPC_CHANNELS.NEWS[keyof typeof IPC_CHANNELS.NEWS]
  | typeof IPC_CHANNELS.SOURCES[keyof typeof IPC_CHANNELS.SOURCES]
  | typeof IPC_CHANNELS.POSTS[keyof typeof IPC_CHANNELS.POSTS]
  | typeof IPC_CHANNELS.AI[keyof typeof IPC_CHANNELS.AI]
  | typeof IPC_CHANNELS.TEMPLATES[keyof typeof IPC_CHANNELS.TEMPLATES]
  | typeof IPC_CHANNELS.SETTINGS[keyof typeof IPC_CHANNELS.SETTINGS]
  | typeof IPC_CHANNELS.SCHEDULER[keyof typeof IPC_CHANNELS.SCHEDULER]
  | typeof IPC_CHANNELS.TWITTER[keyof typeof IPC_CHANNELS.TWITTER]
  | typeof IPC_CHANNELS.APP[keyof typeof IPC_CHANNELS.APP]
  | typeof IPC_CHANNELS.SESSIONS[keyof typeof IPC_CHANNELS.SESSIONS];
