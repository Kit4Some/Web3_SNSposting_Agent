import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  RefreshCw,
  Image as ImageIcon,
  Calendar,
} from 'lucide-react';

interface Post {
  id: number;
  newsItemId: number;
  content: string;
  imageUrl?: string;
  imagePrompt?: string;
  status: 'draft' | 'scheduled' | 'posted' | 'failed';
  scheduledFor?: number;
  postedAt?: number;
  tweetId?: string;
  errorMessage?: string;
  newsItem?: {
    title: string;
    chain?: string;
    amountLost?: number;
  };
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

function StatusBadge({ status, t }: { status: Post['status']; t: (key: string) => string }) {
  const config = {
    draft: { class: 'badge-info', icon: Edit },
    scheduled: { class: 'badge-warning', icon: Clock },
    posted: { class: 'badge-success', icon: CheckCircle },
    failed: { class: 'badge-error', icon: XCircle },
  };

  const { class: badgeClass, icon: Icon } = config[status];

  return (
    <span className={`badge ${badgeClass} flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {t(`posts.status.${status}`)}
    </span>
  );
}

function PostCard({
  post,
  onPublish,
  onDelete,
  isPublishing,
  t,
  locale,
}: {
  post: Post;
  onPublish: (id: number) => void;
  onDelete: (id: number) => void;
  isPublishing: boolean;
  t: (key: string) => string;
  locale: string;
}) {
  const [showImage, setShowImage] = useState(false);

  return (
    <div className="card">
      <div className="flex items-start gap-4">
        {/* Image preview */}
        {post.imageUrl && (
          <div
            className="w-24 h-24 rounded-lg bg-dark-bg overflow-hidden flex-shrink-0 cursor-pointer"
            onClick={() => setShowImage(true)}
          >
            <img
              src={`file://${post.imageUrl}`}
              alt="Post image"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <StatusBadge status={post.status} t={t} />
            {post.newsItem?.title && (
              <span className="text-xs text-slate-500 truncate">
                {post.newsItem.title}
              </span>
            )}
          </div>

          <p className="text-sm whitespace-pre-wrap line-clamp-3">
            {post.content}
          </p>

          {post.errorMessage && (
            <p className="text-xs text-red-400 mt-2">
              {t('posts.error')}{post.errorMessage}
            </p>
          )}

          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
            {post.scheduledFor && post.status === 'scheduled' && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {t('posts.scheduledFor')}{formatDate(post.scheduledFor, locale)}
              </span>
            )}
            {post.postedAt && (
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {t('posts.postedAt')}{formatDate(post.postedAt, locale)}
              </span>
            )}
            {post.tweetId && (
              <a
                href={`https://twitter.com/i/web/status/${post.tweetId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-400 hover:underline"
              >
                {t('posts.viewTweet')}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-dark-border">
        <button
          onClick={() => onDelete(post.id)}
          className="btn-ghost p-2 text-red-400 hover:text-red-300"
          title={t('posts.delete')}
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {(post.status === 'draft' || post.status === 'scheduled') && (
          <button
            onClick={() => onPublish(post.id)}
            disabled={isPublishing}
            className="btn-primary text-sm flex items-center gap-2"
          >
            {isPublishing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                {t('posts.publishing')}
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {t('posts.publishNow')}
              </>
            )}
          </button>
        )}

        {post.status === 'failed' && (
          <button
            onClick={() => onPublish(post.id)}
            disabled={isPublishing}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            {isPublishing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                {t('posts.retrying')}
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                {t('posts.retry')}
              </>
            )}
          </button>
        )}
      </div>

      {/* Image Modal */}
      {showImage && post.imageUrl && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setShowImage(false)}
        >
          <img
            src={`file://${post.imageUrl}`}
            alt="Post image"
            className="max-w-[90vw] max-h-[90vh] rounded-lg"
          />
        </div>
      )}
    </div>
  );
}

export default function PostsPage() {
  const { t, i18n } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [view, setView] = useState<'queue' | 'history'>('queue');

  useEffect(() => {
    loadPosts();
  }, [view]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const result =
        view === 'queue'
          ? await window.api.posts.getQueue()
          : await window.api.posts.getHistory();

      if (result.success) {
        setPosts(result.data);
      }
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (postId: number) => {
    setPublishingId(postId);
    try {
      const result = await window.api.posts.publishNow(postId);
      if (result.success) {
        alert(t('posts.published'));
        loadPosts();
      } else {
        alert(t('posts.publishFailed') + result.error);
      }
    } catch (error) {
      console.error('Failed to publish post:', error);
      alert(t('posts.publishError'));
    } finally {
      setPublishingId(null);
    }
  };

  const handleDelete = async (postId: number) => {
    if (!confirm(t('posts.confirmDelete'))) return;

    try {
      const result = await window.api.posts.delete(postId);
      if (result.success) {
        setPosts(posts.filter((p) => p.id !== postId));
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('posts.title')}</h1>
          <p className="text-slate-400 mt-1">{t('posts.subtitle')}</p>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setView('queue')}
          className={`btn ${view === 'queue' ? 'btn-primary' : 'btn-ghost'}`}
        >
          <Clock className="w-4 h-4 mr-2" />
          {t('posts.tabs.queue')}
        </button>
        <button
          onClick={() => setView('history')}
          className={`btn ${view === 'history' ? 'btn-primary' : 'btn-ghost'}`}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          {t('posts.tabs.history')}
        </button>
      </div>

      {/* Posts List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500">
            {view === 'queue'
              ? t('posts.noQueue')
              : t('posts.noHistory')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onPublish={handlePublish}
              onDelete={handleDelete}
              isPublishing={publishingId === post.id}
              t={t}
              locale={i18n.language}
            />
          ))}
        </div>
      )}
    </div>
  );
}
