begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.workspaces (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(btrim(name)) between 1 and 120),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create table public.workspace_members (
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check (role in ('owner','editor','viewer')),
 primary key (workspace_id,user_id)
);
create index workspace_members_user_idx on public.workspace_members(user_id);
create index workspaces_creator_idx on public.workspaces(created_by);
create table public.projects (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 name text not null check (length(btrim(name)) between 1 and 200),
 created_at timestamptz not null default now()
);
create index projects_workspace_idx on public.projects(workspace_id);
create table public.survey_drafts (
 project_id uuid primary key references public.projects(id) on delete cascade,
 document jsonb not null default '{"schemaVersion":1,"sections":[]}'::jsonb,
 revision bigint not null default 0 check (revision >= 0),
 updated_at timestamptz not null default now(),
 check (jsonb_typeof(document) = 'object'),
 check (octet_length(document::text) <= 1048576)
);

create function private.has_workspace_access(w uuid, can_edit boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.workspace_members m
 where m.workspace_id=w and m.user_id=(select auth.uid())
 and (not can_edit or m.role in ('owner','editor')));
$$;
revoke all on function private.has_workspace_access(uuid,boolean) from public;
grant execute on function private.has_workspace_access(uuid,boolean) to authenticated;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.survey_drafts enable row level security;
create policy member_read on public.workspaces for select to authenticated
 using (private.has_workspace_access(id));
create policy member_read on public.workspace_members for select to authenticated
 using (private.has_workspace_access(workspace_id));
create policy member_read on public.projects for select to authenticated
 using (private.has_workspace_access(workspace_id));
create policy member_read on public.survey_drafts for select to authenticated
 using (exists(select 1 from public.projects p where p.id=project_id));
revoke all on public.workspaces,public.workspace_members,public.projects,public.survey_drafts from anon,authenticated;
grant select on public.workspaces,public.workspace_members,public.projects,public.survey_drafts to authenticated;

create function public.create_workspace(workspace_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid; actor uuid := auth.uid();
begin
 if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
 insert into public.workspaces(name,created_by) values(btrim(workspace_name),actor) returning id into new_id;
 insert into public.workspace_members values(new_id,actor,'owner');
 return new_id;
end;
$$;
create function public.create_project(workspace uuid, project_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
 if not private.has_workspace_access(workspace,true) then raise exception 'Access denied' using errcode='42501'; end if;
 insert into public.projects(workspace_id,name) values(workspace,btrim(project_name)) returning id into new_id;
 insert into public.survey_drafts(project_id) values(new_id);
 return new_id;
end;
$$;
create function public.save_survey_draft(project uuid, expected_revision bigint, new_document jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare new_revision bigint;
begin
 if not exists(select 1 from public.projects p where p.id=project and private.has_workspace_access(p.workspace_id,true))
 then raise exception 'Access denied' using errcode='42501'; end if;
 if new_document is null or jsonb_typeof(new_document) is distinct from 'object'
 or new_document->'schemaVersion' is distinct from '1'::jsonb
 or jsonb_typeof(new_document->'sections') is distinct from 'array'
 then raise exception 'Invalid draft envelope' using errcode='22023'; end if;
 update public.survey_drafts set document=new_document,revision=revision+1,updated_at=now()
 where project_id=project and revision=expected_revision returning revision into new_revision;
 if new_revision is null then raise exception 'Draft changed; reload before saving' using errcode='40001'; end if;
 return new_revision;
end;
$$;
revoke all on function public.create_workspace(text),public.create_project(uuid,text),public.save_survey_draft(uuid,bigint,jsonb) from public,anon;
grant execute on function public.create_workspace(text),public.create_project(uuid,text),public.save_survey_draft(uuid,bigint,jsonb) to authenticated;
commit;
