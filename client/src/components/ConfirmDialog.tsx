import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui';
import { ErrorNotice } from './FormControls';
export function ConfirmDialog({
  title,
  children,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  busy: boolean;
  error: unknown;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    titleId = useId();
  const { t } = useTranslation();
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      className="confirm-dialog"
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
        }}
        aria-busy={busy}
      >
        <h2 id={titleId}>{title}</h2>
        <p>{t('p2.confirmStatus')}</p>
        {children}
        <ErrorNotice error={error} />
        <div className="form-actions">
          <Button type="submit" disabled={busy}>
            {t(busy ? 'p2.saving' : 'p2.confirm')}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={onCancel}>
            {t('p2.cancel')}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
