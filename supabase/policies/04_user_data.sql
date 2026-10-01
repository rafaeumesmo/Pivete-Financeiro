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

-- Ler: só o dono. Gravar: só o dono COM assinatura ativa — essas policies
-- ficam em 07_assinaturas.sql (rode ele em seguida, senão ninguém grava).
-- A antiga user_data_own (for all) sai: policies se somam, e ela liberaria a
-- gravação sem assinatura.
drop policy if exists user_data_own on user_data;
drop policy if exists user_data_read_own on user_data;
create policy user_data_read_own on user_data for select to authenticated
  using (user_id = auth.uid());

revoke all on user_data from anon;
grant select, insert, update, delete on user_data to authenticated;

notify pgrst, 'reload schema';
