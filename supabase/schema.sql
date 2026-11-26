-- SkillBridge database schema for Supabase (PostgreSQL).
-- Paste into the Supabase SQL editor and press Run. It is safe to run again.
--
-- Security model, in one paragraph: every table has Row Level Security. Candidates can only touch their own rows.
-- Verification status, assessment scoring, reviewer decisions and public profiles all go through
-- SECURITY DEFINER functions (RPCs) or triggers, so the browser can never mark itself verified,
-- never reads the answer key, and never sees another person's private data.

-- ---------------------------------------------------------------------------------------------
-- 0. A shared list of professional fields (a domain, so every table uses the same list)
-- ---------------------------------------------------------------------------------------------
do $$
begin
  create domain public.skill_field as text
    check (value in ('', 'Software Development', 'Accounting & Finance', 'Nursing & Healthcare', 'Teaching & Education', 'Other'));
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------------------------
-- 1. Profiles (one per signed-up user)
-- ---------------------------------------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text not null default '' check (char_length(full_name) <= 120),
  role            text not null default 'candidate' check (role in ('candidate', 'reviewer')),
  headline        text not null default '' check (char_length(headline) <= 160),
  field           public.skill_field not null default '',
  origin_country  text not null default '' check (char_length(origin_country) <= 80),
  current_country text not null default '' check (char_length(current_country) <= 80),
  bio             text not null default '' check (char_length(bio) <= 1500),
  slug            text unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 50),
  is_public       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create or replace function public.is_reviewer() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'reviewer');
$$;

create or replace function public.slugify(p_text text) returns text
language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(coalesce(p_text, '')), '[^a-z0-9]+', '-', 'g'));
$$;

-- Keeps updated_at current, blocks self-promotion to reviewer, and makes sure a public profile has a link name.
create or replace function public.profiles_before_write() returns trigger
language plpgsql as $$
declare
  base text;
begin
  if tg_op = 'UPDATE' then
    if current_user = 'authenticated' then
      if new.role is distinct from old.role then
        raise exception 'You cannot change your own role';
      end if;
      if new.id is distinct from old.id then
        raise exception 'You cannot change the profile id';
      end if;
    end if;
    new.updated_at := now();
  end if;
  if new.is_public and new.slug is null then
    base := public.slugify(new.full_name);
    if char_length(base) < 3 then base := 'member'; end if;
    new.slug := left(base, 40) || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 5);
  end if;
  return new;
end $$;

drop trigger if exists profiles_before_write on public.profiles;
create trigger profiles_before_write before insert or update on public.profiles
  for each row execute function public.profiles_before_write();

-- A profile row is created automatically when someone signs up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_reviewer());
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid() and role = 'candidate');
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------------------------
-- 2. Credential claims (degrees, certificates, licences, work experience) and their evidence
-- ---------------------------------------------------------------------------------------------
create table if not exists public.credentials (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  kind                text not null check (kind in ('degree', 'certificate', 'license', 'work_experience')),
  title               text not null check (char_length(title) between 2 and 160),
  institution         text not null default '' check (char_length(institution) <= 160),
  country             text not null default '' check (char_length(country) <= 80),
  year                int check (year between 1950 and 2100),
  field               public.skill_field not null default '',
  description         text not null default '' check (char_length(description) <= 2000),
  status              text not null default 'unverified' check (status in ('unverified', 'pending', 'verified', 'rejected')),
  verification_method text check (verification_method in ('document_review', 'issuer_confirmation', 'reference_check', 'interview')),
  reviewer_note       text not null default '' check (char_length(reviewer_note) <= 1000),
  reviewed_by         uuid references public.profiles(id) on delete set null,
  reviewed_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint verified_needs_method check (status <> 'verified' or verification_method is not null)
);
create index if not exists credentials_user_idx on public.credentials (user_id);
create index if not exists credentials_status_idx on public.credentials (status);

-- The owner may edit the claim and send it for review. Everything else about verification is off limits:
-- changing a claim that is pending or verified sends it back to "unverified", so a verified badge can never
-- be kept while the claim underneath it is quietly changed.
create or replace function public.credentials_before_update() returns trigger
language plpgsql as $$
declare
  claim_changed boolean;
begin
  new.updated_at := now();
  if current_user <> 'authenticated' then
    return new;  -- trusted callers: the SQL editor and the reviewer functions below
  end if;
  if new.user_id is distinct from old.user_id then
    raise exception 'You cannot move a credential to another person';
  end if;
  claim_changed := (new.kind, new.title, new.institution, new.country, new.year, new.field, new.description)
                   is distinct from (old.kind, old.title, old.institution, old.country, old.year, old.field, old.description);
  new.verification_method := old.verification_method;
  new.reviewer_note := old.reviewer_note;
  new.reviewed_by := old.reviewed_by;
  new.reviewed_at := old.reviewed_at;
  if new.status is distinct from old.status then
    if not ((old.status in ('unverified', 'rejected') and new.status = 'pending')
            or (old.status = 'pending' and new.status = 'unverified')) then
      raise exception 'You cannot change the verification status yourself';
    end if;
  elsif claim_changed and old.status in ('pending', 'verified') then
    new.status := 'unverified';
    new.verification_method := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
  end if;
  return new;
end $$;

create or replace function public.credentials_before_insert() returns trigger
language plpgsql as $$
begin
  if current_user = 'authenticated' then
    new.status := 'unverified';
    new.verification_method := null;
    new.reviewer_note := '';
    new.reviewed_by := null;
    new.reviewed_at := null;
  end if;
  return new;
end $$;

drop trigger if exists credentials_before_update on public.credentials;
create trigger credentials_before_update before update on public.credentials
  for each row execute function public.credentials_before_update();
drop trigger if exists credentials_before_insert on public.credentials;
create trigger credentials_before_insert before insert on public.credentials
  for each row execute function public.credentials_before_insert();

alter table public.credentials enable row level security;
drop policy if exists credentials_select on public.credentials;
drop policy if exists credentials_insert on public.credentials;
drop policy if exists credentials_update on public.credentials;
drop policy if exists credentials_delete on public.credentials;
create policy credentials_select on public.credentials for select to authenticated
  using (user_id = auth.uid() or public.is_reviewer());
create policy credentials_insert on public.credentials for insert to authenticated
  with check (user_id = auth.uid());
create policy credentials_update on public.credentials for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy credentials_delete on public.credentials for delete to authenticated
  using (user_id = auth.uid());

create table if not exists public.evidence (
  id            uuid primary key default gen_random_uuid(),
  credential_id uuid not null references public.credentials(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  file_path     text not null,
  file_name     text not null check (char_length(file_name) <= 200),
  file_size     bigint check (file_size >= 0),
  mime_type     text not null default '',
  created_at    timestamptz not null default now()
);
create index if not exists evidence_credential_idx on public.evidence (credential_id);

alter table public.evidence enable row level security;
drop policy if exists evidence_select on public.evidence;
drop policy if exists evidence_insert on public.evidence;
drop policy if exists evidence_delete on public.evidence;
create policy evidence_select on public.evidence for select to authenticated
  using (user_id = auth.uid() or public.is_reviewer());
create policy evidence_insert on public.evidence for insert to authenticated
  with check (user_id = auth.uid()
              and exists (select 1 from public.credentials c where c.id = credential_id and c.user_id = auth.uid()));
create policy evidence_delete on public.evidence for delete to authenticated
  using (user_id = auth.uid());

-- Private storage bucket for the files. Files live at <user id>/<credential id>/<file>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidence', 'evidence', false, 5242880, array['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = 5242880,
      allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

drop policy if exists evidence_files_insert on storage.objects;
drop policy if exists evidence_files_select on storage.objects;
drop policy if exists evidence_files_delete on storage.objects;
create policy evidence_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);
create policy evidence_files_select on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_reviewer()));
create policy evidence_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------------------------
-- 3. Skills assessments. The answer key is never readable from the browser.
-- ---------------------------------------------------------------------------------------------
create table if not exists public.assessments (
  id          text primary key,
  field       public.skill_field not null,
  title       text not null,
  description text not null default '',
  pass_mark   int not null default 65 check (pass_mark between 1 and 100)
);

create table if not exists public.assessment_questions (
  id            bigint generated always as identity primary key,
  assessment_id text not null references public.assessments(id) on delete cascade,
  position      int not null,
  prompt        text not null,
  options       jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6),
  correct_index int not null check (correct_index >= 0),
  unique (assessment_id, position)
);

create table if not exists public.assessment_attempts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  assessment_id text not null references public.assessments(id) on delete cascade,
  score         int not null,
  total         int not null,
  percent       int not null,
  passed        boolean not null,
  created_at    timestamptz not null default now()
);
create index if not exists attempts_user_idx on public.assessment_attempts (user_id, assessment_id);

alter table public.assessments enable row level security;
alter table public.assessment_questions enable row level security;   -- no policies: closed to the browser
alter table public.assessment_attempts enable row level security;
drop policy if exists assessments_select on public.assessments;
drop policy if exists attempts_select on public.assessment_attempts;
create policy assessments_select on public.assessments for select to anon, authenticated using (true);
create policy attempts_select on public.assessment_attempts for select to authenticated
  using (user_id = auth.uid() or public.is_reviewer());

-- Questions without the answer key, in random order.
create or replace function public.get_assessment(p_assessment_id text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  result jsonb;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  select jsonb_build_object(
           'id', a.id, 'title', a.title, 'field', a.field, 'description', a.description, 'pass_mark', a.pass_mark,
           'questions', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'prompt', q.prompt, 'options', q.options)
                                                    order by random())
                                  from public.assessment_questions q where q.assessment_id = a.id), '[]'::jsonb))
    into result
    from public.assessments a where a.id = p_assessment_id;
  if result is null then raise exception 'Assessment not found'; end if;
  return result;
end $$;

-- Scores an attempt on the server. p_answers looks like {"12": 0, "13": 2} (question id -> chosen option).
-- Only the total comes back, never which answers were right, and attempts are limited per day.
create or replace function public.submit_assessment(p_assessment_id text, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  a public.assessments%rowtype;
  q record;
  total_q int := 0;
  correct_q int := 0;
  pct int;
  did_pass boolean;
  used_today int;
  max_per_day constant int := 5;
  new_attempt public.assessment_attempts%rowtype;
begin
  if uid is null then raise exception 'Please sign in first'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then raise exception 'Answers must be an object'; end if;
  select * into a from public.assessments where id = p_assessment_id;
  if not found then raise exception 'Assessment not found'; end if;
  select count(*) into used_today from public.assessment_attempts
    where user_id = uid and assessment_id = p_assessment_id and created_at > now() - interval '24 hours';
  if used_today >= max_per_day then
    raise exception 'You have used all % attempts for this assessment in the last 24 hours. Please try again later.', max_per_day;
  end if;
  for q in select id, correct_index from public.assessment_questions where assessment_id = p_assessment_id loop
    total_q := total_q + 1;
    if (p_answers ->> q.id::text) ~ '^[0-9]{1,3}$' and (p_answers ->> q.id::text)::int = q.correct_index then
      correct_q := correct_q + 1;
    end if;
  end loop;
  if total_q = 0 then raise exception 'This assessment has no questions yet'; end if;
  pct := round(100.0 * correct_q / total_q);
  did_pass := pct >= a.pass_mark;
  insert into public.assessment_attempts (user_id, assessment_id, score, total, percent, passed)
  values (uid, p_assessment_id, correct_q, total_q, pct, did_pass)
  returning * into new_attempt;
  return jsonb_build_object('id', new_attempt.id, 'assessment_id', p_assessment_id, 'score', correct_q, 'total', total_q,
                            'percent', pct, 'passed', did_pass, 'pass_mark', a.pass_mark,
                            'attempts_left', max_per_day - used_today - 1);
end $$;

-- ---------------------------------------------------------------------------------------------
-- 4. Bridging steps (certifications and re-certification routes) and fee-waiver requests
-- ---------------------------------------------------------------------------------------------
create table if not exists public.bridging_steps (
  id               text primary key,
  field            public.skill_field not null,
  title            text not null,
  provider         text not null,
  description      text not null default '',
  url              text,
  cost_note        text not null default 'Fees vary - check with the provider',
  waiver_available boolean not null default false
);

create table if not exists public.waiver_requests (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  bridging_step_id text not null references public.bridging_steps(id) on delete cascade,
  credential_id    uuid references public.credentials(id) on delete set null,
  message          text not null default '' check (char_length(message) <= 1000),
  status           text not null default 'requested' check (status in ('requested', 'approved', 'declined')),
  reviewer_note    text not null default '' check (char_length(reviewer_note) <= 1000),
  reviewed_by      uuid references public.profiles(id) on delete set null,
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now(),
  unique (user_id, bridging_step_id)
);

alter table public.bridging_steps enable row level security;
alter table public.waiver_requests enable row level security;
drop policy if exists bridging_select on public.bridging_steps;
drop policy if exists waivers_select on public.waiver_requests;
drop policy if exists waivers_insert on public.waiver_requests;
drop policy if exists waivers_delete on public.waiver_requests;
create policy bridging_select on public.bridging_steps for select to anon, authenticated using (true);
create policy waivers_select on public.waiver_requests for select to authenticated
  using (user_id = auth.uid() or public.is_reviewer());
create policy waivers_insert on public.waiver_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'requested'
              and exists (select 1 from public.bridging_steps b where b.id = bridging_step_id and b.waiver_available));
create policy waivers_delete on public.waiver_requests for delete to authenticated
  using (user_id = auth.uid() and status = 'requested');

-- ---------------------------------------------------------------------------------------------
-- 5. Introduction requests from employers (no account needed to send one)
-- ---------------------------------------------------------------------------------------------
create table if not exists public.introductions (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  from_name  text not null check (char_length(from_name) between 2 and 120),
  from_org   text not null default '' check (char_length(from_org) <= 160),
  from_email text not null check (from_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(from_email) <= 200),
  message    text not null check (char_length(message) between 10 and 1500),
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists introductions_profile_idx on public.introductions (profile_id, created_at desc);

alter table public.introductions enable row level security;
drop policy if exists introductions_select on public.introductions;
drop policy if exists introductions_update on public.introductions;
create policy introductions_select on public.introductions for select to authenticated using (profile_id = auth.uid());
create policy introductions_update on public.introductions for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
revoke update on public.introductions from authenticated;
grant update (is_read) on public.introductions to authenticated;

create or replace function public.request_introduction(p_slug text, p_name text, p_org text, p_email text, p_message text)
returns void language plpgsql security definer set search_path = public as $$
declare
  target uuid;
begin
  select id into target from public.profiles where slug = p_slug and is_public;
  if target is null then raise exception 'That profile is not available'; end if;
  if (select count(*) from public.introductions
        where profile_id = target and lower(from_email) = lower(trim(p_email))
          and created_at > now() - interval '24 hours') >= 3 then
    raise exception 'You have already sent several messages to this person today. Please wait for a reply.';
  end if;
  insert into public.introductions (profile_id, from_name, from_org, from_email, message)
  values (target, trim(p_name), coalesce(trim(p_org), ''), trim(p_email), trim(p_message));
end $$;

-- ---------------------------------------------------------------------------------------------
-- 6. Public read functions (what employers and the home page see)
-- ---------------------------------------------------------------------------------------------
create or replace function public.get_public_profile(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  p public.profiles%rowtype;
begin
  select * into p from public.profiles where slug = p_slug and is_public;
  if not found then return null; end if;
  return jsonb_build_object(
    'slug', p.slug, 'full_name', p.full_name, 'headline', p.headline, 'field', p.field,
    'origin_country', p.origin_country, 'current_country', p.current_country, 'bio', p.bio,
    'member_since', p.created_at,
    'credentials', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id, 'kind', c.kind, 'title', c.title, 'institution', c.institution, 'country', c.country,
               'year', c.year, 'field', c.field,
               -- a rejected claim is shown as plain "unverified": the reason stays between the person and the reviewer
               'status', case when c.status = 'verified' then 'verified' else 'unverified' end,
               'verification_method', case when c.status = 'verified' then c.verification_method end,
               'has_evidence', exists (select 1 from public.evidence e where e.credential_id = c.id))
             order by (c.status = 'verified') desc, c.year desc nulls last, c.created_at)
      from public.credentials c where c.user_id = p.id), '[]'::jsonb),
    'assessments', coalesce((
      select jsonb_agg(jsonb_build_object(
               'assessment_id', t.assessment_id, 'title', a.title, 'field', a.field,
               'best_percent', t.best_percent, 'attempts', t.attempts, 'passed', t.passed,
               'pass_mark', a.pass_mark, 'last_attempt', t.last_attempt)
             order by t.passed desc, t.best_percent desc)
      from (select assessment_id, max(percent) as best_percent, count(*) as attempts,
                   bool_or(passed) as passed, max(created_at) as last_attempt
              from public.assessment_attempts where user_id = p.id group by assessment_id) t
      join public.assessments a on a.id = t.assessment_id), '[]'::jsonb));
end $$;

create or replace function public.list_public_profiles(p_field text default '', p_verified_only boolean default false)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(row_to_json(r)::jsonb order by r.verified_credentials + r.passed_assessments desc, r.full_name), '[]'::jsonb)
  from (
    select p.slug, p.full_name, p.headline, p.field, p.current_country,
           (select count(*) from public.credentials c where c.user_id = p.id and c.status = 'verified')::int as verified_credentials,
           (select count(*) from public.credentials c where c.user_id = p.id)::int as total_credentials,
           (select count(distinct t.assessment_id) from public.assessment_attempts t where t.user_id = p.id and t.passed)::int as passed_assessments
    from public.profiles p
    where p.is_public and p.slug is not null and p.role = 'candidate'
      and (coalesce(p_field, '') = '' or p.field = p_field)
    limit 200
  ) r
  where not coalesce(p_verified_only, false) or r.verified_credentials + r.passed_assessments > 0;
$$;

create or replace function public.platform_stats() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'candidates', (select count(*) from public.profiles where role = 'candidate'),
    'public_profiles', (select count(*) from public.profiles where role = 'candidate' and is_public),
    'verified_credentials', (select count(*) from public.credentials where status = 'verified'),
    'assessments_passed', (select count(*) from public.assessment_attempts where passed),
    'bridging_steps', (select count(*) from public.bridging_steps));
$$;

-- ---------------------------------------------------------------------------------------------
-- 7. Reviewer functions
-- ---------------------------------------------------------------------------------------------
create or replace function public.reviewer_queue() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_reviewer() then raise exception 'Reviewers only'; end if;
  return jsonb_build_object(
    'credentials', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id, 'kind', c.kind, 'title', c.title, 'institution', c.institution, 'country', c.country,
               'year', c.year, 'field', c.field, 'description', c.description, 'updated_at', c.updated_at,
               'owner_id', c.user_id, 'owner_name', p.full_name,
               'evidence', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'file_name', e.file_name,
                                       'file_path', e.file_path, 'mime_type', e.mime_type) order by e.created_at)
                                     from public.evidence e where e.credential_id = c.id), '[]'::jsonb))
             order by c.updated_at)
      from public.credentials c join public.profiles p on p.id = c.user_id
      where c.status = 'pending'), '[]'::jsonb),
    'waivers', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', w.id, 'message', w.message, 'created_at', w.created_at, 'owner_id', w.user_id,
               'owner_name', p.full_name, 'step_id', b.id, 'step_title', b.title, 'provider', b.provider)
             order by w.created_at)
      from public.waiver_requests w
      join public.profiles p on p.id = w.user_id
      join public.bridging_steps b on b.id = w.bridging_step_id
      where w.status = 'requested'), '[]'::jsonb));
end $$;

create or replace function public.review_credential(p_credential_id uuid, p_decision text, p_method text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare
  c public.credentials%rowtype;
begin
  if not public.is_reviewer() then raise exception 'Reviewers only'; end if;
  select * into c from public.credentials where id = p_credential_id;
  if not found then raise exception 'Credential not found'; end if;
  if c.user_id = auth.uid() then raise exception 'You cannot review your own credential'; end if;
  if c.status <> 'pending' then raise exception 'This credential is not waiting for review'; end if;
  if p_decision = 'approve' then
    if p_method is null or p_method not in ('document_review', 'issuer_confirmation', 'reference_check', 'interview') then
      raise exception 'Choose how it was verified';
    end if;
    update public.credentials
       set status = 'verified', verification_method = p_method, reviewer_note = left(coalesce(p_note, ''), 1000),
           reviewed_by = auth.uid(), reviewed_at = now()
     where id = p_credential_id;
  elsif p_decision = 'reject' then
    if char_length(trim(coalesce(p_note, ''))) < 5 then raise exception 'Please explain what is missing so the candidate can fix it'; end if;
    update public.credentials
       set status = 'rejected', verification_method = null, reviewer_note = left(trim(p_note), 1000),
           reviewed_by = auth.uid(), reviewed_at = now()
     where id = p_credential_id;
  else
    raise exception 'Decision must be approve or reject';
  end if;
end $$;

create or replace function public.decide_waiver(p_id uuid, p_decision text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare
  w public.waiver_requests%rowtype;
begin
  if not public.is_reviewer() then raise exception 'Reviewers only'; end if;
  select * into w from public.waiver_requests where id = p_id;
  if not found then raise exception 'Request not found'; end if;
  if w.user_id = auth.uid() then raise exception 'You cannot decide your own request'; end if;
  if w.status <> 'requested' then raise exception 'This request has already been decided'; end if;
  if p_decision not in ('approve', 'decline') then raise exception 'Decision must be approve or decline'; end if;
  update public.waiver_requests
     set status = case when p_decision = 'approve' then 'approved' else 'declined' end,
         reviewer_note = left(coalesce(p_note, ''), 1000), reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_id;
end $$;

-- ---------------------------------------------------------------------------------------------
-- 8. Who may call what
-- ---------------------------------------------------------------------------------------------
revoke all on function public.get_assessment(text) from public, anon;
revoke all on function public.submit_assessment(text, jsonb) from public, anon;
revoke all on function public.reviewer_queue() from public, anon;
revoke all on function public.review_credential(uuid, text, text, text) from public, anon;
revoke all on function public.decide_waiver(uuid, text, text) from public, anon;
grant execute on function public.get_assessment(text) to authenticated;
grant execute on function public.submit_assessment(text, jsonb) to authenticated;
grant execute on function public.reviewer_queue() to authenticated;
grant execute on function public.review_credential(uuid, text, text, text) to authenticated;
grant execute on function public.decide_waiver(uuid, text, text) to authenticated;
grant execute on function public.get_public_profile(text) to anon, authenticated;
grant execute on function public.list_public_profiles(text, boolean) to anon, authenticated;
grant execute on function public.platform_stats() to anon, authenticated;
grant execute on function public.request_introduction(text, text, text, text, text) to anon, authenticated;
grant execute on function public.is_reviewer() to authenticated;
