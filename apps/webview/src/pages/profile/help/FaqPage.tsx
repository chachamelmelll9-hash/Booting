import { useTranslation } from '@product-engineer-community-service/i18n';
import { Link } from 'react-router-dom';

import { PageLayout } from '../../../app/PageLayout';

export default function FaqPage() {
  const { t } = useTranslation('webview');

  return (
    <PageLayout title={t('help.faq_title')} backTo="/profile/help/notice" backLabel={t('help.back_to_notice')}>
      <p>{t('help.faq_description')}</p>

      <nav className="nav-links">
        <Link to="/profile/help/notice">{t('help.notice_title')}</Link>
        <Link to="/profile/help/guide">{t('help.guide_title')}</Link>
        <Link to="/profile/help/policy">{t('help.policy_link')}</Link>
      </nav>
    </PageLayout>
  );
}
