import { useState, type ReactNode } from 'react';
import { AuthContext } from './auth-context';
import type { MockUser, Role } from '../types';

const mockUsers: Record<Role, MockUser> = {
  artisan: { name: 'Kavita Sharma', initials: 'KS', role: 'artisan' },
  student: { name: 'Aarav Mehta', initials: 'AM', role: 'student' },
  admin: { name: 'Platform Admin', initials: 'BB', role: 'admin' },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  // Deliberately in memory. Refreshing ends the preview; no credentials or tokens exist.
  const [user, setUser] = useState<MockUser | null>(null);
  return (
    <AuthContext.Provider
      value={{
        user,
        enterPreview: (role) => setUser(mockUsers[role]),
        leavePreview: () => setUser(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
