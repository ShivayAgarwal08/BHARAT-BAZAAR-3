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
import { RegistrationFormPage } from '../pages/RegistrationFormPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { AssistedRegistrationPage } from '../pages/AssistedRegistrationPage';
import { UnauthorizedPage } from '../pages/UnauthorizedPage';
import {
  AdminStudentsPage,
  AdminStudentDetailPage,
  AdminAssistancePage,
  AdminUsersPage,
} from '../pages/dashboard/AdminPages';

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
        <Route path="register/artisan" element={<RegistrationFormPage role="artisan" />} />
        <Route path="register/student" element={<RegistrationFormPage role="student" />} />
        <Route path="help-register" element={<AssistedRegistrationPage />} />
        <Route path="unauthorized" element={<UnauthorizedPage />} />
        {(['artisan', 'student'] as const).map((role) => (
          <Route key={role} element={<ProtectedRoute role={role} allowIncomplete />}>
            <Route path={'onboarding/' + role} element={<OnboardingPage role={role} />} />
          </Route>
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      {(['artisan', 'student', 'admin'] as const).map((role) => (
        <Route element={<ProtectedRoute role={role} />} key={role}>
          <Route path={`dashboard/${role}`} element={<DashboardLayout role={role} />}>
            <Route index element={<OverviewPage role={role} />} />
            {role !== 'admin' && (
              <Route path="profile" element={<OnboardingPage role={role} embedded />} />
            )}
            {role === 'admin' && (
              <>
                <Route path="students" element={<AdminStudentsPage />} />
                <Route path="students/:id" element={<AdminStudentDetailPage />} />
                <Route path="assisted-registrations" element={<AdminAssistancePage />} />
                <Route path="artisans" element={<AdminUsersPage artisansOnly />} />
                <Route path="users" element={<AdminUsersPage />} />
              </>
            )}
            {dashboardSections[role]
              .filter(
                (section) =>
                  section.slug &&
                  section.slug !== 'profile' &&
                  !(
                    role === 'admin' &&
                    ['students', 'artisans', 'assisted-registrations'].includes(section.slug)
                  ),
              )
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
