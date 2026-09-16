import { Route, Routes } from 'react-router-dom';
import { PublicLayout } from '../layouts/PublicLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { LandingPage } from '../pages/LandingPage';
import { AboutPage } from '../pages/AboutPage';
import { AudiencePage } from '../pages/AudiencePage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { OverviewPage } from '../pages/dashboard/OverviewPage';
import { PlaceholderPage } from '../pages/dashboard/PlaceholderPage';
import { DashboardNotFound } from '../pages/dashboard/DashboardNotFound';
import { ProtectedRoute } from './ProtectedRoute';
import { dashboardSections } from './dashboard-config';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="artisans" element={<AudiencePage audience="artisan" />} />
        <Route path="students" element={<AudiencePage audience="student" />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      {(['artisan', 'student', 'admin'] as const).map((role) => (
        <Route element={<ProtectedRoute role={role} />} key={role}>
          <Route path={`dashboard/${role}`} element={<DashboardLayout role={role} />}>
            <Route index element={<OverviewPage role={role} />} />
            {dashboardSections[role]
              .filter((section) => section.slug)
              .map((section) => (
                <Route
                  key={section.slug}
                  path={section.slug}
                  element={<PlaceholderPage role={role} section={section} />}
                />
              ))}
            <Route path="*" element={<DashboardNotFound role={role} />} />
          </Route>
        </Route>
      ))}
    </Routes>
  );
}
