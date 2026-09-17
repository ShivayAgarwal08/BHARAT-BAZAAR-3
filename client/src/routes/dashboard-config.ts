import {
  BriefcaseBusiness,
  FileCheck2,
  FileText,
  GraduationCap,
  Handshake,
  HelpCircle,
  LayoutDashboard,
  MessageSquareWarning,
  ReceiptIndianRupee,
  Sprout,
  Star,
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
    { ...overview, label: 'home' },
    { slug: 'my-manager', label: 'myManager', icon: Handshake },
    { slug: 'find-manager', label: 'findManager', icon: GraduationCap },
    { slug: 'my-growth', label: 'myGrowth', icon: TrendingUp },
    { slug: 'profile', label: 'profile', icon: Users },
    { slug: 'help', label: 'help', icon: HelpCircle },
  ],
  student: [
    { ...overview, label: 'home' },
    { slug: 'my-artisan', label: 'myArtisan', icon: Handshake },
    { slug: 'opportunities', label: 'opportunities', icon: BriefcaseBusiness },
    { slug: 'portfolio', label: 'portfolio', icon: BriefcaseBusiness },
    { slug: 'profile', label: 'profile', icon: Users },
  ],
  admin: [
    overview,
    { slug: 'artisans', label: 'artisans', icon: Users },
    { slug: 'assisted-registrations', label: 'assistedRegistrations', icon: UserRoundPlus },
    { slug: 'students', label: 'students', icon: GraduationCap },
    { slug: 'growth-requests', label: 'growthRequests', icon: Sprout },
    { slug: 'matching', label: 'matching', icon: Handshake },
    { slug: 'paid-assignments', label: 'paidAssignments', icon: Handshake },
    { slug: 'contracts', label: 'contracts', icon: FileText },
    payments,
    { slug: 'disputes', label: 'disputes', icon: MessageSquareWarning },
    reviews,
    { slug: 'completion-requests', label: 'completionRequests', icon: FileCheck2 },
  ],
};
