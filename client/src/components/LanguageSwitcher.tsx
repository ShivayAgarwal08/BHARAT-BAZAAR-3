import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  return (
    <label className="language-switcher">
      <Languages size={18} aria-hidden="true" />
      <span className="sr-only">{t('common.language')}</span>
      <select
        value={i18n.resolvedLanguage}
        onChange={(event) => void i18n.changeLanguage(event.target.value)}
      >
        <option value="en">English</option>
        <option value="hi">हिन्दी</option>
      </select>
    </label>
  );
}
