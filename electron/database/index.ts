import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

let db: Database | null = null;
let dbPath: string | null = null;
let inTransaction = false;

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export async function initDatabase(): Promise<Database> {
  const userDataPath = app.getPath('userData');
  dbPath = path.join(userDataPath, 'web3news.db');

  // Initialize sql.js
  const SQL = await initSqlJs();

  // Load existing database if it exists
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Run migrations
  runMigrations(db);

  // Save after migrations
  saveDatabase();

  return db;
}

export function saveDatabase(): void {
  if (db && dbPath) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

function runMigrations(database: Database): void {
  // Create migrations table
  database.run(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

  // Check if initial migration has been applied
  const applied001 = database.exec(
    "SELECT name FROM migrations WHERE name = '001_initial'"
  );

  if (applied001.length === 0 || applied001[0].values.length === 0) {
    applyInitialMigration(database);
    database.run("INSERT INTO migrations (name) VALUES ('001_initial')");
  }

  // Check if sessions migration has been applied
  const applied002 = database.exec(
    "SELECT name FROM migrations WHERE name = '002_sessions'"
  );

  if (applied002.length === 0 || applied002[0].values.length === 0) {
    applySessionsMigration(database);
    database.run("INSERT INTO migrations (name) VALUES ('002_sessions')");
  }

  // Check if professional templates migration has been applied
  const applied003 = database.exec(
    "SELECT name FROM migrations WHERE name = '003_professional_templates'"
  );

  if (applied003.length === 0 || applied003[0].values.length === 0) {
    applyProfessionalTemplatesMigration(database);
    database.run("INSERT INTO migrations (name) VALUES ('003_professional_templates')");
  }
}

function applyInitialMigration(database: Database): void {
  database.run(`
    -- News sources configuration
    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('api', 'rss', 'scrape')),
      url TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      config TEXT,
      last_fetched_at INTEGER,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

  database.run(`
    -- Collected news items
    CREATE TABLE IF NOT EXISTS news_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER REFERENCES sources(id) ON DELETE CASCADE,
      external_id TEXT,
      title TEXT NOT NULL,
      content TEXT,
      summary TEXT,
      url TEXT,
      amount_lost REAL,
      chain TEXT,
      classification TEXT,
      technique TEXT,
      published_at INTEGER,
      fetched_at INTEGER DEFAULT (strftime('%s', 'now')),
      processed INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      UNIQUE(source_id, external_id)
    );
  `);

  database.run(`
    -- Generated posts
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      news_item_id INTEGER REFERENCES news_items(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      image_url TEXT,
      image_prompt TEXT,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'scheduled', 'posted', 'failed')),
      scheduled_for INTEGER,
      posted_at INTEGER,
      tweet_id TEXT,
      error_message TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

  database.run(`
    -- AI prompt templates
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('summary', 'image')),
      content TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

  database.run(`
    -- App settings (key-value store)
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

  // Indices
  database.run('CREATE INDEX IF NOT EXISTS idx_news_items_source ON news_items(source_id);');
  database.run('CREATE INDEX IF NOT EXISTS idx_news_items_published ON news_items(published_at DESC);');
  database.run('CREATE INDEX IF NOT EXISTS idx_news_items_processed ON news_items(processed);');
  database.run('CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);');
  database.run('CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON posts(scheduled_for);');

  // Insert default sources
  database.run(`
    INSERT OR IGNORE INTO sources (name, type, url, enabled, config) VALUES
      ('DeFiLlama Hacks', 'api', 'https://api.llama.fi/hacks', 1, '{"rateLimit": 1000}')
  `);
  database.run(`
    INSERT OR IGNORE INTO sources (name, type, url, enabled, config) VALUES
      ('Rekt News', 'scrape', 'https://rekt.news/', 1, '{"selectors": {"title": "h2.post-title", "content": ".post-content", "link": "a.post-link"}}')
  `);

  // Insert default templates
  const summaryTemplate = `You are a professional Web3 security journalist. Write an authoritative breaking news tweet about this security incident.

**Incident Details:**
- Protocol: ` + '{{name}}' + `
- Amount Lost: $` + '{{amountLost}}' + `
- Chain: ` + '{{chain}}' + `
- Attack Type: ` + '{{classification}}' + `
- Technique: ` + '{{technique}}' + `

**Writing Style:**
- Write like a Bloomberg/Reuters security correspondent
- Lead with the most impactful fact (usually the loss amount or protocol name)
- Use active voice and present tense for immediacy
- Be factual, authoritative, and professional

**Format Structure:**
1. BREAKING or ALERT prefix (use sparingly, only for major incidents >$1M)
2. One powerful headline sentence with key facts
3. Brief context on the attack vector
4. End with relevant hashtags: #Web3Security #DeFi #CryptoNews

**Requirements:**
- Maximum 260 characters total
- Include protocol name, chain, and loss amount
- NO cute emojis - use only professional ones if any (e.g., alert, chart)
- Maintain credibility and urgency without sensationalism

Output ONLY the tweet text, nothing else.`;

  const imageTemplate = `Create a professional cybersecurity news illustration for a Web3 security incident report:

**Scene Description:**
A dramatic visualization of a blockchain security breach representing a "` + '{{classification}}' + `" attack using "` + '{{technique}}' + `" on the ` + '{{chain}}' + ` network.

**Visual Elements:**
- Abstract representation of blockchain architecture with broken/compromised nodes
- Digital data streams showing breach points with warning indicators
- Glowing hexagonal network patterns being disrupted
- Color scheme: Dark background (deep blue/black) with neon accents (red for threat, cyan for blockchain)
- Professional alert/warning visual elements

**Style Requirements:**
- Modern, sleek cybersecurity aesthetic (like Bloomberg Terminal or Reuters graphics)
- High-tech, professional news media quality
- Clean geometric shapes representing blockchain structure
- Dramatic lighting effects showing the breach point
- NO cartoons, NO cute elements, NO animals
- NO text or logos in the image
- Square format (1:1 ratio)
- Suitable for professional financial/tech news media`;

  database.run(
    "INSERT OR IGNORE INTO templates (name, type, content, is_default) VALUES (?, ?, ?, ?)",
    ['Default Summary', 'summary', summaryTemplate, 1]
  );

  database.run(
    "INSERT OR IGNORE INTO templates (name, type, content, is_default) VALUES (?, ?, ?, ?)",
    ['Default Image', 'image', imageTemplate, 1]
  );

  // Insert default settings
  database.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('postingInterval', '3')");
  database.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('postingTime', '10:00')");
  database.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('newsCollectionInterval', '6')");
  database.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('language', 'ko')");
  database.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'dark')");
}

function applySessionsMigration(database: Database): void {
  database.run(`
    -- Sessions table for multi-account support
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      twitter_api_key TEXT,
      twitter_api_secret TEXT,
      twitter_access_token TEXT,
      twitter_access_token_secret TEXT,
      enabled INTEGER DEFAULT 1,
      posting_interval INTEGER DEFAULT 3,
      posting_time TEXT DEFAULT '10:00',
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

  // Check if session_id column already exists in sources
  const sourcesInfo = database.exec("PRAGMA table_info(sources)");
  const hasSessionIdInSources = sourcesInfo.length > 0 &&
    sourcesInfo[0].values.some((row: any) => row[1] === 'session_id');

  if (!hasSessionIdInSources) {
    database.run('ALTER TABLE sources ADD COLUMN session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL;');
  }

  // Check if session_id column already exists in posts
  const postsInfo = database.exec("PRAGMA table_info(posts)");
  const hasSessionIdInPosts = postsInfo.length > 0 &&
    postsInfo[0].values.some((row: any) => row[1] === 'session_id');

  if (!hasSessionIdInPosts) {
    database.run('ALTER TABLE posts ADD COLUMN session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL;');
  }

  // Create indices
  database.run('CREATE INDEX IF NOT EXISTS idx_sources_session ON sources(session_id);');
  database.run('CREATE INDEX IF NOT EXISTS idx_posts_session ON posts(session_id);');
  database.run('CREATE INDEX IF NOT EXISTS idx_sessions_enabled ON sessions(enabled);');

  // Insert default session
  const existingSession = database.exec("SELECT id FROM sessions WHERE name = 'Default'");
  if (existingSession.length === 0 || existingSession[0].values.length === 0) {
    database.run(`
      INSERT INTO sessions (name, description, enabled) VALUES
        ('Default', 'Default session using global Twitter credentials', 1)
    `);
  }
}

function applyProfessionalTemplatesMigration(database: Database): void {
  // Update summary template to professional journalist style
  // Using string concatenation to avoid template literal issues with {{placeholders}}
  const newSummaryTemplate = 'You are a professional Web3 security journalist. Write an authoritative breaking news tweet about this security incident.\n\n' +
    '**Incident Details:**\n' +
    '- Protocol: {{name}}\n' +
    '- Amount Lost: ${{amountLost}}\n' +
    '- Chain: {{chain}}\n' +
    '- Attack Type: {{classification}}\n' +
    '- Technique: {{technique}}\n\n' +
    '**Writing Style:**\n' +
    '- Write like a Bloomberg/Reuters security correspondent\n' +
    '- Lead with the most impactful fact (usually the loss amount or protocol name)\n' +
    '- Use active voice and present tense for immediacy\n' +
    '- Be factual, authoritative, and professional\n\n' +
    '**Format Structure:**\n' +
    '1. BREAKING or ALERT prefix (use sparingly, only for major incidents >$1M)\n' +
    '2. One powerful headline sentence with key facts\n' +
    '3. Brief context on the attack vector\n' +
    '4. End with relevant hashtags: #Web3Security #DeFi #CryptoNews\n\n' +
    '**Requirements:**\n' +
    '- Maximum 260 characters total\n' +
    '- Include protocol name, chain, and loss amount\n' +
    '- NO cute emojis - use only professional ones if any (e.g., alert, chart)\n' +
    '- Maintain credibility and urgency without sensationalism\n\n' +
    'Output ONLY the tweet text, nothing else.';

  // Update image template to professional cybersecurity style
  const newImageTemplate = 'Create a professional cybersecurity news illustration for a Web3 security incident report:\n\n' +
    '**Scene Description:**\n' +
    'A dramatic visualization of a blockchain security breach representing a "{{classification}}" attack using "{{technique}}" on the {{chain}} network.\n\n' +
    '**Visual Elements:**\n' +
    '- Abstract representation of blockchain architecture with broken/compromised nodes\n' +
    '- Digital data streams showing breach points with warning indicators\n' +
    '- Glowing hexagonal network patterns being disrupted\n' +
    '- Color scheme: Dark background (deep blue/black) with neon accents (red for threat, cyan for blockchain)\n' +
    '- Professional alert/warning visual elements\n\n' +
    '**Style Requirements:**\n' +
    '- Modern, sleek cybersecurity aesthetic (like Bloomberg Terminal or Reuters graphics)\n' +
    '- High-tech, professional news media quality\n' +
    '- Clean geometric shapes representing blockchain structure\n' +
    '- Dramatic lighting effects showing the breach point\n' +
    '- NO cartoons, NO cute elements, NO animals\n' +
    '- NO text or logos in the image\n' +
    '- Square format (1:1 ratio)\n' +
    '- Suitable for professional financial/tech news media';

  // Update default templates
  database.run(
    "UPDATE templates SET content = ?, updated_at = strftime('%s', 'now') WHERE name = 'Default Summary' AND type = 'summary'",
    [newSummaryTemplate]
  );

  database.run(
    "UPDATE templates SET content = ?, updated_at = strftime('%s', 'now') WHERE name = 'Default Image' AND type = 'image'",
    [newImageTemplate]
  );
}

export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

// Helper functions for sql.js queries that mimic better-sqlite3 API

export interface QueryResult {
  lastInsertRowid: number;
  changes: number;
}

export function execQuery(sql: string, params: any[] = []): QueryResult {
  const database = getDatabase();
  database.run(sql, params);

  // Get last insert rowid
  const lastIdResult = database.exec('SELECT last_insert_rowid() as id');
  const lastInsertRowid = lastIdResult.length > 0 && lastIdResult[0].values.length > 0
    ? (lastIdResult[0].values[0][0] as number)
    : 0;

  // Get changes count
  const changesResult = database.exec('SELECT changes() as count');
  const changes = changesResult.length > 0 && changesResult[0].values.length > 0
    ? (changesResult[0].values[0][0] as number)
    : 0;

  // Only save if not in a transaction
  if (!inTransaction) {
    saveDatabase();
  }

  return { lastInsertRowid, changes };
}

export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  const database = getDatabase();
  const stmt = database.prepare(sql);

  if (params.length > 0) {
    stmt.bind(params);
  }

  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();

  return results;
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const results = queryAll<T>(sql, params);
  return results.length > 0 ? results[0] : null;
}

export function runTransaction<T>(fn: () => T): T {
  const database = getDatabase();
  inTransaction = true;
  database.run('BEGIN TRANSACTION');
  try {
    const result = fn();
    database.run('COMMIT');
    inTransaction = false;
    saveDatabase();
    return result;
  } catch (error) {
    database.run('ROLLBACK');
    inTransaction = false;
    throw error;
  }
}
