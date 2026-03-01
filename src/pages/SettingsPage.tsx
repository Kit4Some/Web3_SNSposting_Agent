import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Key,
  Clock,
  Globe,
  Save,
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash2,
  FileText,
  Languages,
  ExternalLink,
  LogOut,
} from 'lucide-react';
import { languages, type LanguageCode } from '../i18n';

type TwitterAuthType = 'oauth1' | 'oauth2';

interface AppSettings {
  openaiApiKey?: string;
  twitterAuthType: TwitterAuthType;
  // OAuth 1.0a
  twitterApiKey?: string;
  twitterApiSecret?: string;
  twitterAccessToken?: string;
  twitterAccessTokenSecret?: string;
  // OAuth 2.0
  twitterClientId?: string;
  twitterClientSecret?: string;
  postingInterval: number;
  postingTime: string;
  newsCollectionInterval: number;
  language: LanguageCode;
  theme: 'dark' | 'light';
}

interface Source {
  id: number;
  name: string;
  type: 'api' | 'rss' | 'scrape';
  url: string;
  enabled: boolean;
}

interface Template {
  id: number;
  name: string;
  type: 'summary' | 'image';
  content: string;
  isDefault: boolean;
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-primary-500" />
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState<AppSettings>({
    twitterAuthType: 'oauth1',
    postingInterval: 3,
    postingTime: '10:00',
    newsCollectionInterval: 6,
    language: (i18n.language as LanguageCode) || 'en',
    theme: 'dark',
  });
  const [sources, setSources] = useState<Source[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingOpenAI, setTestingOpenAI] = useState(false);
  const [testingTwitter, setTestingTwitter] = useState(false);
  const [authorizingOAuth2, setAuthorizingOAuth2] = useState(false);
  const [oauth2Authorized, setOauth2Authorized] = useState(false);
  const [oauth2User, setOauth2User] = useState<{ username: string; name: string } | null>(null);
  const [openAIStatus, setOpenAIStatus] = useState<'success' | 'error' | null>(
    null
  );
  const [twitterStatus, setTwitterStatus] = useState<'success' | 'error' | null>(
    null
  );

  useEffect(() => {
    loadData();
  }, []);

  // Check OAuth 2.0 authorization status when auth type changes
  useEffect(() => {
    if (settings.twitterAuthType === 'oauth2') {
      checkOAuth2Status();
    }
  }, [settings.twitterAuthType]);

  const checkOAuth2Status = async () => {
    try {
      const result = await window.api.twitter.isOAuth2Authorized();
      setOauth2Authorized(result.success && result.data === true);

      // If authorized, get user info
      if (result.success && result.data) {
        const userResult = await window.api.twitter.testConnection();
        if (userResult.success && userResult.user) {
          setOauth2User({
            username: userResult.user.username,
            name: userResult.user.name,
          });
        }
      } else {
        setOauth2User(null);
      }
    } catch (error) {
      console.error('Failed to check OAuth2 status:', error);
      setOauth2Authorized(false);
      setOauth2User(null);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsResult, sourcesResult, templatesResult] = await Promise.all([
        window.api.settings.getAll(),
        window.api.sources.getAll(),
        window.api.templates.getAll(),
      ]);

      if (settingsResult.success) {
        setSettings({ ...settings, ...settingsResult.data });
      }
      if (sourcesResult.success) {
        setSources(sourcesResult.data);
      }
      if (templatesResult.success) {
        setTemplates(templatesResult.data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Change language
      if (settings.language !== i18n.language) {
        i18n.changeLanguage(settings.language);
        localStorage.setItem('i18nextLng', settings.language);
      }

      const result = await window.api.settings.saveAll(settings);
      if (result.success) {
        alert(t('settings.saved'));
      } else {
        alert(t('settings.saveFailed') + ': ' + result.error);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert(t('settings.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleTestOpenAI = async () => {
    setTestingOpenAI(true);
    setOpenAIStatus(null);
    try {
      // First save the key
      if (settings.openaiApiKey && settings.openaiApiKey !== '••••••••') {
        await window.api.settings.set('openaiApiKey', settings.openaiApiKey);
      }
      const result = await window.api.ai.testConnection();
      setOpenAIStatus(result.success ? 'success' : 'error');
    } catch (error) {
      setOpenAIStatus('error');
    } finally {
      setTestingOpenAI(false);
    }
  };

  const handleTestTwitter = async () => {
    setTestingTwitter(true);
    setTwitterStatus(null);
    try {
      // Save auth type first
      await window.api.settings.set('twitterAuthType', settings.twitterAuthType);

      if (settings.twitterAuthType === 'oauth2') {
        // OAuth 2.0
        if (settings.twitterClientId && settings.twitterClientId !== '••••••••') {
          await window.api.settings.set('twitterClientId', settings.twitterClientId);
        }
        if (settings.twitterClientSecret && settings.twitterClientSecret !== '••••••••') {
          await window.api.settings.set('twitterClientSecret', settings.twitterClientSecret);
        }
      } else {
        // OAuth 1.0a
        if (settings.twitterApiKey && settings.twitterApiKey !== '••••••••') {
          await window.api.settings.set('twitterApiKey', settings.twitterApiKey);
        }
        if (settings.twitterApiSecret && settings.twitterApiSecret !== '••••••••') {
          await window.api.settings.set('twitterApiSecret', settings.twitterApiSecret);
        }
        if (settings.twitterAccessToken && settings.twitterAccessToken !== '••••••••') {
          await window.api.settings.set('twitterAccessToken', settings.twitterAccessToken);
        }
        if (settings.twitterAccessTokenSecret && settings.twitterAccessTokenSecret !== '••••••••') {
          await window.api.settings.set('twitterAccessTokenSecret', settings.twitterAccessTokenSecret);
        }
      }
      const result = await window.api.twitter.testConnection();
      setTwitterStatus(result.success ? 'success' : 'error');

      // Update OAuth2 user info if successful
      if (result.success && result.user && settings.twitterAuthType === 'oauth2') {
        setOauth2User({
          username: result.user.username,
          name: result.user.name,
        });
        setOauth2Authorized(true);
      }
    } catch (error) {
      setTwitterStatus('error');
    } finally {
      setTestingTwitter(false);
    }
  };

  const handleOAuth2Authorize = async () => {
    setAuthorizingOAuth2(true);
    setTwitterStatus(null);
    try {
      // Save Client ID and Secret first
      if (settings.twitterClientId && settings.twitterClientId !== '••••••••') {
        await window.api.settings.set('twitterClientId', settings.twitterClientId);
      }
      if (settings.twitterClientSecret && settings.twitterClientSecret !== '••••••••') {
        await window.api.settings.set('twitterClientSecret', settings.twitterClientSecret);
      }
      await window.api.settings.set('twitterAuthType', 'oauth2');

      // Start OAuth 2.0 PKCE flow
      const result = await window.api.twitter.startOAuth2();

      if (result.success && result.user) {
        setTwitterStatus('success');
        setOauth2Authorized(true);
        setOauth2User({
          username: result.user.username,
          name: result.user.name,
        });
        alert(t('settings.twitter.oauth2Success', { username: result.user.username }));
      } else {
        setTwitterStatus('error');
        alert(t('settings.twitter.oauth2Failed') + ': ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('OAuth2 authorization failed:', error);
      setTwitterStatus('error');
      alert(t('settings.twitter.oauth2Failed'));
    } finally {
      setAuthorizingOAuth2(false);
    }
  };

  const handleOAuth2Revoke = async () => {
    if (!confirm(t('settings.twitter.confirmRevoke'))) return;

    try {
      await window.api.twitter.revokeOAuth2();
      setOauth2Authorized(false);
      setOauth2User(null);
      setTwitterStatus(null);
    } catch (error) {
      console.error('Failed to revoke OAuth2:', error);
    }
  };

  const handleToggleSource = async (id: number) => {
    try {
      const result = await window.api.sources.toggle(id);
      if (result.success) {
        setSources(
          sources.map((s) =>
            s.id === id ? { ...s, enabled: result.data.enabled } : s
          )
        );
      }
    } catch (error) {
      console.error('Failed to toggle source:', error);
    }
  };

  const handleDeleteSource = async (id: number) => {
    if (!confirm(t('settings.sources.confirmDelete'))) return;
    try {
      const result = await window.api.sources.delete(id);
      if (result.success) {
        setSources(sources.filter((s) => s.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete source:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
          <p className="text-slate-400 mt-1">{t('settings.subtitle')}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {t('settings.save')}
        </button>
      </div>

      {/* Language & Appearance */}
      <Section title={t('settings.sections.appearance')} icon={Languages}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{t('settings.appearance.language')}</label>
            <select
              value={settings.language}
              onChange={(e) =>
                setSettings({ ...settings, language: e.target.value as LanguageCode })
              }
              className="input"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName} ({lang.name})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('settings.appearance.theme')}</label>
            <select
              value={settings.theme}
              onChange={(e) =>
                setSettings({ ...settings, theme: e.target.value as 'dark' | 'light' })
              }
              className="input"
            >
              <option value="dark">{t('settings.appearance.dark')}</option>
              <option value="light">{t('settings.appearance.light')}</option>
            </select>
          </div>
        </div>
      </Section>

      {/* API Keys */}
      <Section title={t('settings.sections.apiKeys')} icon={Key}>
        <div className="space-y-4">
          {/* OpenAI */}
          <div>
            <label className="label">{t('settings.openai.apiKey')}</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={settings.openaiApiKey || ''}
                onChange={(e) =>
                  setSettings({ ...settings, openaiApiKey: e.target.value })
                }
                placeholder="sk-..."
                className="input flex-1"
              />
              <button
                onClick={handleTestOpenAI}
                disabled={testingOpenAI}
                className="btn-secondary flex items-center gap-2"
              >
                {testingOpenAI ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : openAIStatus === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : openAIStatus === 'error' ? (
                  <XCircle className="w-4 h-4 text-red-500" />
                ) : null}
                {t('settings.openai.test')}
              </button>
            </div>
          </div>

          {/* Twitter */}
          <div className="border-t border-dark-border pt-4">
            <h3 className="font-medium mb-3">{t('settings.twitter.title')}</h3>

            {/* Auth Type Selection */}
            <div className="mb-4">
              <label className="label">{t('settings.twitter.authType')}</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="twitterAuthType"
                    value="oauth1"
                    checked={settings.twitterAuthType === 'oauth1'}
                    onChange={() => setSettings({ ...settings, twitterAuthType: 'oauth1' })}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span>{t('settings.twitter.oauth1')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="twitterAuthType"
                    value="oauth2"
                    checked={settings.twitterAuthType === 'oauth2'}
                    onChange={() => setSettings({ ...settings, twitterAuthType: 'oauth2' })}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span>{t('settings.twitter.oauth2')}</span>
                </label>
              </div>
            </div>

            {settings.twitterAuthType === 'oauth1' ? (
              /* OAuth 1.0a Fields */
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">{t('settings.twitter.apiKey')}</label>
                  <input
                    type="password"
                    value={settings.twitterApiKey || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, twitterApiKey: e.target.value })
                    }
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">{t('settings.twitter.apiSecret')}</label>
                  <input
                    type="password"
                    value={settings.twitterApiSecret || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, twitterApiSecret: e.target.value })
                    }
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">{t('settings.twitter.accessToken')}</label>
                  <input
                    type="password"
                    value={settings.twitterAccessToken || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, twitterAccessToken: e.target.value })
                    }
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">{t('settings.twitter.accessTokenSecret')}</label>
                  <input
                    type="password"
                    value={settings.twitterAccessTokenSecret || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        twitterAccessTokenSecret: e.target.value,
                      })
                    }
                    className="input"
                  />
                </div>
              </div>
            ) : (
              /* OAuth 2.0 Fields */
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('settings.twitter.clientId')}</label>
                    <input
                      type="password"
                      value={settings.twitterClientId || ''}
                      onChange={(e) =>
                        setSettings({ ...settings, twitterClientId: e.target.value })
                      }
                      placeholder="Client ID"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">{t('settings.twitter.clientSecret')}</label>
                    <input
                      type="password"
                      value={settings.twitterClientSecret || ''}
                      onChange={(e) =>
                        setSettings({ ...settings, twitterClientSecret: e.target.value })
                      }
                      placeholder="Client Secret (optional for public clients)"
                      className="input"
                    />
                  </div>
                </div>

                {/* OAuth 2.0 Authorization Status */}
                <div className="p-4 rounded-lg bg-dark-bg border border-dark-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sm">
                        {t('settings.twitter.oauth2Status')}
                      </h4>
                      {oauth2Authorized && oauth2User ? (
                        <p className="text-sm text-green-400 mt-1">
                          {t('settings.twitter.connectedAs', { username: `@${oauth2User.username}` })}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-400 mt-1">
                          {t('settings.twitter.notAuthorized')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {oauth2Authorized ? (
                        <button
                          onClick={handleOAuth2Revoke}
                          className="btn-secondary flex items-center gap-2 text-red-400 hover:text-red-300"
                        >
                          <LogOut className="w-4 h-4" />
                          {t('settings.twitter.disconnect')}
                        </button>
                      ) : (
                        <button
                          onClick={handleOAuth2Authorize}
                          disabled={authorizingOAuth2 || !settings.twitterClientId}
                          className="btn-primary flex items-center gap-2"
                        >
                          {authorizingOAuth2 ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <ExternalLink className="w-4 h-4" />
                          )}
                          {t('settings.twitter.authorize')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500 mt-2">
              {settings.twitterAuthType === 'oauth1'
                ? t('settings.twitter.oauth1Desc')
                : t('settings.twitter.oauth2Desc')}
            </p>

            <button
              onClick={handleTestTwitter}
              disabled={testingTwitter}
              className="btn-secondary mt-3 flex items-center gap-2"
            >
              {testingTwitter ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : twitterStatus === 'success' ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : twitterStatus === 'error' ? (
                <XCircle className="w-4 h-4 text-red-500" />
              ) : null}
              {t('settings.twitter.testConnection')}
            </button>
          </div>
        </div>
      </Section>

      {/* Schedule Settings */}
      <Section title={t('settings.sections.schedule')} icon={Clock}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{t('settings.schedule.newsInterval')}</label>
            <input
              type="number"
              min="1"
              max="24"
              value={settings.newsCollectionInterval}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  newsCollectionInterval: parseInt(e.target.value),
                })
              }
              className="input"
            />
          </div>
          <div>
            <label className="label">{t('settings.schedule.postingInterval')}</label>
            <input
              type="number"
              min="1"
              max="30"
              value={settings.postingInterval}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  postingInterval: parseInt(e.target.value),
                })
              }
              className="input"
            />
          </div>
          <div>
            <label className="label">{t('settings.schedule.postingTime')}</label>
            <input
              type="time"
              value={settings.postingTime}
              onChange={(e) =>
                setSettings({ ...settings, postingTime: e.target.value })
              }
              className="input"
            />
          </div>
        </div>
      </Section>

      {/* News Sources */}
      <Section title={t('settings.sections.sources')} icon={Globe}>
        <div className="space-y-3">
          {sources.map((source) => (
            <div
              key={source.id}
              className="flex items-center justify-between p-3 bg-dark-bg rounded-lg"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggleSource(source.id)}
                  className={`w-10 h-6 rounded-full relative transition-colors ${
                    source.enabled ? 'bg-primary-600' : 'bg-slate-600'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                      source.enabled ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
                <div>
                  <p className="font-medium">{source.name}</p>
                  <p className="text-xs text-slate-500">{source.url}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge badge-info">{source.type}</span>
                <button
                  onClick={() => handleDeleteSource(source.id)}
                  className="btn-ghost p-2 text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Templates */}
      <Section title={t('settings.sections.templates')} icon={FileText}>
        <div className="space-y-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="p-3 bg-dark-bg rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{template.name}</span>
                  <span
                    className={`badge ${
                      template.type === 'summary'
                        ? 'badge-info'
                        : 'badge-warning'
                    }`}
                  >
                    {t(`settings.templates.${template.type}`)}
                  </span>
                  {template.isDefault && (
                    <span className="badge badge-success">{t('settings.templates.default')}</span>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2">
                {template.content}
              </p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
