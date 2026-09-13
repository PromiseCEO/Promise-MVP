import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type Profile = {
  id: string;
  email: string;
  first_name: string;
  identity: string;
  journey: string;
  plan: string;
  family_addon: boolean;
  subscription_status: string;
  intentional: Record<string, any>;
  date_of_birth: string | null;
};

type AuthContextType = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  emailVerified: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  loading: true,
  emailVerified: false,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(data as Profile);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) loadProfile(session.user.id);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) loadProfile(session.user.id);
      else setProfile(null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        emailVerified: !!session?.user?.email_confirmed_at,
        refreshProfile: async () => {
          if (session?.user) await loadProfile(session.user.id);
        },
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
