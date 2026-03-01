import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Newspaper,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';

interface DashboardStats {
  totalNews: number;
  unprocessedNews: number;
  scheduledPosts: number;
  postedCount: number;
  lastPostDate?: number;
  nextScheduledPost?: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: any;
  label: string;
  value: number | string;
  subtext?: string;
  color: string;
}) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentNews, setRecentNews] = useState<any[]>([]);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);

  const formatDate = (timestamp?: number): string => {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleString(i18n.language, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsResult, newsResult, postsResult] = await Promise.all([
        window.api.app.getDashboardStats(),
        window.api.news.getList({ limit: 5 }),
        window.api.posts.getHistory(5),
      ]);

      if (statsResult.success) {
        setStats(statsResult.data);
      }
      if (newsResult.success) {
        setRecentNews(newsResult.data);
      }
      if (postsResult.success) {
        setRecentPosts(postsResult.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
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
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
        <p className="text-slate-400 mt-1">{t('dashboard.subtitle')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Newspaper}
          label={t('dashboard.stats.totalNews')}
          value={stats?.totalNews || 0}
          subtext={`${t('dashboard.stats.unprocessedNews')}: ${stats?.unprocessedNews || 0}`}
          color="bg-blue-600"
        />
        <StatCard
          icon={Clock}
          label={t('dashboard.stats.scheduledPosts')}
          value={stats?.scheduledPosts || 0}
          subtext={
            stats?.nextScheduledPost
              ? formatDate(stats.nextScheduledPost)
              : undefined
          }
          color="bg-yellow-600"
        />
        <StatCard
          icon={CheckCircle}
          label={t('dashboard.stats.postedCount')}
          value={stats?.postedCount || 0}
          subtext={
            stats?.lastPostDate
              ? formatDate(stats.lastPostDate)
              : undefined
          }
          color="bg-green-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Status"
          value="Active"
          color="bg-primary-600"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent News */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">{t('dashboard.recentNews')}</h2>
          {recentNews.length === 0 ? (
            <p className="text-slate-500 text-center py-8">
              {t('dashboard.noNews')}
            </p>
          ) : (
            <div className="space-y-3">
              {recentNews.map((news: any) => (
                <div
                  key={news.id}
                  className="p-3 bg-dark-bg rounded-lg border border-dark-border"
                >
                  <h3 className="font-medium text-sm line-clamp-1">
                    {news.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                    {news.amountLost && (
                      <span className="text-red-400">
                        ${(news.amountLost / 1_000_000).toFixed(2)}M
                      </span>
                    )}
                    {news.chain && <span>{news.chain}</span>}
                    <span>
                      {news.publishedAt
                        ? formatDate(news.publishedAt)
                        : formatDate(news.fetchedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Posts */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">{t('posts.title')}</h2>
          {recentPosts.length === 0 ? (
            <p className="text-slate-500 text-center py-8">
              {t('posts.noHistory')}
            </p>
          ) : (
            <div className="space-y-3">
              {recentPosts.map((post: any) => (
                <div
                  key={post.id}
                  className="p-3 bg-dark-bg rounded-lg border border-dark-border"
                >
                  <p className="text-sm line-clamp-2">{post.content}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`badge ${
                        post.status === 'posted'
                          ? 'badge-success'
                          : post.status === 'failed'
                          ? 'badge-error'
                          : 'badge-warning'
                      }`}
                    >
                      {t(`posts.status.${post.status}`)}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDate(post.postedAt || post.scheduledFor)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">{t('dashboard.quickActions')}</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => window.api.scheduler.triggerNewsCollection()}
            className="btn-primary"
          >
            {t('dashboard.collectNews')}
          </button>
          <button
            onClick={() => window.api.scheduler.triggerPosting()}
            className="btn-secondary"
          >
            {t('dashboard.createPost')}
          </button>
        </div>
      </div>
    </div>
  );
}
