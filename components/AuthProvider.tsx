"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

interface AuthValue {
  user: User | null;
  ready: boolean;
  configured: boolean;
}

const Ctx = createContext<AuthValue>({ user: null, ready: false, configured: false });

export const useAuth = () => useContext(Ctx);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const sb = getSupabase();

  useEffect(() => {
    if (!sb) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- nothing to load without Supabase
      setReady(true);
      return;
    }
    sb.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data } = sb.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, [sb]);

  return <Ctx.Provider value={{ user, ready, configured: !!sb }}>{children}</Ctx.Provider>;
}
