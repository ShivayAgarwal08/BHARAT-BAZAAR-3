import type { Role, User } from '../types';
export function routeRole(user: User): Role {
  return user.role.toLowerCase() as Role;
}
export function homeFor(user: User) {
  const role = routeRole(user);
  return role !== 'admin' && !user.onboardingCompleted
    ? '/onboarding/' + role
    : '/dashboard/' + role;
}
