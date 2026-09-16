export type Role = 'artisan' | 'student' | 'admin';
export interface MockUser {
  name: string;
  role: Role;
  initials: string;
}
export interface ContentItem {
  title: string;
  description: string;
}
export interface ApiResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
}
