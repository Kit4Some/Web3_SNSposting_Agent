import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Edit2,
  Trash2,
  Power,
  PowerOff,
  Twitter,
  CheckCircle,
  XCircle,
  Loader2,
  Link as LinkIcon,
  Unlink,
} from 'lucide-react';
import { api } from '../api';
import type { SessionWithStats, NewsSource, Session } from '../../shared/types';

interface SessionFormData {
  name: string;
  description: string;
  twitterApiKey: string;
  twitterApiSecret: string;
  twitterAccessToken: string;
  twitterAccessTokenSecret: string;
  postingInterval: number;
  postingTime: string;
}

const defaultFormData: SessionFormData = {
  name: '',
  description: '',
  twitterApiKey: '',
  twitterApiSecret: '',
  twitterAccessToken: '',
  twitterAccessTokenSecret: '',
  postingInterval: 3,
  postingTime: '10:00',
};

export function SessionsPage() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<SessionWithStats[]>([]);
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [selectedSessionForSources, setSelectedSessionForSources] = useState<Session | null>(null);
  const [formData, setFormData] = useState<SessionFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [testingTwitter, setTestingTwitter] = useState<number | null>(null);
  const [twitterTestResult, setTwitterTestResult] = useState<{ sessionId: number; success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessionsRes, sourcesRes] = await Promise.all([
        api.sessions.getAllWithStats(),
        api.sources.getAll(),
      ]);
      if (sessionsRes.success) {
        setSessions(sessionsRes.data);
      }
      if (sourcesRes.success) {
        setSources(sourcesRes.data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const sessionData = {
        name: formData.name,
        description: formData.description || undefined,
        twitterApiKey: formData.twitterApiKey || undefined,
        twitterApiSecret: formData.twitterApiSecret || undefined,
        twitterAccessToken: formData.twitterAccessToken || undefined,
        twitterAccessTokenSecret: formData.twitterAccessTokenSecret || undefined,
        postingInterval: formData.postingInterval,
        postingTime: formData.postingTime,
        enabled: true,
      };

      if (editingSession) {
        await api.sessions.update(editingSession.id, sessionData);
      } else {
        await api.sessions.create(sessionData);
      }

      setShowModal(false);
      setEditingSession(null);
      setFormData(defaultFormData);
      await loadData();
    } catch (error) {
      console.error('Failed to save session:', error);
    }

    setSaving(false);
  };

  const handleEdit = (session: Session) => {
    setEditingSession(session);
    setFormData({
      name: session.name,
      description: session.description || '',
      twitterApiKey: session.twitterApiKey || '',
      twitterApiSecret: session.twitterApiSecret || '',
      twitterAccessToken: session.twitterAccessToken || '',
      twitterAccessTokenSecret: session.twitterAccessTokenSecret || '',
      postingInterval: session.postingInterval,
      postingTime: session.postingTime,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('sessions.confirmDelete'))) {
      return;
    }

    try {
      await api.sessions.delete(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await api.sessions.toggle(id);
      await loadData();
    } catch (error) {
      console.error('Failed to toggle session:', error);
    }
  };

  const handleTestTwitter = async (id: number) => {
    setTestingTwitter(id);
    setTwitterTestResult(null);

    try {
      const result = await api.sessions.testTwitter(id);
      setTwitterTestResult({
        sessionId: id,
        success: result.success,
        message: result.success
          ? `Connected as @${result.data.username}`
          : result.error || 'Connection failed',
      });
    } catch (error) {
      setTwitterTestResult({
        sessionId: id,
        success: false,
        message: String(error),
      });
    }

    setTestingTwitter(null);
  };

  const handleManageSources = (session: Session) => {
    setSelectedSessionForSources(session);
    setShowSourceModal(true);
  };

  const handleAssignSource = async (sourceId: number, sessionId: number | null) => {
    try {
      await api.sessions.assignSource(sourceId, sessionId);
      await loadData();
    } catch (error) {
      console.error('Failed to assign source:', error);
    }
  };

  const getSourcesForSession = (sessionId: number) => {
    return sources.filter((s) => s.sessionId === sessionId);
  };

  const getUnassignedSources = () => {
    return sources.filter((s) => !s.sessionId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('sessions.title')}</h1>
          <p className="text-gray-400 mt-1">
            {t('sessions.subtitle')}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingSession(null);
            setFormData(defaultFormData);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          {t('sessions.newSession')}
        </button>
      </div>

      {/* Sessions Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`bg-gray-800 rounded-lg border ${
              session.enabled ? 'border-gray-700' : 'border-gray-700/50'
            } ${!session.enabled && 'opacity-60'}`}
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-white">{session.name}</h3>
                  {session.description && (
                    <p className="text-sm text-gray-400 mt-1">{session.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggle(session.id)}
                    className={`p-1.5 rounded ${
                      session.enabled
                        ? 'text-green-400 hover:bg-green-400/20'
                        : 'text-gray-500 hover:bg-gray-700'
                    }`}
                    title={session.enabled ? 'Disable' : 'Enable'}
                  >
                    {session.enabled ? <Power size={18} /> : <PowerOff size={18} />}
                  </button>
                  <button
                    onClick={() => handleEdit(session)}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                    title="Edit"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(session.id)}
                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-lg font-bold text-blue-400">{session.sourceCount}</div>
                  <div className="text-xs text-gray-500">{t('sessions.sources')}</div>
                </div>
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-lg font-bold text-yellow-400">{session.pendingPosts}</div>
                  <div className="text-xs text-gray-500">{t('sessions.pending')}</div>
                </div>
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-lg font-bold text-green-400">{session.postedCount}</div>
                  <div className="text-xs text-gray-500">{t('sessions.posted')}</div>
                </div>
              </div>

              {/* Schedule Info */}
              <div className="text-sm text-gray-400 mb-4">
                {t('sessions.schedule.postsEvery')} {session.postingInterval} {t('sessions.schedule.days')} {t('sessions.schedule.at')}{' '}
                {session.postingTime}
              </div>

              {/* Twitter Test */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => handleTestTwitter(session.id)}
                  disabled={testingTwitter === session.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                >
                  {testingTwitter === session.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Twitter size={16} />
                  )}
                  {t('sessions.testConnection')}
                </button>
                {twitterTestResult?.sessionId === session.id && (
                  <span
                    className={`flex items-center gap-1 text-sm ${
                      twitterTestResult.success ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {twitterTestResult.success ? (
                      <CheckCircle size={14} />
                    ) : (
                      <XCircle size={14} />
                    )}
                    {twitterTestResult.message}
                  </span>
                )}
              </div>

              {/* Manage Sources Button */}
              <button
                onClick={() => handleManageSources(session)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
              >
                <LinkIcon size={16} />
                {t('sessions.manageSources')} ({session.sourceCount})
              </button>
            </div>
          </div>
        ))}
      </div>

      {sessions.length === 0 && (
        <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
          <p className="text-gray-400 mb-4">{t('sessions.noSessions')}</p>
          <button
            onClick={() => {
              setEditingSession(null);
              setFormData(defaultFormData);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            {t('sessions.createSession')}
          </button>
        </div>
      )}

      {/* Session Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                {editingSession ? t('sessions.editSession') : t('sessions.newSession')}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {t('sessions.form.sessionName')} *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {t('sessions.form.description')}
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                    placeholder={t('sessions.form.descriptionPlaceholder')}
                  />
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                    <Twitter size={16} className="text-blue-400" />
                    {t('sessions.form.twitterCredentials')}
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">{t('sessions.form.apiKey')}</label>
                      <input
                        type="password"
                        value={formData.twitterApiKey}
                        onChange={(e) => setFormData({ ...formData, twitterApiKey: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">{t('sessions.form.apiSecret')}</label>
                      <input
                        type="password"
                        value={formData.twitterApiSecret}
                        onChange={(e) => setFormData({ ...formData, twitterApiSecret: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">{t('sessions.form.accessToken')}</label>
                      <input
                        type="password"
                        value={formData.twitterAccessToken}
                        onChange={(e) => setFormData({ ...formData, twitterAccessToken: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">{t('sessions.form.accessTokenSecret')}</label>
                      <input
                        type="password"
                        value={formData.twitterAccessTokenSecret}
                        onChange={(e) =>
                          setFormData({ ...formData, twitterAccessTokenSecret: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-sm font-medium text-gray-300 mb-3">{t('sessions.form.postingSchedule')}</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">{t('sessions.form.postEveryDays')}</label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={formData.postingInterval}
                        onChange={(e) =>
                          setFormData({ ...formData, postingInterval: parseInt(e.target.value) || 1 })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">{t('sessions.form.postTime')}</label>
                      <input
                        type="time"
                        value={formData.postingTime}
                        onChange={(e) => setFormData({ ...formData, postingTime: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingSession(null);
                      setFormData(defaultFormData);
                    }}
                    className="px-4 py-2 text-gray-400 hover:text-white"
                  >
                    {t('sessions.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving && <Loader2 size={16} className="animate-spin" />}
                    {editingSession ? t('sessions.form.saveChanges') : t('sessions.createSession')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Source Assignment Modal */}
      {showSourceModal && selectedSessionForSources && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">
                {t('sessions.manageSources')} - {selectedSessionForSources.name}
              </h2>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
              {/* Assigned Sources */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                  <LinkIcon size={14} />
                  {t('sessions.assignedSources')} ({getSourcesForSession(selectedSessionForSources.id).length})
                </h3>
                <div className="space-y-2">
                  {getSourcesForSession(selectedSessionForSources.id).map((source) => (
                    <div
                      key={source.id}
                      className="flex items-center justify-between bg-gray-700 rounded px-3 py-2"
                    >
                      <div>
                        <span className="text-white">{source.name}</span>
                        <span className="ml-2 text-xs text-gray-400">{source.type}</span>
                      </div>
                      <button
                        onClick={() => handleAssignSource(source.id, null)}
                        className="flex items-center gap-1 text-sm text-red-400 hover:text-red-300"
                      >
                        <Unlink size={14} />
                        {t('sessions.unassign')}
                      </button>
                    </div>
                  ))}
                  {getSourcesForSession(selectedSessionForSources.id).length === 0 && (
                    <p className="text-gray-500 text-sm py-2">{t('sessions.noAssignedSources')}</p>
                  )}
                </div>
              </div>

              {/* Unassigned Sources */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                  <Unlink size={14} />
                  {t('sessions.availableSources')} ({getUnassignedSources().length})
                </h3>
                <div className="space-y-2">
                  {getUnassignedSources().map((source) => (
                    <div
                      key={source.id}
                      className="flex items-center justify-between bg-gray-700/50 rounded px-3 py-2"
                    >
                      <div>
                        <span className="text-gray-300">{source.name}</span>
                        <span className="ml-2 text-xs text-gray-500">{source.type}</span>
                      </div>
                      <button
                        onClick={() => handleAssignSource(source.id, selectedSessionForSources.id)}
                        className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                      >
                        <LinkIcon size={14} />
                        {t('sessions.assign')}
                      </button>
                    </div>
                  ))}
                  {getUnassignedSources().length === 0 && (
                    <p className="text-gray-500 text-sm py-2">{t('sessions.noAvailableSources')}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-700">
              <button
                onClick={() => {
                  setShowSourceModal(false);
                  setSelectedSessionForSources(null);
                }}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                {t('sessions.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
