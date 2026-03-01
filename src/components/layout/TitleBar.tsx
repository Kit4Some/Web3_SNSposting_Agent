import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, Square, X, Copy } from 'lucide-react';

export default function TitleBar() {
  const { t } = useTranslation();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Listen for maximize/unmaximize events
    const handleMaximizeChange = (_event: any, maximized: boolean) => {
      setIsMaximized(maximized);
    };

    window.api?.app?.onMaximizeChange?.(handleMaximizeChange);

    return () => {
      window.api?.app?.offMaximizeChange?.(handleMaximizeChange);
    };
  }, []);

  const handleMinimize = () => {
    window.api?.app?.minimize?.();
  };

  const handleMaximize = () => {
    window.api?.app?.toggleMaximize?.();
  };

  const handleClose = () => {
    window.api?.app?.close?.();
  };

  return (
    <div className="titlebar">
      <div className="titlebar-drag">
        <div className="titlebar-icon">
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
            <path
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="titlebar-title">{t('app.name')}</span>
      </div>
      <div className="titlebar-controls">
        <button
          onClick={handleMinimize}
          className="titlebar-button titlebar-button-minimize"
          title={t('common.minimize')}
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={handleMaximize}
          className="titlebar-button titlebar-button-maximize"
          title={isMaximized ? t('common.restore') : t('common.maximize')}
        >
          {isMaximized ? (
            <Copy className="w-3.5 h-3.5" />
          ) : (
            <Square className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          onClick={handleClose}
          className="titlebar-button titlebar-button-close"
          title={t('common.close')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
