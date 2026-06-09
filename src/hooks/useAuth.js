import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export function useAuth() {
  const [session, setSession]       = useState(undefined); // undefined = carregando
  const [profile, setProfile]       = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    if (!supabase) { setSession(null); return; }

    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user) { setProfile(null); return; }
    setLoadingProfile(true);
    supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => { setProfile(data); setLoadingProfile(false); });
  }, [session?.user?.id]);

  async function sendMagicLink(email) {
    if (!supabase) throw new Error("Supabase não configurado");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
  }

  async function createProfile({ username, displayName, avatarEmoji }) {
    if (!supabase || !session?.user) throw new Error("Não autenticado");
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        id: session.user.id,
        username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, ""),
        display_name: (displayName || username).trim(),
        avatar_emoji: avatarEmoji || "👤",
      })
      .select()
      .single();
    if (error) throw error;
    setProfile(data);
    return data;
  }

  async function updateProfile(updates) {
    if (!supabase || !session?.user) throw new Error("Não autenticado");
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", session.user.id)
      .select()
      .single();
    if (error) throw error;
    setProfile(data);
    return data;
  }

  return {
    session,
    user: session?.user ?? null,
    profile,
    isLoading: session === undefined || (!!session && loadingProfile),
    isLoggedIn: !!session,
    needsProfile: !!session && !profile && !loadingProfile,
    sendMagicLink,
    signOut,
    createProfile,
    updateProfile,
  };
}
