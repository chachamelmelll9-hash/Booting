import { useTranslation } from '@product-engineer-community-service/i18n';
import { Navigate, useLocation } from 'react-router-dom';

import { LoadingOverlay } from '../../loading';
import { useBridge } from '../lib/useBridge';
import { useSession } from '../model/useSession';

interface SessionGuardProps {
  children: React.ReactElement;
}

export function SessionGuard({ children }: SessionGuardProps) {
  const { t } = useTranslation('webview');
  const { isAuthenticated, isInitialized } = useSession();
  const { isInWebView } = useBridge();
  const location = useLocation();

  if (!isInitialized) {
    return <LoadingOverlay show={true} />;
  }

  // WebView 환경에서 미인증 시
  if (isInWebView && !isAuthenticated) {
    return (
      <div className="auth-error">
        <h2>{t('unauthorized.title')}</h2>
        <p>{t('session.required')}</p>
        <p>{t('session.login_required_message')}</p>
      </div>
    );
  }

  // 브라우저 직접 접근 시 (개발용)
  if (!isInWebView && !isAuthenticated) {
    // 개발 환경에서는 허용하거나 로그인 페이지로 리다이렉트
    if (import.meta.env.DEV) {
      // 개발 중에는 그냥 보여줌
      return children;
    }
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  return children;
}
