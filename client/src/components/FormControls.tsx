import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui';
import { errorCode, validationFields } from '../services/api';

export function ErrorNotice({ error }: { error: unknown }) {
  const { t } = useTranslation();
  if (!error) return null;
  const code = errorCode(error);
  return (
    <div className="form-error" role="alert">
      <p>{t('p2.errors.' + code, { defaultValue: t('p2.errors.REQUEST_FAILED') })}</p>
      {validationFields(error).map((field) => (
        <p key={field}>
          {t('p2.fields.' + field, { defaultValue: t('p2.information') })}: {t('p2.invalid')}
        </p>
      ))}
    </div>
  );
}
export function FormField({
  name,
  label,
  hint,
  kind = 'input',
  children,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label: string;
  hint?: string;
  kind?: 'input' | 'textarea' | 'select';
  children?: ReactNode;
}) {
  const id = useId();
  const { t } = useTranslation();
  const shared = {
    id,
    name,
    required: props.required,
    disabled: props.disabled,
    value: props.value as string | undefined,
    defaultValue: props.defaultValue as string | undefined,
    'aria-describedby': hint ? id + '-hint' : undefined,
    onInvalid: (
      event: React.InvalidEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    ) => event.currentTarget.setCustomValidity(t('p2.invalid')),
    onInput: (event: React.FormEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      event.currentTarget.setCustomValidity(''),
  };
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {props.required ? ' *' : ''}
      </label>
      {kind === 'textarea' ? (
        <textarea
          {...shared}
          rows={4}
          minLength={props.minLength}
          maxLength={props.maxLength}
          onChange={(event) =>
            props.onChange?.(event as unknown as React.ChangeEvent<HTMLInputElement>)
          }
        />
      ) : kind === 'select' ? (
        <select
          {...shared}
          onChange={(event) =>
            props.onChange?.(event as unknown as React.ChangeEvent<HTMLInputElement>)
          }
        >
          {children}
        </select>
      ) : (
        <input {...props} {...shared} />
      )}
      {hint && (
        <p className="field-hint" id={id + '-hint'}>
          {hint}
        </p>
      )}
    </div>
  );
}
export function FormActions({ busy, children }: { busy: boolean; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="form-actions">
      <Button type="submit" disabled={busy}>
        {busy ? t('p2.saving') : children}
      </Button>
    </div>
  );
}
export function Pagination({
  page,
  total,
  limit,
  onPage,
}: {
  page: number;
  total: number;
  limit: number;
  onPage: (page: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <nav className="pagination" aria-label={t('p2.pagination')}>
      <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        {t('p2.previous')}
      </Button>
      <span>{t('p2.pageOf', { page, pages: Math.max(1, Math.ceil(total / limit)) })}</span>
      <Button variant="secondary" disabled={page * limit >= total} onClick={() => onPage(page + 1)}>
        {t('p2.next')}
      </Button>
    </nav>
  );
}
