-- ============================================================================
-- Dividir contas (estilo Splitwise) — tabelas + RLS
-- Aplicar MANUALMENTE no SQL Editor do Supabase, depois de ../schema.sql.
-- Idempotente: pode rodar de novo.
--
-- Privacidade: só vai pro servidor o que o usuário decide dividir (descrição
-- e valor da despesa, quem deve quanto). Saldos de contas, extrato pessoal,
-- dívidas e caixinhas continuam só no aparelho.
-- Valores sempre em centavos (integer).
-- ============================================================================

create table if not exists split_groups (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null check (char_length(name) between 1 and 60),
  created_by  uuid        not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists split_group_members (
  group_id   uuid        not null references split_groups(id) on delete cascade,
  user_id    uuid        not null references profiles(id) on delete cascade,
  added_at   timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists split_expenses (
  id           uuid        primary key default gen_random_uuid(),
  group_id     uuid        not null references split_groups(id) on delete cascade,
  paid_by      uuid        not null references profiles(id) on delete cascade,
  description  text        not null check (char_length(description) between 1 and 80),
  amount_cents integer     not null check (amount_cents > 0),
  spent_on     date        not null default current_date,
  created_at   timestamptz not null default now()
);

-- Quanto cada participante deve daquela despesa (a parte do pagador também
-- entra, pra soma bater com amount_cents).
create table if not exists split_shares (
  expense_id   uuid    not null references split_expenses(id) on delete cascade,
  user_id      uuid    not null references profiles(id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  primary key (expense_id, user_id)
);

-- "Quitar": from_user pagou to_user fora do app.
create table if not exists split_settlements (
  id           uuid        primary key default gen_random_uuid(),
  group_id     uuid        not null references split_groups(id) on delete cascade,
  from_user    uuid        not null references profiles(id) on delete cascade,
  to_user      uuid        not null references profiles(id) on delete cascade,
  amount_cents integer     not null check (amount_cents > 0),
  created_by   uuid        not null references profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  check (from_user <> to_user)
);

create index if not exists split_members_user_idx     on split_group_members(user_id);
create index if not exists split_expenses_group_idx   on split_expenses(group_id);
create index if not exists split_settlements_group_idx on split_settlements(group_id);

-- Helper sem recursão de RLS: "o usuário logado é membro do grupo?"
-- security definer + search_path fixo (boa prática do Supabase).
create or replace function public.is_split_member(g uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from split_group_members m where m.group_id = g and m.user_id = auth.uid());
$$;

create or replace function public.is_split_member_user(g uuid, u uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from split_group_members m where m.group_id = g and m.user_id = u);
$$;

create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from friendships f where f.user_id = a and f.friend_id = b and f.status = 'accepted');
$$;

revoke all on function public.is_split_member(uuid), public.is_split_member_user(uuid, uuid), public.are_friends(uuid, uuid) from anon;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table split_groups        enable row level security;
alter table split_group_members enable row level security;
alter table split_expenses      enable row level security;
alter table split_shares        enable row level security;
alter table split_settlements   enable row level security;

-- Grupos: membros leem; qualquer logado cria grupo em seu nome; só o criador
-- renomeia/apaga.
drop policy if exists split_groups_read on split_groups;
create policy split_groups_read on split_groups for select to authenticated
  using (created_by = auth.uid() or public.is_split_member(id));
drop policy if exists split_groups_insert on split_groups;
create policy split_groups_insert on split_groups for insert to authenticated
  with check (created_by = auth.uid());
drop policy if exists split_groups_update on split_groups;
create policy split_groups_update on split_groups for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());
drop policy if exists split_groups_delete on split_groups;
create policy split_groups_delete on split_groups for delete to authenticated
  using (created_by = auth.uid());

-- Membros: membros veem a lista; o criador do grupo adiciona a si mesmo ou
-- AMIGOS aceitos; o criador remove qualquer um, e cada um pode sair.
drop policy if exists split_members_read on split_group_members;
create policy split_members_read on split_group_members for select to authenticated
  using (public.is_split_member(group_id) or exists (select 1 from split_groups g where g.id = group_id and g.created_by = auth.uid()));
drop policy if exists split_members_insert on split_group_members;
create policy split_members_insert on split_group_members for insert to authenticated
  with check (
    exists (select 1 from split_groups g where g.id = group_id and g.created_by = auth.uid())
    and (user_id = auth.uid() or public.are_friends(auth.uid(), user_id))
  );
drop policy if exists split_members_delete on split_group_members;
create policy split_members_delete on split_group_members for delete to authenticated
  using (user_id = auth.uid() or exists (select 1 from split_groups g where g.id = group_id and g.created_by = auth.uid()));

-- Despesas: membros leem; um membro só registra despesa que ELE pagou; só
-- quem pagou apaga.
drop policy if exists split_expenses_read on split_expenses;
create policy split_expenses_read on split_expenses for select to authenticated
  using (public.is_split_member(group_id));
drop policy if exists split_expenses_insert on split_expenses;
create policy split_expenses_insert on split_expenses for insert to authenticated
  with check (paid_by = auth.uid() and public.is_split_member(group_id));
drop policy if exists split_expenses_delete on split_expenses;
create policy split_expenses_delete on split_expenses for delete to authenticated
  using (paid_by = auth.uid());

-- Partes: visíveis aos membros do grupo da despesa; só quem pagou a despesa
-- cria as partes, e só pra membros do grupo.
drop policy if exists split_shares_read on split_shares;
create policy split_shares_read on split_shares for select to authenticated
  using (exists (select 1 from split_expenses e where e.id = expense_id and public.is_split_member(e.group_id)));
drop policy if exists split_shares_insert on split_shares;
create policy split_shares_insert on split_shares for insert to authenticated
  with check (exists (
    select 1 from split_expenses e
    where e.id = expense_id and e.paid_by = auth.uid() and public.is_split_member_user(e.group_id, user_id)
  ));

-- Quitações: membros leem; só um dos dois envolvidos registra, e ambos
-- precisam ser membros do grupo. Quem registrou pode apagar (desfazer).
drop policy if exists split_settlements_read on split_settlements;
create policy split_settlements_read on split_settlements for select to authenticated
  using (public.is_split_member(group_id));
drop policy if exists split_settlements_insert on split_settlements;
create policy split_settlements_insert on split_settlements for insert to authenticated
  with check (
    created_by = auth.uid()
    and auth.uid() in (from_user, to_user)
    and public.is_split_member_user(group_id, from_user)
    and public.is_split_member_user(group_id, to_user)
  );
drop policy if exists split_settlements_delete on split_settlements;
create policy split_settlements_delete on split_settlements for delete to authenticated
  using (created_by = auth.uid());

-- Nada disso é acessível sem login.
revoke all on split_groups, split_group_members, split_expenses, split_shares, split_settlements from anon;
grant select, insert, update, delete on split_groups, split_group_members, split_expenses, split_shares, split_settlements to authenticated;

-- Realtime pra atualizar saldos quando outro membro lança/quita.
do $$
declare t text;
begin
  foreach t in array array['split_expenses','split_settlements','split_group_members'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
