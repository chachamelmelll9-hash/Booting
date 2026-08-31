import { useTranslation } from '@product-engineer-community-service/i18n';
import { Link } from 'react-router-dom';

import { PageLayout } from '../../app/PageLayout';

/**
 * Support page — required by both stores as the "Support URL".
 *
 * Route: /support (public — store reviewers open it without logging in).
 * The contact email comes from VITE_SUPPORT_EMAIL, which `/launch` writes from
 * `docs/store-declarations.yaml` (business.email). Never hard-code a real address
 * here: the value belongs to the declaration file, not to the template.
 */
export default function SupportPage() {
  const { t } = useTranslation('webview');
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL as string | undefined;

  return (
    <PageLayout title={t('support.title')}>
      <p>{t('support.intro')}</p>

      <div className="legal-section">
        <h2>{t('support.contact_title')}</h2>
        {supportEmail ? (
          <p>
            <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
          </p>
        ) : (
          <p>{t('support.contact_missing')}</p>
        )}
      </div>

      <div className="legal-section">
        <h2>{t('support.report_title')}</h2>
        <p style={{ whiteSpace: 'pre-line' }}>{t('support.report_content')}</p>
      </div>

      <nav className="nav-links">
        <Link to="/profile/help/faq">{t('support.faq_link')}</Link>
        <Link to="/privacy">{t('legal.footer_privacy')}</Link>
        <Link to="/terms">{t('legal.footer_terms')}</Link>
      </nav>
    </PageLayout>
  );
}
