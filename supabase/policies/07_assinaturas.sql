-- ============================================================================
-- Assinatura (R$ 1,99/mês, Mercado Pago)
-- Aplicar MANUALMENTE no SQL Editor do Supabase, depois de 04_user_data.sql.
-- Idempotente: pode rodar de novo.
--
-- Uma linha por usuário. Só as Edge Functions (service role) gravam aqui — o
-- app só lê a própria linha. Quem decide se a pessoa pagou é o Mercado Pago,
-- via webhook (supabase/functions/mp-webhook), nunca o navegador.
--
-- Salvar os dados na conta (user_data) passa a exigir assinatura ativa: sem
-- ela, a pessoa logada usa o app como quem está sem login (dados só na aba).
-- ============================================================================

create table if not exists assinaturas (
  user_id           uuid        primary key references auth.users(id) on delete cascade,
  mp_preapproval_id text        unique,
  status            text        not null check (status in ('pending', 'authorized', 'paused', 'cancelled')),
  -- Até quando já está pago. Cancelou: continua valendo até aqui.
  pago_ate          timestamptz,
  atualizado_em     timestamptz not null default now()
);

alter table assinaturas enable row level security;

drop policy if exists assinaturas_read_own on assinaturas;
create policy assinaturas_read_own on assinaturas for select to authenticated
  using (user_id = auth.uid());

revoke all on assinaturas from anon, authenticated;
grant select on assinaturas to authenticated;

-- Mesma regra de src/lib/assinatura.js (assinaturaAtiva).
create or replace function assinatura_ativa(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from assinaturas a
    where a.user_id = uid
      and (a.status = 'authorized' or a.pago_ate > now())
  );
$$;

revoke all on function assinatura_ativa(uuid) from public, anon;
grant execute on function assinatura_ativa(uuid) to authenticated;

-- user_data: ler continua livre pro dono (04_user_data.sql); gravar só com
-- assinatura ativa. Assinatura vencida não apaga nada: os dados ficam na conta
-- e voltam quando a pessoa assinar de novo.
drop policy if exists user_data_own on user_data;
drop policy if exists user_data_insert_assinante on user_data;
drop policy if exists user_data_update_assinante on user_data;
drop policy if exists user_data_delete_assinante on user_data;

create policy user_data_insert_assinante on user_data for insert to authenticated
  with check (user_id = auth.uid() and assinatura_ativa(auth.uid()));
create policy user_data_update_assinante on user_data for update to authenticated
  using (user_id = auth.uid() and assinatura_ativa(auth.uid()))
  with check (user_id = auth.uid() and assinatura_ativa(auth.uid()));
create policy user_data_delete_assinante on user_data for delete to authenticated
  using (user_id = auth.uid() and assinatura_ativa(auth.uid()));

notify pgrst, 'reload schema';
