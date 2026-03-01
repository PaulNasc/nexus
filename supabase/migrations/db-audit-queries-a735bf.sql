-- Nexus / Krigzis - DB audit queries (safe, read-only)
-- Execute in Supabase SQL Editor.

-- 1) Inventory: row estimates + relation size
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.reltuples::bigint as est_rows,
  pg_size_pretty(pg_total_relation_size(c.oid)) as total_size
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r'
  and n.nspname = 'public'
order by pg_total_relation_size(c.oid) desc;

-- 2) Access heatmap by table
select
  relname as table_name,
  seq_scan,
  idx_scan,
  n_tup_ins,
  n_tup_upd,
  n_tup_del,
  n_live_tup,
  n_dead_tup
from pg_stat_user_tables
order by (coalesce(seq_scan, 0) + coalesce(idx_scan, 0)) asc;

-- 3) RLS coverage in public schema
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

-- 4) Notes/tasks link integrity (orphans)
select l.*
from public.note_task_links l
left join public.notes n on n.id = l.note_id
left join public.tasks t on t.id = l.task_id
where n.id is null or t.id is null;

-- 5) Potential duplicate active invites by org/email
select org_id, invited_email, count(*)
from public.org_invites
where status = 'pending'
group by org_id, invited_email
having count(*) > 1;

-- 6) Data consistency checks - notes
select id, user_id, organization_id, created_at
from public.notes
where user_id is null;

-- 7) Data consistency checks - tasks
select id, user_id, organization_id, created_at
from public.tasks
where user_id is null;

-- 8) System-tag checks that do NOT fail when optional schema pieces are missing
-- 8.a) Verify whether notes.system_tag_id exists in current DB
select
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notes'
      and column_name = 'system_tag_id'
  ) as has_notes_system_tag_id;

-- 8.b) Verify whether org_system_tags table exists in current DB
select to_regclass('public.org_system_tags') as org_system_tags_regclass;

-- 8.c) Always-safe distribution of system_tag_id references from notes
-- (no direct column reference; safe even when notes.system_tag_id is missing)
select
  (to_jsonb(n)->>'system_tag_id')::bigint as system_tag_id,
  count(*) as notes_count
from public.notes n
where (to_jsonb(n) ? 'system_tag_id')
  and (to_jsonb(n)->>'system_tag_id') ~ '^[0-9]+$'
group by (to_jsonb(n)->>'system_tag_id')::bigint
order by notes_count desc;

-- 8.d) Run ONLY when 8.b returns a non-null regclass:
-- select n.system_tag_id, count(*) as notes_count
-- from public.notes n
-- join public.org_system_tags t on t.id = n.system_tag_id
-- where t.is_active = false
-- group by n.system_tag_id
-- order by notes_count desc;

-- 9) Optional candidate tables with low activity (manual review only)
select
  relname as table_name,
  (coalesce(seq_scan, 0) + coalesce(idx_scan, 0)) as total_reads,
  n_live_tup as est_live_rows
from pg_stat_user_tables
where schemaname = 'public'
order by total_reads asc, est_live_rows asc;
