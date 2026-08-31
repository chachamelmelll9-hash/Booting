import { useTranslation } from '@chachamelmelll9-hash-service/i18n';
import { Link } from 'react-router-dom';

import { PageLayout } from '../../../app/PageLayout';

export default function GuidePage() {
  const { t } = useTranslation('webview');

  return (
    <PageLayout title={t('help.guide_title')} backTo="/profile/help/notice" backLabel={t('help.back_to_notice')}>
      <p>{t('help.guide_description')}</p>

      <nav className="nav-links">
        <Link to="/profile/help/notice">{t('help.notice_title')}</Link>
        <Link to="/profile/help/faq">{t('help.faq_title')}</Link>
        <Link to="/profile/help/policy">{t('help.policy_link')}</Link>
      </nav>
    </PageLayout>
  );
}
