import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { normalizeUsername, validateUsername } from "../lib/username";

export function useAuth() {
  const [session, setSession]       = useState(undefined); // undefined = carregando
  const [profile, setProfile]       = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    if (!supabase) { setSession(null); return; }

    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      // Após o callback do magic link, limpa o hash com access_token da URL
      // (detectSessionInUrl já processou o token) pra não deixar a URL feia.
      if (event === "SIGNED_IN" && window.location.hash.includes("access_token")) {
        window.history.replaceState({}, "", window.location.pathname + window.location.search);
      }
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
  }, [session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- de propósito: só o id, não o objeto session inteiro (evita refetch a cada refresh de token)

  async function sendMagicLink(email) {
    if (!supabase) throw new Error("Supabase não configurado");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  }

  // Redireciona pro Google e volta pra mesma origem; a sessão chega pela URL
  // e é processada pelo detectSessionInUrl, igual ao magic link.
  async function signInWithGoogle() {
    if (!supabase) throw new Error("Supabase não configurado");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
  }

  // Verifica disponibilidade do username no banco (case-insensitive porque
  // salvamos sempre normalizado). Ignora o próprio registro na edição.
  // Retorna { username, valid, available }.
  const checkUsername = useCallback(async (rawUsername) => {
    const username = normalizeUsername(rawUsername);
    const valid = validateUsername(username);
    if (!supabase || !valid) return { username, valid, available: false };
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (error) throw error;
    const available = !data || data.id === session?.user?.id;
    return { username, valid, available };
  }, [session?.user?.id]);

  async function createProfile({ username, displayName, avatarEmoji }) {
    if (!supabase || !session?.user) throw new Error("Não autenticado");
    const uname = normalizeUsername(username);
    if (!validateUsername(uname)) throw new Error("Username inválido (3–20 caracteres: letras, números, _ e .).");
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        id: session.user.id,
        username: uname,
        display_name: (displayName || uname).trim(),
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
    const payload = { ...updates };
    if (payload.username !== undefined) {
      const uname = normalizeUsername(payload.username);
      if (!validateUsername(uname)) throw new Error("Username inválido (3–20 caracteres: letras, números, _ e .).");
      payload.username = uname;
    }
    const { data, error } = await supabase
      .from("profiles")
      .update(payload)
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
    signInWithGoogle,
    signOut,
    checkUsername,
    createProfile,
    updateProfile,
  };
}
