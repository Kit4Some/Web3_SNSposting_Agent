import { useState, useEffect } from 'react';
import { RefreshCw, Play, Pause, Bell } from 'lucide-react';

interface SchedulerStatus {
  newsCollectionEnabled: boolean;
  postingEnabled: boolean;
  nextNewsCollection?: string;
  nextPosting?: string;
}

export default function Header() {
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const result = await window.api.scheduler.getStatus();
      if (result.success) {
        setStatus(result.data);
      }
    } catch (error) {
      console.error('Failed to load scheduler status:', error);
    }
  };

  const handleCollectNews = async () => {
    setIsCollecting(true);
    try {
      await window.api.scheduler.triggerNewsCollection();
      loadStatus();
    } catch (error) {
      console.error('Failed to collect news:', error);
    } finally {
      setIsCollecting(false);
    }
  };

  const handleToggleScheduler = async () => {
    try {
      if (status?.newsCollectionEnabled) {
        await window.api.scheduler.stop();
      } else {
        await window.api.scheduler.start();
      }
      loadStatus();
    } catch (error) {
      console.error('Failed to toggle scheduler:', error);
    }
  };

  return (
    <header className="h-14 bg-dark-card border-b border-dark-border px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              status?.newsCollectionEnabled ? 'bg-green-500' : 'bg-slate-500'
            }`}
          />
          <span className="text-sm text-slate-400">
            {status?.newsCollectionEnabled ? '자동화 활성' : '자동화 비활성'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Collect news button */}
        <button
          onClick={handleCollectNews}
          disabled={isCollecting}
          className="btn-ghost flex items-center gap-2"
        >
          <RefreshCw
            className={`w-4 h-4 ${isCollecting ? 'animate-spin' : ''}`}
          />
          <span className="text-sm">뉴스 수집</span>
        </button>

        {/* Toggle scheduler */}
        <button
          onClick={handleToggleScheduler}
          className="btn-ghost flex items-center gap-2"
        >
          {status?.newsCollectionEnabled ? (
            <>
              <Pause className="w-4 h-4" />
              <span className="text-sm">중지</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span className="text-sm">시작</span>
            </>
          )}
        </button>

        {/* Notifications */}
        <button className="btn-ghost p-2">
          <Bell className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
