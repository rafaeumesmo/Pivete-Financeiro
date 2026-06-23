/*
 * SUPABASE SCHEMA — execute no SQL Editor do Supabase
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * -- 1. Profiles (vinculado a auth.users)
 * create table profiles (
 *   id            uuid        primary key references auth.users(id) on delete cascade,
 *   username      text        unique not null,
 *   display_name  text,
 *   avatar_emoji  text        not null default '👤',
 *   created_at    timestamptz not null default now()
 * );
 *
 * -- 2. Friendships (modelo de duas linhas após aceite)
 * -- Ao aceitar um pedido, insere-se uma segunda linha reversa.
 * -- is_close_friend na linha (user_id=A, friend_id=B) significa: A marcou B como close.
 * create table friendships (
 *   id              uuid        primary key default gen_random_uuid(),
 *   user_id         uuid        not null references profiles(id) on delete cascade,
 *   friend_id       uuid        not null references profiles(id) on delete cascade,
 *   status          text        not null default 'pending' check (status in ('pending','accepted')),
 *   is_close_friend boolean     not null default false,
 *   created_at      timestamptz not null default now(),
 *   unique(user_id, friend_id)
 * );
 *
 * -- 3. Shared Tasks
 * create table shared_tasks (
 *   id          uuid        primary key default gen_random_uuid(),
 *   author_id   uuid        not null references profiles(id) on delete cascade,
 *   title       text        not null,
 *   description text,
 *   category    text,
 *   emoji       text                     default '✨',
 *   gradient    text,
 *   image_url   text,
 *   audience    text        not null     default 'friends' check (audience in ('friends','close')),
 *   created_at  timestamptz not null     default now()
 * );
 *
 * -- 4. Task Responses
 * create table task_responses (
 *   id              uuid        primary key default gen_random_uuid(),
 *   shared_task_id  uuid        not null references shared_tasks(id) on delete cascade,
 *   responder_id    uuid        not null references profiles(id) on delete cascade,
 *   response        text        not null check (response in ('approved','rejected','reshared')),
 *   created_at      timestamptz not null default now(),
 *   unique(shared_task_id, responder_id)
 * );
 *
 * ─── RLS POLICIES ────────────────────────────────────────────────────────────
 *
 * -- profiles
 * alter table profiles enable row level security;
 * create policy "profiles_public_read" on profiles for select using (true);
 * create policy "profiles_self_insert" on profiles for insert with check (auth.uid() = id);
 * create policy "profiles_self_update" on profiles for update using (auth.uid() = id);
 *
 * -- friendships
 * alter table friendships enable row level security;
 * create policy "friendships_read" on friendships for select using (
 *   auth.uid() = user_id or auth.uid() = friend_id
 * );
 * create policy "friendships_insert" on friendships for insert with check (auth.uid() = user_id);
 * create policy "friendships_update" on friendships for update using (
 *   auth.uid() = user_id or auth.uid() = friend_id
 * );
 * create policy "friendships_delete" on friendships for delete using (
 *   auth.uid() = user_id or auth.uid() = friend_id
 * );
 *
 * -- shared_tasks
 * alter table shared_tasks enable row level security;
 * -- author: acesso total
 * create policy "shared_tasks_author" on shared_tasks for all using (auth.uid() = author_id);
 * -- amigos veem audience='friends'
 * create policy "shared_tasks_friends_read" on shared_tasks for select using (
 *   audience = 'friends' and exists (
 *     select 1 from friendships f where f.status = 'accepted' and (
 *       (f.user_id = auth.uid() and f.friend_id = shared_tasks.author_id) or
 *       (f.friend_id = auth.uid() and f.user_id = shared_tasks.author_id)
 *     )
 *   )
 * );
 * -- close friends veem audience='close' (author marcou viewer como close)
 * create policy "shared_tasks_close_friends_read" on shared_tasks for select using (
 *   audience = 'close' and exists (
 *     select 1 from friendships f
 *     where f.user_id = shared_tasks.author_id
 *       and f.friend_id = auth.uid()
 *       and f.status = 'accepted'
 *       and f.is_close_friend = true
 *   )
 * );
 *
 * -- task_responses
 * alter table task_responses enable row level security;
 * create policy "task_responses_own" on task_responses for all using (auth.uid() = responder_id);
 * create policy "task_responses_author_read" on task_responses for select using (
 *   exists (select 1 from shared_tasks st where st.id = shared_task_id and st.author_id = auth.uid())
 * );
 *
 * ─── REALTIME ────────────────────────────────────────────────────────────────
 * Ativar Realtime para: shared_tasks, task_responses, friendships
 * Dashboard → Database → Replication → marcar cada tabela
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("[TaskMatch] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configurados — recursos sociais desabilitados.");
}

/*
 * ── TABELAS DO BORA (execute no SQL Editor do Supabase) ──────────────────────
 *
 * create table polls (
 *   id               uuid        primary key default gen_random_uuid(),
 *   title            text        not null,
 *   type             text        not null default 'single' check (type in ('single','multiple')),
 *   status           text        not null default 'open'   check (status in ('open','closed')),
 *   creator_anon_id  text        not null,
 *   creator_user_id  uuid        references profiles(id) on delete set null,
 *   created_at       timestamptz not null default now()
 * );
 * create table poll_options (
 *   id        uuid    primary key default gen_random_uuid(),
 *   poll_id   uuid    not null references polls(id) on delete cascade,
 *   emoji     text,
 *   label     text    not null,
 *   position  int     not null default 0
 * );
 * create table poll_votes (
 *   id              uuid        primary key default gen_random_uuid(),
 *   poll_id         uuid        not null references polls(id) on delete cascade,
 *   option_id       uuid        not null references poll_options(id) on delete cascade,
 *   voter_anon_id   text        not null,
 *   voter_nick      text,
 *   created_at      timestamptz not null default now()
 * );
 *
 * -- RLS: acesso anônimo (sem login) é necessário para o Bora funcionar
 * alter table polls        enable row level security;
 * alter table poll_options enable row level security;
 * alter table poll_votes   enable row level security;
 *
 * create policy "polls_public_read"   on polls        for select using (true);
 * create policy "polls_anon_insert"   on polls        for insert with check (true);
 * create policy "polls_creator_update" on polls       for update using (creator_anon_id = current_setting('request.headers', true)::json->>'x-client-info' or true);
 * create policy "options_public_read" on poll_options for select using (true);
 * create policy "options_anon_insert" on poll_options for insert with check (true);
 * create policy "votes_public_read"   on poll_votes   for select using (true);
 * create policy "votes_anon_insert"   on poll_votes   for insert with check (true);
 * create policy "votes_anon_delete"   on poll_votes   for delete using (voter_anon_id = (select coalesce(current_setting('request.jwt.claims', true)::json->>'sub', '')));
 *
 * -- Ativar Realtime para: polls, poll_options, poll_votes
 * -- Dashboard → Database → Replication → marcar cada tabela
 */

/*
 * ⚠️ CONFIGURAÇÃO OBRIGATÓRIA NO PAINEL DO SUPABASE (Authentication → URL Configuration):
 * Para o magic link funcionar em todos os domínios (e evitar o erro
 * "Invalid path specified in request URL"), cadastre TODAS as origens em "Redirect URLs",
 * cada uma com /** no final, por exemplo:
 *   http://localhost:5173/**
 *   https://taskmatch.vercel.app/**
 * O emailRedirectTo é definido dinamicamente com window.location.origin (ver useAuth.js),
 * então qualquer origem listada aqui passa a funcionar sem hardcode no código.
 */
export const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: true,      // mantém a sessão salva entre reloads
          autoRefreshToken: true,    // renova o token automaticamente
          detectSessionInUrl: true,  // processa o token do magic link na volta do email
          storage: window.localStorage,
        },
      })
    : null;
