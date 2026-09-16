import { ArrowRight, LoaderCircle, Sprout, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, type LinkProps } from 'react-router-dom';
import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'light' | 'ghost';
export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={`button button-${variant} ${className}`} {...props} />;
}
export function ButtonLink({
  variant = 'primary',
  className = '',
  children,
  arrow = false,
  ...props
}: LinkProps & { variant?: Variant; arrow?: boolean }) {
  return (
    <Link className={`button button-${variant} ${className}`} {...props}>
      {children}
      {arrow && <ArrowRight size={17} aria-hidden="true" />}
    </Link>
  );
}
export function TextLink({ children, ...props }: LinkProps) {
  return (
    <Link className="text-link" {...props}>
      {children}
      <ArrowRight size={17} aria-hidden="true" />
    </Link>
  );
}
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}
export function Badge({
  children,
  tone = 'warm',
}: {
  children: ReactNode;
  tone?: 'warm' | 'green' | 'indigo';
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function Input({
  label,
  hint,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <input id={inputId} aria-describedby={hint ? `${inputId}-hint` : undefined} {...props} />
      {hint && (
        <p id={`${inputId}-hint`} className="field-hint">
          {hint}
        </p>
      )}
    </div>
  );
}
export function IconTile({
  icon: Icon,
  tone = 'warm',
}: {
  icon: LucideIcon;
  tone?: 'warm' | 'green' | 'indigo';
}) {
  return (
    <span className={`icon-tile icon-${tone}`}>
      <Icon size={23} strokeWidth={1.6} aria-hidden="true" />
    </span>
  );
}
export function EmptyState({
  title,
  description,
  icon: Icon = Sprout,
  children,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon size={38} strokeWidth={1.3} aria-hidden="true" />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Loading() {
  const { t } = useTranslation();
  return (
    <div className="loading" role="status">
      <LoaderCircle className="loading-icon" size={24} aria-hidden="true" />
      <span>{t('common.loading')}</span>
    </div>
  );
}
