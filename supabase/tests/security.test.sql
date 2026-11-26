-- SkillBridge security tests. Run AFTER schema.sql and seed.sql, on a throwaway project or a local database.
-- Everything happens inside one transaction that is rolled back at the end, so no data is kept.
-- Each block raises an error if a rule is broken; you should see only NOTICE lines starting with PASS.
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/security.test.sql

begin;

create or replace function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uid::text, true);
  set local role authenticated;
end $$;

create or replace function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  set local role anon;
end $$;

-- Runs a statement and requires it to fail with a message containing `fragment`.
create or replace function pg_temp.expect_error(stmt text, fragment text) returns void language plpgsql as $$
declare
  failed boolean := false;
  msg text;
begin
  begin
    execute stmt;
  exception when others then
    failed := true;
    msg := sqlerrm;
  end;
  if not failed then raise exception 'EXPECTED AN ERROR containing "%" but the statement succeeded: %', fragment, stmt; end if;
  if position(lower(fragment) in lower(msg)) = 0 then
    raise exception 'EXPECTED error containing "%" but got "%" for: %', fragment, msg, stmt;
  end if;
end $$;

create or replace function pg_temp.expect_count(stmt text, expected int, label text) returns void language plpgsql as $$
declare n int;
begin
  execute 'select count(*) from (' || stmt || ') t' into n;
  if n <> expected then raise exception 'FAIL %: expected % rows, got %', label, expected, n; end if;
end $$;

create or replace function pg_temp.expect_affected(stmt text, expected int, label text) returns void language plpgsql as $$
declare n int;
begin
  execute stmt;
  get diagnostics n = row_count;
  if n <> expected then raise exception 'FAIL %: expected % rows affected, got %', label, expected, n; end if;
end $$;

-- People: A and B are candidates, R is a reviewer.
reset role;
insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'sbtest-a@example.invalid', '{"full_name": "Amani Test"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'sbtest-b@example.invalid', '{"full_name": "Baraka Test"}'),
  ('cccccccc-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'sbtest-r@example.invalid', '{"full_name": "Rita Reviewer"}');
update public.profiles set role = 'reviewer' where id = 'cccccccc-0000-0000-0000-000000000003';

do $$ begin
  perform pg_temp.expect_count($q$select 1 from public.profiles where full_name = 'Amani Test'$q$, 1, 'profile created on sign-up');
  raise notice 'PASS: a profile is created automatically when a user signs up';
end $$;

-- Profiles ---------------------------------------------------------------------------------
do $$ begin
  perform pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
  perform pg_temp.expect_error($q$update public.profiles set role = 'reviewer' where id = auth.uid()$q$, 'cannot change your own role');
  perform pg_temp.expect_count($q$select 1 from public.profiles$q$, 1, 'a candidate sees only their own profile');
  perform pg_temp.as_user('cccccccc-0000-0000-0000-000000000003');
  perform pg_temp.expect_count($q$select 1 from public.profiles$q$, 3, 'a reviewer sees every profile');
  perform pg_temp.as_anon();
  perform pg_temp.expect_count($q$select 1 from public.profiles$q$, 0, 'anonymous visitors see no profiles directly');
  reset role;
  raise notice 'PASS: nobody can make themselves a reviewer, and profiles are private by default';
end $$;

-- Credentials: a candidate cannot award themselves verification ---------------------------------
do $$ begin
  perform pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
  insert into public.credentials (id, user_id, kind, title, institution, country, year, field, status, verification_method, reviewer_note)
  values ('a1000000-0000-0000-0000-000000000001', auth.uid(), 'degree', 'BSc Computer Science', 'University of Khartoum', 'Sudan', 2015,
          'Software Development', 'verified', 'document_review', 'self-approved');
  perform pg_temp.expect_count($q$select 1 from public.credentials where id = 'a1000000-0000-0000-0000-000000000001'
                                  and status = 'unverified' and verification_method is null and reviewer_note = ''$q$, 1,
                               'inserting with status verified is reset to unverified');
  perform pg_temp.expect_error($q$update public.credentials set status = 'verified' where id = 'a1000000-0000-0000-0000-000000000001'$q$,
                               'cannot change the verification status');
  update public.credentials set reviewer_note = 'I am great', verification_method = 'interview'
   where id = 'a1000000-0000-0000-0000-000000000001';
  perform pg_temp.expect_count($q$select 1 from public.credentials where id = 'a1000000-0000-0000-0000-000000000001'
                                  and reviewer_note = '' and verification_method is null$q$, 1, 'reviewer fields cannot be edited by the owner');
  update public.credentials set status = 'pending' where id = 'a1000000-0000-0000-0000-000000000001';
  perform pg_temp.expect_count($q$select 1 from public.credentials where status = 'pending'$q$, 1, 'owner can send a claim for review');
  perform pg_temp.expect_error($q$insert into public.credentials (user_id, kind, title) values ('bbbbbbbb-0000-0000-0000-000000000002', 'degree', 'Fake')$q$,
                               'row-level security');
  reset role;
  raise notice 'PASS: candidates cannot verify themselves or write for someone else';
end $$;

do $$ begin
  perform pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
  perform pg_temp.expect_count($q$select 1 from public.credentials$q$, 0, 'another candidate cannot see A''s claims');
  perform pg_temp.expect_error($q$insert into public.evidence (credential_id, user_id, file_path, file_name)
                                  values ('a1000000-0000-0000-0000-000000000001', auth.uid(), 'x/y/z.pdf', 'z.pdf')$q$, 'row-level security');
  perform pg_temp.expect_affected($q$delete from public.credentials where id = 'a1000000-0000-0000-0000-000000000001'$q$, 0, 'cannot delete another person''s claim');
  perform pg_temp.as_user('cccccccc-0000-0000-0000-000000000003');
  perform pg_temp.expect_count($q$select 1 from public.credentials$q$, 1, 'reviewer sees the claim');
  reset role;
  raise notice 'PASS: claims and evidence are private to the owner and reviewers';
end $$;

-- Evidence ------------------------------------------------------------------------------------------
do $$ begin
  perform pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
  insert into public.evidence (credential_id, user_id, file_path, file_name, file_size, mime_type)
  values ('a1000000-0000-0000-0000-000000000001', auth.uid(),
          'aaaaaaaa-0000-0000-0000-000000000001/a1000000-0000-0000-0000-000000000001/degree.pdf', 'degree.pdf', 1000, 'application/pdf');
  perform pg_temp.expect_count($q$select 1 from public.evidence$q$, 1, 'owner can attach evidence');
  perform pg_temp.expect_error($q$insert into public.evidence (credential_id, user_id, file_path, file_name)
                                  values ('a1000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'x', 'x')$q$, 'row-level security');
  -- storage policies
  insert into storage.objects (bucket_id, name) values ('evidence', 'aaaaaaaa-0000-0000-0000-000000000001/a1000000-0000-0000-0000-000000000001/degree.pdf');
  perform pg_temp.expect_error($q$insert into storage.objects (bucket_id, name) values ('evidence', 'bbbbbbbb-0000-0000-0000-000000000002/other/hack.pdf')$q$, 'row-level security');
  perform pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
  perform pg_temp.expect_count($q$select 1 from storage.objects where bucket_id = 'evidence'$q$, 0, 'another candidate cannot read the file');
  perform pg_temp.as_user('cccccccc-0000-0000-0000-000000000003');
  perform pg_temp.expect_count($q$select 1 from storage.objects where bucket_id = 'evidence'$q$, 1, 'a reviewer can read the file');
  reset role;
  raise notice 'PASS: evidence files are private to the owner and reviewers';
end $$;

-- Reviewing ------------------------------------------------------------------------------------------
do $$ begin
  perform pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
  perform pg_temp.expect_error($q$select public.review_credential('a1000000-0000-0000-0000-000000000001', 'approve', 'document_review', '')$q$, 'Reviewers only');
  perform pg_temp.expect_error($q$select public.reviewer_queue()$q$, 'Reviewers only');
  perform pg_temp.as_user('cccccccc-0000-0000-0000-000000000003');
  perform pg_temp.expect_error($q$select public.review_credential('a1000000-0000-0000-0000-000000000001', 'approve', null, '')$q$, 'Choose how it was verified');
  perform pg_temp.expect_error($q$select public.review_credential('a1000000-0000-0000-0000-000000000001', 'reject', null, 'no')$q$, 'explain what is missing');
  if jsonb_array_length(public.reviewer_queue() -> 'credentials') <> 1 then raise exception 'FAIL: the reviewer queue should hold one claim'; end if;
  if jsonb_array_length(public.reviewer_queue() -> 'credentials' -> 0 -> 'evidence') <> 1 then raise exception 'FAIL: the queue should include the evidence'; end if;
  perform public.review_credential('a1000000-0000-0000-0000-000000000001', 'approve', 'document_review', 'Degree certificate checked');
  reset role;
  perform pg_temp.expect_count($q$select 1 from public.credentials where status = 'verified' and verification_method = 'document_review'
                                  and reviewed_by = 'cccccccc-0000-0000-0000-000000000003' and reviewed_at is not null$q$, 1, 'approval recorded');
  raise notice 'PASS: only reviewers can decide, and decisions are recorded';
end $$;

do $$ begin
  perform pg_temp.as_user('cccccccc-0000-0000-0000-000000000003');
  perform pg_temp.expect_error($q$select public.review_credential('a1000000-0000-0000-0000-000000000001', 'approve', 'interview', '')$q$, 'not waiting for review');
  -- a reviewer cannot review their own claim
  insert into public.credentials (id, user_id, kind, title) values ('c1000000-0000-0000-0000-000000000001', auth.uid(), 'certificate', 'My own certificate');
  update public.credentials set status = 'pending' where id = 'c1000000-0000-0000-0000-000000000001';
  perform pg_temp.expect_error($q$select public.review_credential('c1000000-0000-0000-0000-000000000001', 'approve', 'interview', '')$q$, 'cannot review your own');
  -- the owner editing a verified claim sends it back to unverified
  perform pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
  update public.credentials set title = 'MSc Computer Science' where id = 'a1000000-0000-0000-0000-000000000001';
  perform pg_temp.expect_count($q$select 1 from public.credentials where id = 'a1000000-0000-0000-0000-000000000001'
                                  and status = 'unverified' and verification_method is null and reviewed_by is null$q$, 1,
                               'editing a verified claim resets it');
  reset role;
  raise notice 'PASS: no self-review, and a verified badge cannot survive an edit of the claim';
end $$;

-- Assessments ----------------------------------------------------------------------------------------------
do $$
declare
  all_right jsonb;
  all_wrong jsonb;
  quiz jsonb;
  res jsonb;
  i int;
begin
  perform pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
  perform pg_temp.expect_count($q$select 1 from public.assessment_questions$q$, 0, 'the answer key is closed to the browser');
  quiz := public.get_assessment('software-development-fundamentals');
  if jsonb_array_length(quiz -> 'questions') <> 6 then raise exception 'FAIL: expected 6 questions'; end if;
  if quiz::text like '%correct_index%' then raise exception 'FAIL: the answer key leaked into get_assessment'; end if;
  reset role;
  select jsonb_object_agg(id::text, correct_index), jsonb_object_agg(id::text, (correct_index + 1) % 4)
    into all_right, all_wrong
    from public.assessment_questions where assessment_id = 'software-development-fundamentals';
  perform pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
  res := public.submit_assessment('software-development-fundamentals', all_wrong);
  if (res ->> 'passed')::boolean or (res ->> 'score')::int <> 0 then raise exception 'FAIL: all wrong answers should score 0 and fail, got %', res; end if;
  if res::text like '%correct_index%' then raise exception 'FAIL: the result leaked the key'; end if;
  res := public.submit_assessment('software-development-fundamentals', all_right);
  if not (res ->> 'passed')::boolean or (res ->> 'percent')::int <> 100 then raise exception 'FAIL: all right answers should pass with 100, got %', res; end if;
  -- a half-empty answer sheet is scored, not rejected
  res := public.submit_assessment('software-development-fundamentals', '{}'::jsonb);
  if (res ->> 'score')::int <> 0 then raise exception 'FAIL: empty answers should score 0'; end if;
  -- the daily limit: this is attempt 3 of 5, so two more are fine and the sixth is refused
  perform public.submit_assessment('software-development-fundamentals', all_right);
  perform public.submit_assessment('software-development-fundamentals', all_right);
  perform pg_temp.expect_error($q$select public.submit_assessment('software-development-fundamentals', '{}'::jsonb)$q$, 'used all 5 attempts');
  perform pg_temp.expect_error($q$select public.submit_assessment('no-such-test', '{}'::jsonb)$q$, 'Assessment not found');
  perform pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
  perform pg_temp.expect_count($q$select 1 from public.assessment_attempts$q$, 0, 'attempts are private');
  perform pg_temp.as_anon();
  perform pg_temp.expect_error($q$select public.get_assessment('software-development-fundamentals')$q$, 'permission denied');
  perform pg_temp.expect_error($q$select public.submit_assessment('software-development-fundamentals', '{}'::jsonb)$q$, 'permission denied');
  reset role;
  raise notice 'PASS: scoring happens on the server, the key never leaks, attempts are limited, anonymous users are blocked';
end $$;

-- Public profiles ------------------------------------------------------------------------------------------------
do $$
declare
  pub jsonb;
  slug_a text;
  list jsonb;
begin
  perform pg_temp.as_anon();
  if public.get_public_profile('does-not-exist') is not null then raise exception 'FAIL: unknown slug should return null'; end if;
  perform pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
  update public.profiles set is_public = true, headline = 'Backend developer', field = 'Software Development', current_country = 'Kenya' where id = auth.uid();
  select slug into slug_a from public.profiles where id = auth.uid();
  if slug_a is null or slug_a !~ '^amani-test-[a-f0-9]{5}$' then raise exception 'FAIL: expected a generated slug, got %', slug_a; end if;
  -- a rejected claim must look like a plain unverified one in public, with no reviewer note
  insert into public.credentials (id, user_id, kind, title, field) values ('a1000000-0000-0000-0000-000000000002', auth.uid(), 'certificate', 'Cloud certificate', 'Software Development');
  update public.credentials set status = 'pending' where id = 'a1000000-0000-0000-0000-000000000002';
  perform pg_temp.as_user('cccccccc-0000-0000-0000-000000000003');
  perform public.review_credential('a1000000-0000-0000-0000-000000000002', 'reject', null, 'The certificate scan is unreadable');
  perform pg_temp.as_anon();
  pub := public.get_public_profile(slug_a);
  if pub is null then raise exception 'FAIL: public profile should be visible to anonymous visitors'; end if;
  if pub::text like '%unreadable%' or pub::text like '%reviewer_note%' or pub::text like '%rejected%' then raise exception 'FAIL: private reviewer information leaked: %', pub; end if;
  if (select count(*) from jsonb_array_elements(pub -> 'credentials') c where c ->> 'status' = 'unverified') <> 2 then raise exception 'FAIL: both claims should show as unverified'; end if;
  if jsonb_array_length(pub -> 'assessments') <> 1 or not (pub -> 'assessments' -> 0 ->> 'passed')::boolean then raise exception 'FAIL: the passed assessment should be listed'; end if;
  if (pub -> 'assessments' -> 0 ->> 'attempts')::int <> 5 then raise exception 'FAIL: attempts count should be public: %', pub; end if;
  list := public.list_public_profiles('', false);
  if jsonb_array_length(list) <> 1 then raise exception 'FAIL: directory should list one profile, got %', list; end if;
  if jsonb_array_length(public.list_public_profiles('Teaching & Education', false)) <> 0 then raise exception 'FAIL: field filter'; end if;
  if jsonb_array_length(public.list_public_profiles('', true)) <> 1 then raise exception 'FAIL: verified-only should keep A (passed an assessment)'; end if;
  -- B is not public and must not show up anywhere
  if pub::text like '%Baraka%' or list::text like '%Baraka%' then raise exception 'FAIL: B leaked'; end if;
  perform pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
  perform pg_temp.expect_error($q$update public.profiles set slug = 'Bad Slug!' where id = 'aaaaaaaa-0000-0000-0000-000000000001'$q$, 'violates check constraint');
  reset role;
  raise notice 'PASS: public profiles show what is verified, hide reviewer notes, and respect the public switch';
end $$;

do $$
declare
  stats jsonb;
begin
  perform pg_temp.as_anon();
  stats := public.platform_stats();
  if (stats ->> 'public_profiles')::int <> 1 or (stats ->> 'bridging_steps')::int < 10 or (stats ->> 'assessments_passed')::int < 1 then
    raise exception 'FAIL: unexpected stats %', stats;
  end if;
  reset role;
  raise notice 'PASS: platform stats work for anonymous visitors';
end $$;

-- Introductions ----------------------------------------------------------------------------------------------------
do $$
declare
  slug_a text;
begin
  select slug into slug_a from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001';
  perform pg_temp.as_anon();
  perform public.request_introduction(slug_a, 'Hiring Hannah', 'Acme Ltd', 'hannah@acme.example', 'We have a backend role that fits your profile.');
  perform public.request_introduction(slug_a, 'Hiring Hannah', 'Acme Ltd', 'hannah@acme.example', 'Second note about the backend role.');
  perform public.request_introduction(slug_a, 'Hiring Hannah', 'Acme Ltd', 'HANNAH@acme.example', 'Third note about the backend role.');
  perform pg_temp.expect_error(format($q$select public.request_introduction(%L, 'Hiring Hannah', 'Acme', 'hannah@acme.example', 'A fourth message today.')$q$, slug_a), 'already sent several');
  perform pg_temp.expect_error(format($q$select public.request_introduction(%L, 'Bob', '', 'not-an-email', 'This message is long enough.')$q$, slug_a), 'violates check constraint');
  perform pg_temp.expect_error(format($q$select public.request_introduction(%L, 'Bob', '', 'bob@x.example', 'short')$q$, slug_a), 'violates check constraint');
  perform pg_temp.expect_error($q$select public.request_introduction('nobody-here', 'Bob', '', 'bob@x.example', 'This message is long enough.')$q$, 'not available');
  perform pg_temp.expect_count($q$select 1 from public.introductions$q$, 0, 'anonymous visitors cannot read introductions');
  perform pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
  perform pg_temp.expect_count($q$select 1 from public.introductions$q$, 3, 'the owner sees their introductions');
  update public.introductions set is_read = true;
  perform pg_temp.expect_error($q$update public.introductions set message = 'tampered'$q$, 'permission denied');
  perform pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
  perform pg_temp.expect_count($q$select 1 from public.introductions$q$, 0, 'others do not see them');
  perform pg_temp.expect_error($q$insert into public.introductions (profile_id, from_name, from_email, message) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x', 'a@b.cc', 'direct insert should fail')$q$, 'row-level security');
  reset role;
  raise notice 'PASS: employers can write to a public profile without an account, but cannot read, tamper or spam';
end $$;

-- Fee waivers -----------------------------------------------------------------------------------------------------------
do $$
begin
  perform pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
  insert into public.waiver_requests (user_id, bridging_step_id, message) values (auth.uid(), 'swdev-azure-fundamentals', 'Please help with the exam fee.');
  perform pg_temp.expect_error($q$insert into public.waiver_requests (user_id, bridging_step_id) values (auth.uid(), 'swdev-freecodecamp')$q$, 'row-level security');
  perform pg_temp.expect_error($q$insert into public.waiver_requests (user_id, bridging_step_id) values (auth.uid(), 'swdev-azure-fundamentals')$q$, 'duplicate key');
  perform pg_temp.expect_error($q$insert into public.waiver_requests (user_id, bridging_step_id, status) values (auth.uid(), 'swdev-aws-practitioner', 'approved')$q$, 'row-level security');
  perform pg_temp.expect_error($q$select public.decide_waiver((select id from public.waiver_requests limit 1), 'approve', '')$q$, 'Reviewers only');
  perform pg_temp.as_user('cccccccc-0000-0000-0000-000000000003');
  if jsonb_array_length(public.reviewer_queue() -> 'waivers') <> 1 then raise exception 'FAIL: one waiver should be waiting'; end if;
  perform public.decide_waiver((select id from public.waiver_requests limit 1), 'approve', 'Approved from the partner fund');
  perform pg_temp.expect_error($q$select public.decide_waiver((select id from public.waiver_requests limit 1), 'decline', '')$q$, 'already been decided');
  perform pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
  perform pg_temp.expect_count($q$select 1 from public.waiver_requests where status = 'approved'$q$, 1, 'the candidate sees the decision');
  perform pg_temp.expect_affected($q$delete from public.waiver_requests$q$, 0, 'a decided request cannot be cancelled');
  reset role;
  raise notice 'PASS: fee-waiver requests are limited to eligible steps and only reviewers decide them';
end $$;

rollback;
