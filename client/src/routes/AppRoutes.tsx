import { lazy, Suspense } from 'react';
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
  ArtisanHomePage,
  MyArtisanPage,
  MyGrowthPage,
  MyManagerPage,
  StudentHomePage,
} from '../pages/dashboard/FocusedEngagementPages';
import {
  AdminStudentsPage,
  AdminStudentDetailPage,
  AdminAssistancePage,
  AdminUsersPage,
} from '../pages/dashboard/AdminPages';
import {
  AdminAssignmentPage,
  AdminGrowthRequestDetailPage,
  AdminGrowthRequestsPage,
  ArtisanGrowthRequestsPage,
  ArtisanRequestDetailPage,
  ArtisanRequestFormPage,
  ContractPage,
  DiscoveryPage,
  StudentAssignmentsPage,
  TasksPage,
  MetricsPage,
} from '../pages/dashboard/TrialPages';
const MarketplacePage = lazy(() =>
  import('../pages/dashboard/MarketplacePages').then((module) => ({
    default: module.MarketplacePage,
  })),
);
const StudentInterestPage = lazy(() =>
  import('../pages/dashboard/MarketplacePages').then((module) => ({
    default: module.StudentInterestPage,
  })),
);
const StudentMarketplaceProfilePage = lazy(() =>
  import('../pages/dashboard/MarketplacePages').then((module) => ({
    default: module.StudentMarketplaceProfilePage,
  })),
);
const ArtisanMarketplaceRequestsPage = lazy(() =>
  import('../pages/dashboard/MarketplacePages').then((module) => ({
    default: module.ArtisanMarketplaceRequestsPage,
  })),
);
const PaymentsPage = lazy(() =>
  import('../pages/dashboard/Phase4ToolsPages').then((module) => ({
    default: module.PaymentsPage,
  })),
);
const DisputesPage = lazy(() =>
  import('../pages/dashboard/Phase4ToolsPages').then((module) => ({
    default: module.DisputesPage,
  })),
);
const ContractReviewPage = lazy(() =>
  import('../pages/dashboard/Phase4ToolsPages').then((module) => ({
    default: module.ContractReviewPage,
  })),
);
const CompletionPage = lazy(() =>
  import('../pages/dashboard/Phase4ToolsPages').then((module) => ({
    default: module.CompletionPage,
  })),
);
const ApiListPage = lazy(() =>
  import('../pages/dashboard/Phase4ReadPages').then((m) => ({ default: m.ApiListPage })),
);
const PaidContractDetailPage = lazy(() =>
  import('../pages/dashboard/Phase4ReadPages').then((m) => ({ default: m.PaidContractDetailPage })),
);

export function AppRoutes() {
  return (
    <Suspense
      fallback={
        <p className="loading" role="status">
          Loading…
        </p>
      }
    >
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
              <Route
                index
                element={
                  role === 'artisan' ? (
                    <ArtisanHomePage />
                  ) : role === 'student' ? (
                    <StudentHomePage />
                  ) : (
                    <OverviewPage role={role} />
                  )
                }
              />
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
                  <Route path="growth-requests" element={<AdminGrowthRequestsPage />} />
                  <Route path="growth-requests/:id" element={<AdminGrowthRequestDetailPage />} />
                  <Route path="assignments/:id" element={<AdminAssignmentPage />} />
                  <Route
                    path="paid-assignments"
                    element={
                      <ApiListPage endpoint="/admin/paid-assignments" title="Paid assignments" />
                    }
                  />
                  <Route
                    path="contracts"
                    element={
                      <ApiListPage endpoint="/admin/paid-contracts" title="Paid contracts" />
                    }
                  />
                  <Route
                    path="payments"
                    element={
                      <ApiListPage endpoint="/admin/payment-records" title="Payment records" />
                    }
                  />
                  <Route
                    path="reviews"
                    element={<ApiListPage endpoint="/admin/reviews" title="Reviews" />}
                  />
                  <Route
                    path="completion-requests"
                    element={
                      <ApiListPage endpoint="/admin/completions" title="Completion requests" />
                    }
                  />
                </>
              )}
              {role === 'artisan' && (
                <>
                  <Route path="my-manager" element={<MyManagerPage />} />
                  <Route path="find-manager" element={<MarketplacePage />} />
                  <Route path="find-manager/:id" element={<StudentMarketplaceProfilePage />} />
                  <Route path="my-growth" element={<MyGrowthPage />} />
                  <Route path="my-growth/new" element={<ArtisanRequestFormPage />} />
                  <Route path="help" element={<AssistedRegistrationPage />} />
                  <Route path="growth-requests" element={<ArtisanGrowthRequestsPage />} />
                  <Route path="growth-requests/new" element={<ArtisanRequestFormPage />} />
                  <Route path="growth-requests/:id" element={<ArtisanRequestDetailPage />} />
                  <Route path="contract/:id" element={<ContractPage role="artisan" />} />
                  <Route path="contract/:id/tasks" element={<TasksPage role="artisan" />} />
                  <Route path="contract/:id/metrics" element={<MetricsPage role="artisan" />} />
                  <Route path="marketplace" element={<MarketplacePage />} />
                  <Route path="marketplace/:id" element={<StudentMarketplaceProfilePage />} />
                  <Route path="marketplace-requests" element={<ArtisanMarketplaceRequestsPage />} />
                  <Route path="payments" element={<PaymentsPage role="artisan" />} />
                  <Route path="reviews" element={<ContractReviewPage role="artisan" />} />
                  <Route path="completion" element={<CompletionPage />} />
                  <Route path="disputes" element={<DisputesPage />} />
                  <Route
                    path="paid-contracts"
                    element={
                      <ApiListPage
                        endpoint="/participants/me/paid-contracts"
                        title="Paid contracts"
                      />
                    }
                  />
                  <Route path="paid-contracts/:id" element={<PaidContractDetailPage />} />
                </>
              )}
              {role === 'student' && (
                <>
                  <Route path="my-artisan" element={<MyArtisanPage />} />
                  <Route path="opportunities" element={<StudentInterestPage />} />
                  <Route path="current-artisan" element={<StudentAssignmentsPage />} />
                  <Route path="assignment/:id" element={<DiscoveryPage />} />
                  <Route path="assignment/:id/discovery" element={<DiscoveryPage />} />
                  <Route path="contract/:id" element={<ContractPage role="student" />} />
                  <Route path="contract/:id/tasks" element={<TasksPage role="student" />} />
                  <Route path="contract/:id/metrics" element={<MetricsPage role="student" />} />
                  <Route path="marketplace-requests" element={<StudentInterestPage />} />
                  <Route path="payments" element={<PaymentsPage role="student" />} />
                  <Route path="reviews" element={<ContractReviewPage role="student" />} />
                  <Route path="disputes" element={<DisputesPage />} />
                  <Route
                    path="paid-contracts"
                    element={
                      <ApiListPage
                        endpoint="/participants/me/paid-contracts"
                        title="Paid contracts"
                      />
                    }
                  />
                  <Route path="paid-contracts/:id" element={<PaidContractDetailPage />} />
                  <Route
                    path="portfolio"
                    element={
                      <ApiListPage endpoint="/students/me/portfolio" title="Verified portfolio" />
                    }
                  />
                </>
              )}
              {dashboardSections[role]
                .filter(
                  (section) =>
                    role === 'admin' &&
                    section.slug &&
                    section.slug !== 'profile' &&
                    !(
                      role === 'admin' &&
                      [
                        'students',
                        'artisans',
                        'assisted-registrations',
                        'growth-requests',
                        'payments',
                        'reviews',
                        'disputes',
                      ].includes(section.slug)
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
    </Suspense>
  );
}
