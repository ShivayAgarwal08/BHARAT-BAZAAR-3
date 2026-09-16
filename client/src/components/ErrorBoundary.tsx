import { Component, type ReactNode } from 'react';
import i18n from '../i18n';

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    if (import.meta.env.DEV) console.error('Bharat Bazaar could not render this page.');
  }
  render() {
    if (this.state.hasError)
      return (
        <main className="error-page">
          <h1>{i18n.t('error.title')}</h1>
          <p>{i18n.t('error.text')}</p>
          <button className="button button-primary" onClick={() => window.location.reload()}>
            {i18n.t('error.reload')}
          </button>
        </main>
      );
    return this.props.children;
  }
}
