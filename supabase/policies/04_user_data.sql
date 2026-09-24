-- ============================================================================
-- Sincronização dos dados pessoais entre aparelhos (conta logada)
-- Aplicar MANUALMENTE no SQL Editor do Supabase, depois de ../schema.sql.
-- Idempotente: pode rodar de novo.
--
-- Uma linha por usuário e por chave do localStorage (fin_lancamentos,
-- fin_dividas, …), com o valor em jsonb. Sem login nada sai do aparelho; logado,
-- cada pessoa só enxerga e grava as próprias linhas.
-- ============================================================================

create table if not exists user_data (
  user_id     uuid        not null references auth.users(id) on delete cascade,
  key         text        not null check (key like 'fin\_%'),
  value       jsonb,
  updated_at  timestamptz not null default now(),
  primary key (user_id, key)
);

alter table user_data enable row level security;

drop policy if exists user_data_own on user_data;
create policy user_data_own on user_data for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on user_data from anon;
grant select, insert, update, delete on user_data to authenticated;

notify pgrst, 'reload schema';
