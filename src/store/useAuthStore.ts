import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  tenantId: string | null;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

/** Fetch or auto-create user profile in public.profiles */
async function resolveUserProfile(authId: string, email: string): Promise<AuthUser> {
  // Try to fetch existing profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authId)
    .single();

  if (profile) {
    return {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      tenantId: profile.tenant_id,
    };
  }

  // Auto-create profile on first login
  const isSuper = email.toLowerCase().includes('superadmin');

  let tenantId: string | null = null;
  if (!isSuper) {
    const tenantName = `${email.split('@')[0]}'s Photobooth`;
    const { data: tenant, error: tErr } = await supabase
      .from('tenants')
      .insert({ name: tenantName, plan: 'free', status: 'active' })
      .select()
      .single();
    if (tErr) throw new Error(tErr.message);
    tenantId = tenant.id;
  }

  const { data: newProfile, error: uErr } = await supabase
    .from('profiles')
    .insert({
      id: authId,
      email,
      role: isSuper ? 'superadmin' : 'owner',
      tenant_id: tenantId,
    })
    .select()
    .single();

  if (uErr) throw new Error(uErr.message);

  return {
    id: newProfile.id,
    email: newProfile.email,
    role: newProfile.role,
    tenantId: newProfile.tenant_id,
  };
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  login: async (email, password) => {
    // Try sign in first
    let { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // If user doesn't exist, sign them up
    if (signInErr && signInErr.message.toLowerCase().includes('invalid')) {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpErr) throw new Error(signUpErr.message);
      signInData = signUpData;

      // After signup we may need to sign in immediately
      if (!signInData?.session) {
        const { data: reSigned, error: reErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (reErr) throw new Error(reErr.message);
        signInData = reSigned;
      }
    } else if (signInErr) {
      throw new Error(signInErr.message);
    }

    if (!signInData?.user) throw new Error('Login failed. Check credentials.');

    const userProfile = await resolveUserProfile(signInData.user.id, email);
    set({ user: userProfile });
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Server signout may fail (e.g. expired session); clear local state anyway
    }
    set({ user: null });
  },

  hydrate: async () => {
    set({ loading: true });
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      try {
        const userProfile = await resolveUserProfile(session.user.id, session.user.email ?? '');
        set({ user: userProfile, loading: false });
      } catch {
        set({ user: null, loading: false });
      }
    } else {
      set({ user: null, loading: false });
    }

    // Listen for future auth state changes
    supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'SIGNED_OUT') {
        set({ user: null, loading: false });
      } else if (newSession?.user) {
        try {
          const userProfile = await resolveUserProfile(newSession.user.id, newSession.user.email ?? '');
          set({ user: userProfile, loading: false });
        } catch {
          set({ user: null, loading: false });
        }
      }
    });
  },
}));

export default useAuthStore;
