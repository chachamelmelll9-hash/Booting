import { useTranslation } from '@product-engineer-community-service/i18n';
import { Link } from 'react-router-dom';

import { PageLayout } from '../../../app/PageLayout';

export default function CompanyPage() {
  const { t } = useTranslation('webview');

  return (
    <PageLayout title={t('app_info.company_title')} backTo="/profile/app-info/agreement" backLabel={t('app_info.back_to_agreement')}>
      <p>{t('app_info.company_description')}</p>

      <nav className="nav-links">
        <Link to="/profile/app-info/agreement">{t('app_info.agreement_link')}</Link>
        <Link to="/profile/help/policy">{t('help.policy_link')}</Link>
      </nav>
    </PageLayout>
  );
}
