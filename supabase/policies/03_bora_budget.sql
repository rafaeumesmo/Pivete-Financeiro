-- ============================================================================
-- Bora? — orçamento por pessoa em cada opção
-- Aplicar MANUALMENTE no SQL Editor do Supabase, depois de ../schema.sql.
-- Não cria tabela nova: só adiciona uma coluna opcional em poll_options, que
-- já tem RLS (leitura/inserção públicas, ver schema.sql §2b). Em centavos.
-- ============================================================================

alter table poll_options
  add column if not exists budget_cents integer check (budget_cents is null or budget_cents >= 0);

notify pgrst, 'reload schema';
