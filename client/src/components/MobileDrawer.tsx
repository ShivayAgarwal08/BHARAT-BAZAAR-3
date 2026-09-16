import { Menu, X } from 'lucide-react';
import { useId, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export function MobileDrawer({ title, children }: { title: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { t } = useTranslation();
  const close = () => dialog.current?.close();
  return (
    <>
      <button
        type="button"
        className="icon-button mobile-menu-trigger"
        aria-label={t('common.menu')}
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        <Menu size={23} aria-hidden="true" />
      </button>
      <dialog
        className="mobile-drawer"
        ref={dialog}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div
          className="drawer-inner"
          onClick={(event) => {
            if (event.target instanceof Element && event.target.closest('a[href]')) close();
          }}
        >
          <div className="drawer-heading">
            <span id={titleId}>{title}</span>
            <button
              className="icon-button"
              type="button"
              onClick={close}
              aria-label={t('common.close')}
            >
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          {children}
        </div>
      </dialog>
    </>
  );
}
