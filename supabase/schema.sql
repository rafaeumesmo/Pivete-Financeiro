-- ============================================================================
-- TaskMatch — Schema Supabase
-- Cole este arquivo inteiro no SQL Editor do Supabase e execute (Run).
-- Pode ser re-executado: usa DROP/IF NOT EXISTS onde faz sentido.
-- ============================================================================

-- ─── 1. TABELAS ─────────────────────────────────────────────────────────────

-- Profiles (vinculado a auth.users)
create table if not exists profiles (
  id            uuid        primary key references auth.users(id) on delete cascade,
  username      text        unique not null,
  display_name  text,
  avatar_emoji  text        not null default '👤',
  created_at    timestamptz not null default now()
);

-- Friendships (modelo de duas linhas após aceite)
-- Ao aceitar um pedido, insere-se uma segunda linha reversa.
-- is_close_friend na linha (user_id=A, friend_id=B) significa: A marcou B como close.
create table if not exists friendships (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references profiles(id) on delete cascade,
  friend_id       uuid        not null references profiles(id) on delete cascade,
  status          text        not null default 'pending' check (status in ('pending','accepted')),
  is_close_friend boolean     not null default false,
  created_at      timestamptz not null default now(),
  unique(user_id, friend_id)
);

-- Shared Tasks
create table if not exists shared_tasks (
  id          uuid        primary key default gen_random_uuid(),
  author_id   uuid        not null references profiles(id) on delete cascade,
  title       text        not null,
  description text,
  category    text,
  emoji       text                     default '✨',
  gradient    text,
  image_url   text,
  audience    text        not null     default 'friends' check (audience in ('friends','close')),
  created_at  timestamptz not null     default now()
);

-- Task Responses
create table if not exists task_responses (
  id              uuid        primary key default gen_random_uuid(),
  shared_task_id  uuid        not null references shared_tasks(id) on delete cascade,
  responder_id    uuid        not null references profiles(id) on delete cascade,
  response        text        not null check (response in ('approved','rejected','reshared')),
  created_at      timestamptz not null default now(),
  unique(shared_task_id, responder_id)
);

-- ─── 2. RLS POLICIES ────────────────────────────────────────────────────────

-- profiles
alter table profiles enable row level security;
drop policy if exists "profiles_public_read" on profiles;
create policy "profiles_public_read" on profiles for select using (true);
drop policy if exists "profiles_self_insert" on profiles;
create policy "profiles_self_insert" on profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_self_update" on profiles;
create policy "profiles_self_update" on profiles for update using (auth.uid() = id);

-- friendships
alter table friendships enable row level security;
drop policy if exists "friendships_read" on friendships;
create policy "friendships_read" on friendships for select using (
  auth.uid() = user_id or auth.uid() = friend_id
);
drop policy if exists "friendships_insert" on friendships;
create policy "friendships_insert" on friendships for insert with check (auth.uid() = user_id);
drop policy if exists "friendships_update" on friendships;
create policy "friendships_update" on friendships for update using (
  auth.uid() = user_id or auth.uid() = friend_id
);
drop policy if exists "friendships_delete" on friendships;
create policy "friendships_delete" on friendships for delete using (
  auth.uid() = user_id or auth.uid() = friend_id
);

-- shared_tasks
alter table shared_tasks enable row level security;
-- author: acesso total
drop policy if exists "shared_tasks_author" on shared_tasks;
create policy "shared_tasks_author" on shared_tasks for all using (auth.uid() = author_id);
-- amigos veem audience='friends'
drop policy if exists "shared_tasks_friends_read" on shared_tasks;
create policy "shared_tasks_friends_read" on shared_tasks for select using (
  audience = 'friends' and exists (
    select 1 from friendships f where f.status = 'accepted' and (
      (f.user_id = auth.uid() and f.friend_id = shared_tasks.author_id) or
      (f.friend_id = auth.uid() and f.user_id = shared_tasks.author_id)
    )
  )
);
-- close friends veem audience='close' (author marcou viewer como close)
drop policy if exists "shared_tasks_close_friends_read" on shared_tasks;
create policy "shared_tasks_close_friends_read" on shared_tasks for select using (
  audience = 'close' and exists (
    select 1 from friendships f
    where f.user_id = shared_tasks.author_id
      and f.friend_id = auth.uid()
      and f.status = 'accepted'
      and f.is_close_friend = true
  )
);

-- task_responses
alter table task_responses enable row level security;
drop policy if exists "task_responses_own" on task_responses;
create policy "task_responses_own" on task_responses for all using (auth.uid() = responder_id);
drop policy if exists "task_responses_author_read" on task_responses;
create policy "task_responses_author_read" on task_responses for select using (
  exists (select 1 from shared_tasks st where st.id = shared_task_id and st.author_id = auth.uid())
);

-- ─── 3. REALTIME ────────────────────────────────────────────────────────────
-- Adiciona as tabelas à publicação de realtime.
-- (Equivale a marcar cada tabela em Database → Replication no dashboard.)
alter publication supabase_realtime add table shared_tasks;
alter publication supabase_realtime add table task_responses;
alter publication supabase_realtime add table friendships;
