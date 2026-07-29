# Recomendações de Otimização no Banco de Dados (Supabase)

Análise das tabelas e índices do banco de dados relacional para melhorar a performance de consultas e eliminar gargalos de execução.

---

## 1. Foreign Keys sem Índice (Cobrir Chaves Estrangeiras)

As chaves estrangeiras abaixo não possuem um índice cobrindo a coluna na tabela. Criar esses índices reduz o tempo de junção (`JOIN`) e melhora a busca em tabelas com muitas linhas.

| Tabela | Coluna Foreign Key | Nome da Constraint |
| :--- | :--- | :--- |
| `public.org_invites` | `invited_by` | `org_invites_invited_by_fkey` |
| `public.org_join_requests` | `reviewed_by` | `org_join_requests_reviewed_by_fkey` |
| `public.tasks` | `assigned_by` | `tasks_assigned_by_fkey` |
| `public.tasks` | `assigned_to` | `tasks_assigned_to_fkey` |
| `public.tasks` | `progress_updated_by` | `tasks_progress_updated_by_fkey` |

---

## 2. Índices Não Utilizados (Revisão para Cleanup)

Os índices abaixo foram identificados pela auditoria como não utilizados pelas consultas ativeis do sistema. Vale a pena avaliar se devem ser removidos para economizar espaço em disco e acelerar operações de `INSERT`/`UPDATE`:

- `idx_tasks_user_id` em `public.tasks`
- `idx_tasks_status` em `public.tasks`
- `idx_tasks_category_id` em `public.tasks`
- `idx_tasks_org_id` em `public.tasks`
- `idx_categories_user_id` em `public.categories`
- `idx_timer_stats_user_id` em `public.timer_stats`
- `idx_timer_stats_org_id` em `public.timer_stats`
- `idx_profiles_email` em `public.profiles`
- `idx_profiles_machine_id` em `public.profiles`
- `idx_org_join_requests_user_id` em `public.org_join_requests`
