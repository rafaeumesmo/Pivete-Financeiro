-- ============================================================================
-- TaskMatch — Schema Supabase
-- Cole este arquivo inteiro no SQL Editor do Supabase e execute (Run).
-- Pode ser re-executado: usa DROP/IF NOT EXISTS onde faz sentido.
-- ============================================================================

-- ─── 1. TABELAS ─────────────────────────────────────────────────────────────

-- Profiles (vinculado a auth.users)
-- id  = PRIMARY KEY (uuid, liga ao auth.users) — NÃO é o username.
-- username = UNIQUE NOT NULL — garante que não existam dois usuários iguais.
-- Convenção da aplicação: username sempre salvo em lowercase, sem espaços e
-- sem @, no formato /^[a-z0-9_.]{3,20}$/ (ver src/lib/username.js), pra que
-- "Marina" e "marina" sejam a mesma pessoa.
create table if not exists profiles (
  id            uuid        primary key references auth.users(id) on delete cascade,
  username      text        unique not null,
  display_name  text,
  avatar_emoji  text        not null default '👤',
  created_at    timestamptz not null default now()
);

-- Garante o UNIQUE em username mesmo em bancos criados antes dessa regra.
-- (Idempotente: só adiciona a constraint se ainda não houver índice unique.)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_username_unique')
     and not exists (
       select 1 from pg_indexes
       where tablename = 'profiles' and indexdef ilike '%unique%' and indexdef ilike '%(username)%'
     )
  then
    alter table profiles add constraint profiles_username_unique unique (username);
  end if;
end $$;

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

-- ─── 2b. ENQUETES "BORA?" (votação aberta, sem login) ───────────────────────
-- A graça da feature: qualquer pessoa vota pelo link público /bora/[id] sem
-- conta. O "dono" da enquete é identificado por um anon_id guardado no
-- localStorage; se a pessoa logar depois, as enquetes migram pra conta dela.

create table if not exists polls (
  id              uuid        primary key default gen_random_uuid(),
  title           text        not null,
  type            text        not null default 'single' check (type in ('single','multiple')),
  creator_anon_id text        not null,
  creator_user_id uuid        references profiles(id) on delete set null,
  status          text        not null default 'open' check (status in ('open','closed')),
  created_at      timestamptz not null default now()
);

create table if not exists poll_options (
  id        uuid  primary key default gen_random_uuid(),
  poll_id   uuid  not null references polls(id) on delete cascade,
  emoji     text,
  label     text  not null,
  position  int   not null default 0
);

create table if not exists poll_votes (
  id            uuid        primary key default gen_random_uuid(),
  poll_id       uuid        not null references polls(id) on delete cascade,
  option_id     uuid        not null references poll_options(id) on delete cascade,
  voter_nick    text        not null,
  voter_anon_id text        not null,
  created_at    timestamptz not null default now(),
  -- Anti-spam: no máximo 1 voto por opção por pessoa (anon_id).
  unique (option_id, voter_anon_id)
);

create index if not exists poll_options_poll_idx on poll_options(poll_id);
create index if not exists poll_votes_poll_idx    on poll_votes(poll_id);

-- RLS: leitura e escrita LIBERADAS pra anônimos (é o gancho — votar sem login).
-- O controle de "dono" (encerrar/migrar) é por anon_id na aplicação.
alter table polls enable row level security;
drop policy if exists "polls_public_read"   on polls;
create policy "polls_public_read"   on polls for select using (true);
drop policy if exists "polls_public_insert" on polls;
create policy "polls_public_insert" on polls for insert with check (true);
drop policy if exists "polls_public_update" on polls;
create policy "polls_public_update" on polls for update using (true);

alter table poll_options enable row level security;
drop policy if exists "poll_options_public_read"   on poll_options;
create policy "poll_options_public_read"   on poll_options for select using (true);
drop policy if exists "poll_options_public_insert" on poll_options;
create policy "poll_options_public_insert" on poll_options for insert with check (true);

alter table poll_votes enable row level security;
drop policy if exists "poll_votes_public_read"   on poll_votes;
create policy "poll_votes_public_read"   on poll_votes for select using (true);
drop policy if exists "poll_votes_public_insert" on poll_votes;
create policy "poll_votes_public_insert" on poll_votes for insert with check (true);
drop policy if exists "poll_votes_public_update" on poll_votes;
create policy "poll_votes_public_update" on poll_votes for update using (true);
drop policy if exists "poll_votes_public_delete" on poll_votes;
create policy "poll_votes_public_delete" on poll_votes for delete using (true);

-- Garante privilégios de tabela pro papel anônimo (além do RLS).
grant select, insert, update, delete on polls, poll_options, poll_votes to anon, authenticated;

-- ─── 3. REALTIME ────────────────────────────────────────────────────────────
-- Adiciona as tabelas à publicação de realtime (idempotente: ignora se já estão).
-- (Equivale a marcar cada tabela em Database → Replication no dashboard.)
do $$
declare t text;
begin
  foreach t in array array['shared_tasks','task_responses','friendships','poll_votes','polls'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Recarrega o cache do schema do PostgREST (resolve "Could not find the table
-- 'public.polls' in the schema cache" sem precisar esperar/recriar).
notify pgrst, 'reload schema';
