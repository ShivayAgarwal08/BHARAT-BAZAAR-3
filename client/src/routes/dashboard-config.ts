import {
  BarChart3,
  BriefcaseBusiness,
  Compass,
  FileCheck2,
  FileText,
  GraduationCap,
  Handshake,
  HelpCircle,
  LayoutDashboard,
  ListTodo,
  MessageSquareWarning,
  ReceiptIndianRupee,
  Sprout,
  Star,
  Target,
  TrendingUp,
  Users,
  UserRoundPlus,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '../types';

export interface DashboardSection {
  slug: string;
  label: string;
  icon: LucideIcon;
}

const overview: DashboardSection = { slug: '', label: 'overview', icon: LayoutDashboard };
const payments: DashboardSection = {
  slug: 'payments',
  label: 'payments',
  icon: ReceiptIndianRupee,
};
const reviews: DashboardSection = { slug: 'reviews', label: 'reviews', icon: Star };

// The sidebar, breadcrumbs and child routes all use this single source of truth.
export const dashboardSections: Record<Role, DashboardSection[]> = {
  artisan: [
    overview,
    { slug: 'profile', label: 'profile', icon: Users },
    { slug: 'my-manager', label: 'myManager', icon: Handshake },
    { slug: 'growth-requests', label: 'growthRequests', icon: Sprout },
    { slug: 'contract', label: 'contract', icon: FileText },
    { slug: 'milestones', label: 'milestones', icon: Target },
    { slug: 'business-growth', label: 'businessGrowth', icon: TrendingUp },
    payments,
    reviews,
    { slug: 'get-help', label: 'getHelp', icon: HelpCircle },
  ],
  student: [
    overview,
    { slug: 'profile', label: 'profile', icon: Users },
    { slug: 'current-artisan', label: 'currentArtisan', icon: Handshake },
    { slug: 'discovery', label: 'discovery', icon: Compass },
    { slug: 'contracts', label: 'contracts', icon: FileText },
    { slug: 'tasks', label: 'tasks', icon: ListTodo },
    { slug: 'progress-reports', label: 'progressReports', icon: BarChart3 },
    payments,
    { slug: 'completed-projects', label: 'completedProjects', icon: FileCheck2 },
    { slug: 'portfolio', label: 'portfolio', icon: BriefcaseBusiness },
    reviews,
  ],
  admin: [
    overview,
    { slug: 'artisans', label: 'artisans', icon: Users },
    { slug: 'assisted-registrations', label: 'assistedRegistrations', icon: UserRoundPlus },
    { slug: 'students', label: 'students', icon: GraduationCap },
    { slug: 'growth-requests', label: 'growthRequests', icon: Sprout },
    { slug: 'matching', label: 'matching', icon: Handshake },
    { slug: 'contracts', label: 'contracts', icon: FileText },
    payments,
    { slug: 'disputes', label: 'disputes', icon: MessageSquareWarning },
    reviews,
  ],
};
