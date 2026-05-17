import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  tenantId: string | null;
}

type SignupOptions =
  | { mode: "create"; tenantName: string }
  | { mode: "join"; referralCode: string };

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, options: SignupOptions) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

function generateReferralCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Fetch or auto-create user profile in public.profiles */
async function resolveUserProfile(
  authId: string,
  email: string,
  metadata?: Record<string, any>
): Promise<AuthUser> {
  // Try to fetch existing profile
  const { data: profile } = await supabase
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

  // No profile yet — create one based on signup metadata or default behavior
  const signupMode = metadata?.signup_mode as string | undefined;

  if (signupMode === "join" && metadata?.referral_code) {
    // Join existing tenant by referral code
    const { data: tenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('referral_code', (metadata.referral_code as string).toUpperCase())
      .single();

    if (tenant) {
      const { data: newProfile, error } = await supabase
        .from('profiles')
        .insert({ id: authId, email, role: 'admin', tenant_id: tenant.id })
        .select()
        .single();

      if (newProfile) {
        return {
          id: newProfile.id,
          email: newProfile.email,
          role: newProfile.role,
          tenantId: newProfile.tenant_id,
        };
      }

      // Duplicate key (race condition) — fetch the profile created by the concurrent call
      if (error?.code === '23505') {
        const { data: existing } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authId)
          .single();
        if (existing) {
          return {
            id: existing.id,
            email: existing.email,
            role: existing.role,
            tenantId: existing.tenant_id,
          };
        }
      }
    }
    // If referral code was truly invalid, fall through to create new tenant
  }

  // Default: create new tenant + owner profile
  const tenantName = (metadata?.tenant_name as string) || `${email.split('@')[0]}'s Photobooth`;
  const referralCode = generateReferralCode();
  const { data: tenant, error: tErr } = await supabase
    .from('tenants')
    .insert({ name: tenantName, plan: 'free', status: 'active', referral_code: referralCode })
    .select()
    .single();
  if (tErr) throw new Error(tErr.message);

  const { data: newProfile, error: uErr } = await supabase
    .from('profiles')
    .insert({ id: authId, email, role: 'owner', tenant_id: tenant.id })
    .select()
    .single();

  if (newProfile) {
    return {
      id: newProfile.id,
      email: newProfile.email,
      role: newProfile.role,
      tenantId: newProfile.tenant_id,
    };
  }

  // Duplicate key (race condition) — fetch the profile created by the concurrent call
  if (uErr?.code === '23505') {
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authId)
      .single();
    if (existing) {
      return {
        id: existing.id,
        email: existing.email,
        role: existing.role,
        tenantId: existing.tenant_id,
      };
    }
  }

  throw new Error(uErr?.message || 'Failed to create profile');
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Login failed. Check credentials.');

    const userProfile = await resolveUserProfile(
      data.user.id,
      email,
      data.user.user_metadata
    );
    set({ user: userProfile });
  },

  signup: async (email, password, options) => {
    const metadata: Record<string, string> = { signup_mode: options.mode };
    if (options.mode === "create") metadata.tenant_name = options.tenantName;
    if (options.mode === "join") metadata.referral_code = options.referralCode;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Signup failed.');

    if (!data.session) {
      throw new Error('Check your email to confirm your account, then sign in.');
    }

    // Don't call resolveUserProfile here — onAuthStateChange in hydrate()
    // fires on SIGNED_IN and handles profile creation using user_metadata.
    // This avoids a race condition where both calls create duplicate tenants.
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
        const userProfile = await resolveUserProfile(
          session.user.id,
          session.user.email ?? '',
          session.user.user_metadata
        );
        set({ user: userProfile, loading: false });
      } catch {
        set({ user: null, loading: false });
      }
    } else {
      set({ user: null, loading: false });
    }

    supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'SIGNED_OUT') {
        set({ user: null, loading: false });
      } else if (newSession?.user) {
        try {
          const userProfile = await resolveUserProfile(
            newSession.user.id,
            newSession.user.email ?? '',
            newSession.user.user_metadata
          );
          set({ user: userProfile, loading: false });
        } catch {
          set({ user: null, loading: false });
        }
      }
    });
  },
}));

export default useAuthStore;
