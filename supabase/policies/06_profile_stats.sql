-- ============================================================================
-- Perfil público pros amigos: nível, ofensiva e conquistas
-- Aplicar MANUALMENTE no SQL Editor do Supabase, depois de ../schema.sql.
-- Idempotente: pode rodar de novo.
--
-- Fica numa tabela à parte (e não em profiles) porque profiles é legível por
-- qualquer um (busca por @username). profile_stats só é lida pelo dono e por
-- quem ele aceitou como amigo. Nenhum valor em R$ vem pra cá — dinheiro fica
-- só em user_data (04_user_data.sql).
-- ============================================================================

create table if not exists profile_stats (
  user_id     uuid        primary key references profiles(id) on delete cascade,
  nivel       int         not null default 1 check (nivel >= 1),
  ofensiva    int         not null default 0 check (ofensiva >= 0),
  conquistas  text[]      not null default '{}',
  updated_at  timestamptz not null default now()
);

alter table profile_stats enable row level security;

-- "Amigo" = o DONO das stats tem uma linha aceita apontando pra quem lê.
-- Essa linha só existe se o dono enviou o pedido ou aceitou o de quem lê
-- (garantido pelos triggers de friendships abaixo).
drop policy if exists profile_stats_read on profile_stats;
create policy profile_stats_read on profile_stats for select to authenticated using (
  user_id = auth.uid()
  or exists (
    select 1 from friendships f
    where f.user_id = profile_stats.user_id
      and f.friend_id = auth.uid()
      and f.status = 'accepted'
  )
);

drop policy if exists profile_stats_insert on profile_stats;
create policy profile_stats_insert on profile_stats for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists profile_stats_update on profile_stats;
create policy profile_stats_update on profile_stats for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on profile_stats from anon;
grant select, insert, update on profile_stats to authenticated;

-- ── Endurece friendships ─────────────────────────────────────────────────────
-- As policies de friendships deixavam: (1) inserir uma linha já "accepted" sem
-- o outro aceitar; (2) trocar user_id/friend_id de uma linha própria. Qualquer
-- um dos dois forjaria amizade — e agora amizade dá acesso a profile_stats.
--
-- Regras:
--  • user_id e friend_id não mudam depois de criados.
--  • Uma linha só nasce/vira "accepted" se quem pede é o destinatário do
--    pedido (friend_id) ou se a linha reversa já está aceita (é o upsert que o
--    app faz em acceptFriend, depois de aceitar a linha do outro).

create or replace function friendships_guard()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and (new.user_id <> old.user_id or new.friend_id <> old.friend_id) then
    raise exception 'friendships: user_id/friend_id não podem ser alterados';
  end if;

  if new.status = 'accepted' and (tg_op = 'INSERT' or old.status is distinct from 'accepted') then
    if not (
      (tg_op = 'UPDATE' and auth.uid() = old.friend_id)
      or exists (
        select 1 from friendships r
        where r.user_id = new.friend_id
          and r.friend_id = new.user_id
          and r.status = 'accepted'
      )
    ) then
      raise exception 'friendships: amizade precisa ser aceita pelo outro lado';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists friendships_guard on friendships;
create trigger friendships_guard
  before insert or update on friendships
  for each row execute function friendships_guard();

notify pgrst, 'reload schema';
