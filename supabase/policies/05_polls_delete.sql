-- ============================================================================
-- Apagar enquetes "Bora?"
-- Aplicar MANUALMENTE no SQL Editor do Supabase, depois de ../schema.sql.
-- Idempotente: pode rodar de novo.
--
-- A tabela polls não tem policy de delete (nem deve ter uma aberta: qualquer
-- um apagaria qualquer enquete). O app chama esta função, que só apaga se
-- quem pede é o criador — pela conta logada ou pelo anon_id do aparelho que
-- criou. Opções e votos saem junto (on delete cascade).
-- ============================================================================

create or replace function delete_poll(p_poll_id uuid, p_anon_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  delete from polls
   where id = p_poll_id
     and ((auth.uid() is not null and creator_user_id = auth.uid())
          or (p_anon_id is not null and creator_anon_id = p_anon_id));
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

revoke all on function delete_poll(uuid, text) from public;
grant execute on function delete_poll(uuid, text) to anon, authenticated;

notify pgrst, 'reload schema';
