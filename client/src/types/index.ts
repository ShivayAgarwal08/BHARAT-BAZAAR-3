export type Role = 'artisan' | 'student' | 'admin';
export type ApiRole = 'ARTISAN' | 'STUDENT' | 'ADMIN';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type AssistedStatus = 'PENDING' | 'CONTACTED' | 'COMPLETED' | 'CANCELLED';
export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  role: ApiRole;
  accountStatus: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  preferredLanguage: 'EN' | 'HI';
  fullName: string;
  onboardingCompleted: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface ContentItem {
  title: string;
  description: string;
}
export interface ApiResponse<T = undefined> {
  success: boolean;
  message: string;
  data: T;
}
export interface AuthSession {
  token: string;
  user: User;
}
export interface Skill {
  id: string;
  name: string;
  slug: string;
  category: string;
  active: boolean;
}
export interface SelectedSkill {
  skillId: string;
  proficiencyLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  name?: string;
  slug?: string;
  category?: string;
}
export interface Profile {
  id: string;
  userId: string;
  fullName: string;
  onboardingCompleted: boolean;
  languages: string[];
  verificationStatus?: VerificationStatus;
  verificationNotes?: string | null;
  skills?: SelectedSkill[];
  createdAt: string;
  updatedAt: string;
  businessName?: string | null;
  craftCategory?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  biography?: string | null;
  currentMonthlyRevenue?: string | null;
  currentMonthlyOrders?: number | null;
  onlinePresence?: string | null;
  businessProblems?: string | null;
  college?: string | null;
  course?: string | null;
  studyYear?: number | null;
  weeklyAvailabilityHours?: number | null;
  expectedMonthlyRate?: string | null;
  portfolioUrl?: string | null;
}
export interface StudentRecord {
  profile: Profile;
  user: User;
  skills?: SelectedSkill[];
}
export interface AssistedRequest {
  id: string;
  name: string;
  phone: string;
  preferredLanguage: 'EN' | 'HI';
  preferredCallTime: string;
  city: string;
  state: string;
  notes: string | null;
  status: AssistedStatus;
  assignedAdminId: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
export interface AdminCounts {
  totalArtisans: number;
  totalStudents: number;
  pendingStudentVerifications: number;
  pendingAssistedRegistrations: number;
}
