-- ============================================================================
-- Plano do usuário (grátis / Pro) — estrutura, sem pagamento ainda
-- Aplicar MANUALMENTE no SQL Editor do Supabase, depois de ../schema.sql.
-- Idempotente: pode rodar de novo.
--
-- Fica numa tabela à parte (e não em profiles) porque:
--   • profiles é legível por qualquer um (busca por @username) — o plano não
--     deve ser público;
--   • profiles_self_update deixa o dono reescrever a própria linha inteira
--     (RLS é por linha, não por coluna) — ele mudaria o próprio plano.
--
-- Sem linha = grátis (não precisa de trigger pra criar). O dono só LÊ a
-- própria linha. Ninguém com anon/authenticated grava: só a service role
-- (que ignora RLS), ex.: o futuro webhook de pagamento.
-- ============================================================================

create table if not exists assinaturas (
  user_id       uuid        primary key references profiles(id) on delete cascade,
  plano         text        not null default 'gratis' check (plano in ('gratis', 'pro')),
  fundador      boolean     not null default false, -- usuário de antes do lançamento; sem efeito por enquanto
  atualizado_em timestamptz not null default now()
);

alter table assinaturas enable row level security;

drop policy if exists assinaturas_le_a_propria on assinaturas;
create policy assinaturas_le_a_propria on assinaturas for select to authenticated
  using (user_id = auth.uid());

-- Nenhuma policy de insert/update/delete: com RLS ligado, isso já nega. O
-- revoke é a segunda trava (se alguém criar uma policy por engano).
revoke all on assinaturas from anon;
revoke insert, update, delete, truncate on assinaturas from authenticated;
grant select on assinaturas to authenticated;

-- ── Lançamento do Pro (NÃO rodar agora) ──────────────────────────────────────
-- Marca como fundador todo mundo que já tem perfil. Rodar uma vez, no dia:
--
-- insert into assinaturas (user_id, fundador)
--   select id, true from profiles
--   on conflict (user_id) do update set fundador = true, atualizado_em = now();
