import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { useTranslation } from '../utils/translations';

export const Layout = ({ children }) => {
  const { user, signOut } = useAuth();
  const { lang, toggleLang, toggleTheme } = useApp();
  const t = useTranslation(lang);

  return (
    <>
      <header className="logo-bar">
        <Link to="/" className="logo-link">
          <img src="/logo/logo.svg" alt="Logo" className="logo-image" />
          <div className="logo-text">
            <span className="logo-text-en">{t('logoTextEn')}</span>
            <span className="logo-text-sq">{t('logoTextSq')}</span>
          </div>
        </Link>
        <div className="logo-bar-controls">
          <button type="button" className="icon-button" onClick={toggleLang} title="Language" aria-label="Toggle Language">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </button>
          <label className="theme-switch" title="Toggle Theme">
            <input type="checkbox" className="theme-switch-input" checked={!document.documentElement.classList.contains('dark')} onChange={toggleTheme} />
            <span className="theme-switch-container"><span className="theme-switch-toggle" /></span>
          </label>
          {user && (
            <button type="button" className="icon-button" onClick={signOut} title={t('logout')}>{t('logout')}</button>
          )}
        </div>
      </header>
      <main>{children}</main>
    </>
  );
};
