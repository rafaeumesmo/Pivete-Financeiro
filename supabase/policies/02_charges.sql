-- ============================================================================
-- Link de cobrança (#/cobranca/...) — tabela + RLS
-- Aplicar MANUALMENTE no SQL Editor do Supabase, depois de ../schema.sql.
--
-- Quem recebe o link não precisa de conta: vê o valor (que vem no próprio
-- link) e marca "Paguei". Aqui fica só o aviso de pagamento: o id aleatório
-- da cobrança (UUID gerado no aparelho de quem cobra) e o nome que a pessoa
-- digitou. Nenhum valor, saldo ou dado financeiro de quem cobra vai pro banco.
-- ============================================================================

create table if not exists charge_payments (
  id          uuid        primary key default gen_random_uuid(),
  charge_id   text        not null check (char_length(charge_id) between 16 and 64),
  payer_name  text        not null check (char_length(payer_name) between 1 and 40),
  created_at  timestamptz not null default now()
);
create index if not exists charge_payments_charge_idx on charge_payments(charge_id);

alter table charge_payments enable row level security;

-- Qualquer um (inclusive anônimo) pode registrar "paguei".
drop policy if exists charge_payments_public_insert on charge_payments;
create policy charge_payments_public_insert on charge_payments for insert to anon, authenticated
  with check (true);

-- SEM policy de select: ninguém lista a tabela. Quem cobra lê os avisos só
-- da SUA cobrança pela função abaixo, que exige o charge_id (um UUID que só
-- existe no aparelho de quem cobrou e no link enviado).
create or replace function public.charge_payments_for(p_charge_id text)
returns table (payer_name text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select payer_name, created_at from charge_payments where charge_id = p_charge_id order by created_at;
$$;

revoke all on charge_payments from anon, authenticated;
grant insert on charge_payments to anon, authenticated;
grant execute on function public.charge_payments_for(text) to anon, authenticated;

notify pgrst, 'reload schema';
