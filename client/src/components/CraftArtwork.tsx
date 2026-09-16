import { ArrowUpRight, Handshake } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import craftStudio from '../assets/craft-studio.svg';

export function CraftArtwork({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className={`craft-artwork ${compact ? 'craft-compact' : ''}`}>
      <div className="artwork-frame">
        <img
          src={craftStudio}
          width="600"
          height="640"
          alt={t('landing.imageAlt')}
          fetchPriority={compact ? 'auto' : 'high'}
        />
        <div className="artwork-caption">
          <span>
            <small>{t('landing.artSubcaption')}</small>
            <strong>{t('landing.artCaption')}</strong>
          </span>
          <ArrowUpRight size={24} aria-hidden="true" />
        </div>
      </div>
      {!compact && (
        <div className="partnership-note">
          <span className="partnership-icon">
            <Handshake size={25} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <span>
            <strong>{t('landing.floatTitle')}</strong>
            <small>{t('landing.floatText')}</small>
          </span>
          <span className="connection-dot" />
        </div>
      )}
    </div>
  );
}
