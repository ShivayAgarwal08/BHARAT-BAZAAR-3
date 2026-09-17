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
export type GrowthRequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'STUDENT_ASSIGNED'
  | 'DISCOVERY_IN_PROGRESS'
  | 'CONTRACT_PENDING'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED';
export interface GrowthRequest {
  id: string;
  title: string;
  problemDescription: string;
  preferredLanguage: 'EN' | 'HI';
  preferredDurationMonths: number;
  status: GrowthRequestStatus;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface GrowthRequestDetail {
  request: GrowthRequest;
  skills: Skill[];
  assignment: Assignment | null;
  discovery: DiscoveryReport | null;
  contract: TrialContract | null;
}
export interface Assignment {
  id: string;
  growthRequestId: string;
  artisanProfileId: string;
  studentProfileId: string;
  status: string;
  assignedAt: string;
  studentAcceptedAt: string | null;
}
export interface DiscoveryReport {
  id: string;
  assignmentId: string;
  status: string;
  businessSummary: string;
  identifiedProblems: string;
  recommendedServices: string;
  proposedDeliverables: string;
  proposedDurationMonths: number;
  knownConstraints: string;
  successMeasurementPlan: string;
  additionalNotes: string | null;
  adminFeedback: string | null;
}
export interface TrialContract {
  id: string;
  assignmentId: string;
  title: string;
  status: string;
  version: number;
  problemStatement: string;
  responsibilities: string;
  deliverables: string;
  growthTargets: string;
  exclusions: string;
  startDate: string;
  endDate: string;
  artisanAcceptedVersion: number | null;
  studentAcceptedVersion: number | null;
}
export interface TrialTask {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: string;
  submissionNotes: string | null;
  artisanFeedback: string | null;
}
export interface TrialMilestone {
  id: string;
  title: string;
  description: string;
  sequence: number;
  dueDate: string;
  status: string;
  tasks: TrialTask[];
}

export interface BusinessMetric {
  id: string;
  type: 'BASELINE' | 'PROGRESS' | 'FINAL';
  measurementDate: string;
  monthlyRevenue: string | null;
  monthlyOrders: number | null;
  onlineOrders: number | null;
  socialFollowers: number | null;
  customerEnquiries: number | null;
  productsListedOnline: number | null;
  notes: string | null;
}

export interface EngagementContract extends TrialContract {
  contractType: 'FREE_TRIAL' | 'PAID';
  artisanPaymentAmount: string;
  platformStudentStipend: string | null;
}

export interface CurrentEngagement {
  assignment: Assignment & { type: 'FREE_TRIAL' | 'PAID' };
  artisan: Profile;
  student: Profile;
  request: GrowthRequest | null;
  discovery: DiscoveryReport | null;
  contract: EngagementContract | null;
  milestones: TrialMilestone[];
  metrics: BusinessMetric[];
}
