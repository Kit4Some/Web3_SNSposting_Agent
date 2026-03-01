import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RefreshCw,
  ExternalLink,
  Sparkles,
  Trash2,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
} from 'lucide-react';

interface NewsItem {
  id: number;
  title: string;
  content?: string;
  summary?: string;
  url?: string;
  amountLost?: number;
  chain?: string;
  classification?: string;
  technique?: string;
  publishedAt?: number;
  fetchedAt: number;
  processed: boolean;
  source?: {
    name: string;
  };
}

function formatAmount(amount?: number): string {
  if (!amount) return '-';
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(2)}B`;
  }
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(2)}K`;
  }
  return `$${amount.toFixed(2)}`;
}

function formatDate(timestamp?: number, locale?: string): string {
  if (!timestamp) return '-';
  return new Date(timestamp * 1000).toLocaleString(locale || 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function NewsCard({
  news,
  onCreatePost,
  onDelete,
  isCreating,
  t,
  locale,
}: {
  news: NewsItem;
  onCreatePost: (id: number) => void;
  onDelete: (id: number) => void;
  isCreating: boolean;
  t: (key: string) => string;
  locale: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {!news.processed && (
              <span className="badge badge-info">{t('news.newBadge')}</span>
            )}
            {news.source && (
              <span className="text-xs text-slate-500">{news.source.name}</span>
            )}
          </div>
          <h3 className="font-semibold mt-2 line-clamp-2">{news.title}</h3>

          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
            {news.amountLost && (
              <span className="text-red-400 font-medium">
                {formatAmount(news.amountLost)}
              </span>
            )}
            {news.chain && (
              <span className="text-slate-400">{news.chain}</span>
            )}
            {news.classification && (
              <span className="badge badge-warning">{news.classification}</span>
            )}
          </div>

          {expanded && (
            <div className="mt-4 space-y-3 animate-fade-in">
              {news.content && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">{t('news.content')}</p>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">
                    {news.content}
                  </p>
                </div>
              )}
              {news.technique && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">{t('news.technique')}</p>
                  <p className="text-sm text-slate-300">{news.technique}</p>
                </div>
              )}
              {news.summary && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">{t('news.aiSummary')}</p>
                  <p className="text-sm text-slate-300">{news.summary}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {news.url && (
            <a
              href={news.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost p-2"
              title={t('news.viewOriginal')}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-dark-border">
        <button
          onClick={() => setExpanded(!expanded)}
          className="btn-ghost text-sm flex items-center gap-1"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              {t('news.collapse')}
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              {t('news.expand')}
            </>
          )}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {formatDate(news.publishedAt || news.fetchedAt, locale)}
          </span>
          <button
            onClick={() => onDelete(news.id)}
            className="btn-ghost p-2 text-red-400 hover:text-red-300"
            title={t('news.delete')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onCreatePost(news.id)}
            disabled={isCreating}
            className="btn-primary text-sm flex items-center gap-2"
          >
            {isCreating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                {t('news.creating')}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {t('news.createPost')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewsPage() {
  const { t, i18n } = useTranslation();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [creatingPostId, setCreatingPostId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'unprocessed'>('all');

  useEffect(() => {
    loadNews();
  }, [filter]);

  const loadNews = async () => {
    setLoading(true);
    try {
      const result = await window.api.news.getList({
        limit: 50,
        unprocessedOnly: filter === 'unprocessed',
      });
      if (result.success) {
        setNews(result.data);
      }
    } catch (error) {
      console.error('Failed to load news:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCollect = async () => {
    setCollecting(true);
    try {
      const result = await window.api.scheduler.triggerNewsCollection();
      if (result.success) {
        loadNews();
      }
    } catch (error) {
      console.error('Failed to collect news:', error);
    } finally {
      setCollecting(false);
    }
  };

  const handleCreatePost = async (newsId: number) => {
    setCreatingPostId(newsId);
    try {
      const result = await window.api.posts.create({ newsItemId: newsId });
      if (result.success) {
        alert(t('news.postCreated'));
        loadNews();
      } else {
        alert(t('news.postCreateFailed') + result.error);
      }
    } catch (error) {
      console.error('Failed to create post:', error);
      alert(t('news.postCreateError'));
    } finally {
      setCreatingPostId(null);
    }
  };

  const handleDelete = async (newsId: number) => {
    if (!confirm(t('news.confirmDelete'))) return;

    try {
      const result = await window.api.news.delete(newsId);
      if (result.success) {
        setNews(news.filter((n) => n.id !== newsId));
      }
    } catch (error) {
      console.error('Failed to delete news:', error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('news.title')}</h1>
          <p className="text-slate-400 mt-1">{t('news.subtitle')}</p>
        </div>
        <button
          onClick={handleCollect}
          disabled={collecting}
          className="btn-primary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${collecting ? 'animate-spin' : ''}`} />
          {collecting ? t('news.collecting') : t('news.collectNews')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`btn ${
            filter === 'all' ? 'btn-primary' : 'btn-ghost'
          }`}
        >
          {t('news.filters.all')}
        </button>
        <button
          onClick={() => setFilter('unprocessed')}
          className={`btn ${
            filter === 'unprocessed' ? 'btn-primary' : 'btn-ghost'
          }`}
        >
          {t('news.filters.unprocessed')}
        </button>
      </div>

      {/* News List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : news.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500">{t('news.noNews')}</p>
          <button onClick={handleCollect} className="btn-primary mt-4">
            {t('news.collectNews')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {news.map((item) => (
            <NewsCard
              key={item.id}
              news={item}
              onCreatePost={handleCreatePost}
              onDelete={handleDelete}
              isCreating={creatingPostId === item.id}
              t={t}
              locale={i18n.language}
            />
          ))}
        </div>
      )}
    </div>
  );
}
