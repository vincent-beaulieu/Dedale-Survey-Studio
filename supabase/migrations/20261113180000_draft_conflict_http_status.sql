create or replace function public.save_survey_draft(project uuid, expected_revision bigint, new_document jsonb)
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
 if new_revision is null then raise exception 'Draft changed; reload before saving' using errcode='PT409'; end if;
 return new_revision;
end;
$$;
