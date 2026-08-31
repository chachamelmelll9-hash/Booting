import { useTranslation } from '@product-engineer-community-service/i18n';
import { Link } from 'react-router-dom';

interface PageLayoutProps {
  title: string;
  children: React.ReactNode;
  backTo?: string;
  backLabel?: string;
}

export function PageLayout({ title, children, backTo, backLabel }: PageLayoutProps) {
  const { t } = useTranslation('webview');
  const defaultBackLabel = t('navigation.back');
  return (
    <div className="page-container">
      <header className="page-header">
        {backTo && (
          <Link to={backTo} className="back-link">{backLabel || defaultBackLabel}</Link>
        )}
        <h1>{title}</h1>
      </header>
      <main className="page-content">
        {children}
      </main>
      <footer className="page-footer">
        <Link to="/terms">{t('legal.footer_terms')}</Link>
        <span className="footer-divider">|</span>
        <Link to="/privacy">{t('legal.footer_privacy')}</Link>
      </footer>
    </div>
  );
}

export default PageLayout;
