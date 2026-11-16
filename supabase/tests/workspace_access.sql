-- Run only in development. All fixtures are rolled back, including auth users.
begin;
create temporary table fixture(actor uuid, outsider uuid, viewer uuid, workspace uuid, project uuid);
insert into fixture(actor,outsider,viewer) values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid());
insert into auth.users(id) select actor from fixture union all select outsider from fixture union all select viewer from fixture;
grant select,update on fixture to authenticated;
select set_config('request.jwt.claim.sub',(select actor::text from fixture),true);
set local role authenticated;
update fixture set workspace=public.create_workspace('Test workspace');
update fixture set project=public.create_project(workspace,'Test project');
do $$begin
 if (select count(*) from public.projects)<>1 then raise exception 'Owner read failed'; end if;
 if public.save_survey_draft((select project from fixture),0,'{"schemaVersion":1,"sections":[]}')<>1 then raise exception 'Save failed'; end if;
 begin
  perform public.save_survey_draft((select project from fixture),0,'{"schemaVersion":1,"sections":[]}');
  raise exception 'Stale write accepted';
 exception when sqlstate 'PT409' then null; end;
 begin
  perform public.save_survey_draft((select project from fixture),1,'{}');
  raise exception 'Invalid document accepted';
 exception when invalid_parameter_value then null; end;
end$$;
reset role;
insert into public.workspace_members select workspace,viewer,'viewer' from fixture;
select set_config('request.jwt.claim.sub',(select viewer::text from fixture),true);
set local role authenticated;
do $$begin
 if (select count(*) from public.survey_drafts)<>1 then raise exception 'Viewer read failed'; end if;
 begin
  perform public.save_survey_draft((select project from fixture),1,'{"schemaVersion":1,"sections":[]}');
  raise exception 'Viewer write accepted';
 exception when insufficient_privilege then null; end;
 begin
  update public.workspace_members set role='owner';
  raise exception 'Role escalation accepted';
 exception when insufficient_privilege then null; end;
end$$;
reset role;
select set_config('request.jwt.claim.sub',(select outsider::text from fixture),true);
set local role authenticated;
do $$begin
 if exists(select 1 from public.workspaces) or exists(select 1 from public.projects)
 or exists(select 1 from public.workspace_members) or exists(select 1 from public.survey_drafts)
 then raise exception 'Nonmember data leak'; end if;
 begin
  perform public.create_project((select workspace from fixture),'Forbidden');
  raise exception 'Nonmember project creation accepted';
 exception when insufficient_privilege then null; end;
end$$;
reset role;
set local role anon;
do $$begin
 begin
  perform public.create_workspace('Forbidden');
  raise exception 'Anonymous creation accepted';
 exception when insufficient_privilege then null; end;
end$$;
reset role;
rollback;
select 'PASS: owner save, stale conflict, invalid draft, viewer, escalation, nonmember and anonymous checks' as result;
