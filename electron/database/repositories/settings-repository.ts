import { queryOne, execQuery, runTransaction } from '../index';
import { safeStorage } from 'electron';
import type { AppSettings } from '@shared/types';

// Keys that should be encrypted
const ENCRYPTED_KEYS = [
  'openaiApiKey',
  'anthropicApiKey',
  'twitterApiKey',
  'twitterApiSecret',
  'twitterAccessToken',
  'twitterAccessTokenSecret',
  'twitterClientId',
  'twitterClientSecret',
  // OAuth 2.0 PKCE tokens
  'twitterOAuth2AccessToken',
  'twitterOAuth2RefreshToken',
];

export class SettingsRepository {
  get(key: string): string | null {
    const row = queryOne<any>('SELECT value FROM settings WHERE key = ?', [key]);

    if (!row) return null;

    // Decrypt if it's an encrypted key
    if (ENCRYPTED_KEYS.includes(key) && row.value) {
      try {
        if (safeStorage.isEncryptionAvailable()) {
          const encrypted = Buffer.from(row.value, 'base64');
          return safeStorage.decryptString(encrypted);
        }
      } catch {
        // If decryption fails, return as-is (might be unencrypted legacy value)
        return row.value;
      }
    }

    return row.value;
  }

  set(key: string, value: string): void {
    let storedValue = value;

    // Encrypt sensitive keys
    if (ENCRYPTED_KEYS.includes(key) && value) {
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(value);
        storedValue = encrypted.toString('base64');
      }
    }

    execQuery(
      `
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, strftime('%s', 'now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = strftime('%s', 'now')
    `,
      [key, storedValue]
    );
  }

  delete(key: string): void {
    execQuery('DELETE FROM settings WHERE key = ?', [key]);
  }

  getAll(): AppSettings {
    const settings: AppSettings = {
      postingInterval: 3,
      postingTime: '10:00',
      newsCollectionInterval: 6,
      language: 'ko',
      theme: 'dark',
    };

    const keys = [
      'openaiApiKey',
      'anthropicApiKey',
      'twitterAuthType',
      'twitterApiKey',
      'twitterApiSecret',
      'twitterAccessToken',
      'twitterAccessTokenSecret',
      'twitterClientId',
      'twitterClientSecret',
      'postingInterval',
      'postingTime',
      'newsCollectionInterval',
      'language',
      'theme',
    ];

    for (const key of keys) {
      const value = this.get(key);
      if (value !== null) {
        if (key === 'postingInterval' || key === 'newsCollectionInterval') {
          (settings as any)[key] = parseInt(value, 10);
        } else {
          (settings as any)[key] = value;
        }
      }
    }

    return settings;
  }

  saveAll(settings: Partial<AppSettings>): void {
    runTransaction(() => {
      for (const [key, value] of Object.entries(settings)) {
        if (value !== undefined) {
          this.set(key, String(value));
        }
      }
    });
  }

  hasApiKeys(): boolean {
    const openai = this.get('openaiApiKey');
    return !!openai;
  }

  hasTwitterCredentials(): boolean {
    const authType = this.get('twitterAuthType') || 'oauth1';

    if (authType === 'oauth2') {
      const clientId = this.get('twitterClientId');
      const clientSecret = this.get('twitterClientSecret');
      return !!(clientId && clientSecret);
    } else {
      const apiKey = this.get('twitterApiKey');
      const apiSecret = this.get('twitterApiSecret');
      const accessToken = this.get('twitterAccessToken');
      const accessTokenSecret = this.get('twitterAccessTokenSecret');
      return !!(apiKey && apiSecret && accessToken && accessTokenSecret);
    }
  }
}

export const settingsRepository = new SettingsRepository();
