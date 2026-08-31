import { useTranslation } from '@product-engineer-community-service/i18n';
import { Link } from 'react-router-dom';

import { PageLayout } from '../../../app/PageLayout';

export default function NoticePage() {
  const { t } = useTranslation('webview');

  return (
    <PageLayout title={t('help.notice_title')}>
      <p>{t('help.notice_description')}</p>

      <nav className="nav-links">
        <Link to="/profile/help/guide">{t('help.guide_title')}</Link>
        <Link to="/profile/help/faq">{t('help.faq_title')}</Link>
        <Link to="/profile/help/policy">{t('help.policy_link')}</Link>
      </nav>
    </PageLayout>
  );
}
