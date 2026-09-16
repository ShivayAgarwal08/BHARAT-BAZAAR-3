import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RouteEffects } from './components/RouteEffects';
import { AppRoutes } from './routes/AppRoutes';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <RouteEffects />
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
