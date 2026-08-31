import { useTranslation } from '@product-engineer-community-service/i18n';
import { Link } from 'react-router-dom';

import { PageLayout } from '../../../app/PageLayout';

export default function PolicyPage() {
  const { t } = useTranslation('webview');

  const sections = [
    { title: t('legal.privacy.section1_title'), content: t('legal.privacy.section1_content') },
    { title: t('legal.privacy.section2_title'), content: t('legal.privacy.section2_content') },
    { title: t('legal.privacy.section3_title'), content: t('legal.privacy.section3_content') },
    { title: t('legal.privacy.section4_title'), content: t('legal.privacy.section4_content') },
    { title: t('legal.privacy.section5_title'), content: t('legal.privacy.section5_content') },
    { title: t('legal.privacy.section6_title'), content: t('legal.privacy.section6_content') },
    { title: t('legal.privacy.section7_title'), content: t('legal.privacy.section7_content') },
  ];

  return (
    <PageLayout title={t('legal.privacy_title')}>
      <p>{t('legal.privacy.intro')}</p>

      {sections.map((section, i) => (
        <div key={i} className="legal-section">
          <h2>{section.title}</h2>
          <p style={{ whiteSpace: 'pre-line' }}>{section.content}</p>
        </div>
      ))}

      <p className="legal-effective-date">
        {t('legal.effective_date', { date: '2026-03-17' })}
      </p>

      <nav className="nav-links">
        <Link to="/terms">{t('legal.footer_terms')}</Link>
      </nav>
    </PageLayout>
  );
}
