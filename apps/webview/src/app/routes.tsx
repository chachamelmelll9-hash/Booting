import { useTranslation } from '@chachamelmelll9-hash-service/i18n';
import { lazy, Suspense } from 'react';
import { Link,Route, Routes } from 'react-router-dom';

import { LoadingOverlay } from '../features/loading';
import { SessionGuard } from '../features/session';
import { UnauthorizedPage } from './UnauthorizedPage';

// Profile - Help (pages that exist)
const NoticePage = lazy(() => import('../pages/profile/help/NoticePage'));
const GuidePage = lazy(() => import('../pages/profile/help/GuidePage'));
const FaqPage = lazy(() => import('../pages/profile/help/FaqPage'));
const PolicyPage = lazy(() => import('../pages/profile/help/PolicyPage'));

// Profile - App Info (pages that exist)
const CompanyPage = lazy(() => import('../pages/profile/app-info/CompanyPage'));
const AgreementPage = lazy(() => import('../pages/profile/app-info/AgreementPage'));

// Legal / store-required (public — reviewers open these without logging in)
const SupportPage = lazy(() => import('../pages/legal/SupportPage'));


function HomePage() {
  const { t } = useTranslation('webview');

  return (
    <div style={{ padding: 24, color: '#E2E8F0' }}>
      <h1 style={{ marginBottom: 16 }}>{t('home.title')}</h1>
      <p style={{ color: '#CBD5E1', marginBottom: 24 }}>
        {t('home.description')}
      </p>
      <nav className="nav-links">
        <h3 style={{ marginTop: 16, marginBottom: 8 }}>{t('home.section_profile')}</h3>
        <Link to="/profile/help/notice">{t('home.help_center')}</Link>
        <Link to="/profile/app-info/company">{t('home.app_info')}</Link>
      </nav>
    </div>
  );
}

function NotFoundPage() {
  const { t } = useTranslation('webview');

  return (
    <div style={{ padding: 24, color: '#E2E8F0' }}>
      <h1>{t('not_found.title')}</h1>
      <p style={{ color: '#CBD5E1', marginTop: 16 }}>{t('not_found.message')}</p>
      <Link to="/" style={{ color: '#2e78b7', marginTop: 16, display: 'inline-block' }}>
        {t('not_found.back_home')}
      </Link>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingOverlay show={true} />}>
      <Routes>
        {/* Public routes */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/privacy" element={<PolicyPage />} />
        <Route path="/terms" element={<AgreementPage />} />
        <Route path="/support" element={<SupportPage />} />

        {/* Protected routes */}
        <Route path="/" element={<SessionGuard><HomePage /></SessionGuard>} />

        {/* Profile - Help */}
        <Route path="/profile/help/notice" element={<SessionGuard><NoticePage /></SessionGuard>} />
        <Route path="/profile/help/guide" element={<SessionGuard><GuidePage /></SessionGuard>} />
        <Route path="/profile/help/faq" element={<SessionGuard><FaqPage /></SessionGuard>} />
        <Route path="/profile/help/policy" element={<SessionGuard><PolicyPage /></SessionGuard>} />

        {/* Profile - App Info */}
        <Route path="/profile/app-info/company" element={<SessionGuard><CompanyPage /></SessionGuard>} />
        <Route path="/profile/app-info/agreement" element={<SessionGuard><AgreementPage /></SessionGuard>} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
