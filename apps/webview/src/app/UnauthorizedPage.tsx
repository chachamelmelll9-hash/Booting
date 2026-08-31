import { useTranslation } from '@product-engineer-community-service/i18n';
import { Link } from 'react-router-dom';

export function UnauthorizedPage() {
  const { t } = useTranslation('webview');

  return (
    <div className="auth-error">
      <h2>{t('unauthorized.title')}</h2>
      <p>{t('unauthorized.message')}</p>
      <Link to="/" style={{ color: '#2e78b7', marginTop: 16 }}>
        {t('unauthorized.go_home')}
      </Link>
    </div>
  );
}

export default UnauthorizedPage;
