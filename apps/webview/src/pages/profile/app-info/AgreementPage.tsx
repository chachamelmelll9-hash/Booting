import { useTranslation } from '@chachamelmelll9-hash-service/i18n';
import { Link } from 'react-router-dom';

import { PageLayout } from '../../../app/PageLayout';

export default function AgreementPage() {
  const { t } = useTranslation('webview');

  const sections = [
    { title: t('legal.terms.section1_title'), content: t('legal.terms.section1_content') },
    { title: t('legal.terms.section2_title'), content: t('legal.terms.section2_content') },
    { title: t('legal.terms.section3_title'), content: t('legal.terms.section3_content') },
    { title: t('legal.terms.section4_title'), content: t('legal.terms.section4_content') },
    { title: t('legal.terms.section5_title'), content: t('legal.terms.section5_content') },
    { title: t('legal.terms.section6_title'), content: t('legal.terms.section6_content') },
    { title: t('legal.terms.section7_title'), content: t('legal.terms.section7_content') },
    { title: t('legal.terms.section8_title'), content: t('legal.terms.section8_content') },
  ];

  return (
    <PageLayout title={t('legal.terms_title')}>
      <p>{t('legal.terms.intro')}</p>

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
        <Link to="/privacy">{t('legal.footer_privacy')}</Link>
      </nav>
    </PageLayout>
  );
}
