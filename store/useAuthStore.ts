import { create } from 'zustand';
import { login as apiLogin } from '../lib/api';

// ─── Owner-dashboard auth store ───────────────────────────────────────────────
// Holds the signed session token issued by /api/auth. Persisted to localStorage
// on web so a refresh keeps the owner logged in. Token is verified server-side on
// every dashboard request — this store is just convenience state.

const STORAGE_KEY = 'rw_dashboard_session';

interface Session {
  token: string;
  slug: string;
  restaurantName: string;
}

interface AuthState {
  token: string | null;
  slug: string | null;
  restaurantName: string | null;
  loginError: string | null;
  isLoggingIn: boolean;

  login: (slug: string, password: string) => Promise<boolean>;
  logout: () => void;
}

// Read any persisted session synchronously at module load (web only).
function readStoredSession(): Session | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function persistSession(session: Session | null): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  else window.localStorage.removeItem(STORAGE_KEY);
}

const stored = readStoredSession();

export const useAuthStore = create<AuthState>((set) => ({
  token: stored?.token ?? null,
  slug: stored?.slug ?? null,
  restaurantName: stored?.restaurantName ?? null,
  loginError: null,
  isLoggingIn: false,

  login: async (slug, password) => {
    set({ isLoggingIn: true, loginError: null });
    try {
      const res = await apiLogin(slug, password);
      const session: Session = {
        token: res.token,
        slug: res.slug,
        restaurantName: res.restaurant_name,
      };
      persistSession(session);
      set({ ...session, isLoggingIn: false });
      return true;
    } catch (err) {
      set({
        isLoggingIn: false,
        loginError: err instanceof Error ? err.message : 'Échec de la connexion.',
      });
      return false;
    }
  },

  logout: () => {
    persistSession(null);
    set({ token: null, slug: null, restaurantName: null, loginError: null });
  },
}));
