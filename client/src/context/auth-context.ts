import { createContext } from 'react';
import type { MockUser, Role } from '../types';

interface AuthContextValue {
  user: MockUser | null;
  enterPreview: (role: Role) => void;
  leavePreview: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
