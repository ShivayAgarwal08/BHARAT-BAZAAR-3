import { createContext } from 'react';
import type { AuthSession, User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  sessionError: unknown;
  acceptSession: (session: AuthSession) => void;
  refreshUser: () => Promise<User>;
  logout: () => Promise<void>;
}
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
