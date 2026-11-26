-- OPTIONAL: four clearly fictional demo profiles, so the talent directory is not empty during a demo.
-- Run it after schema.sql and seed.sql. Remove them again at any time with the DELETE at the bottom of this file.
-- These people do not exist. Their names end in "(demo)", they cannot log in, and nothing here is real data.

delete from auth.users where email like '%@demo.skillbridge.invalid';

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
values
  ('d0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'samuel@demo.skillbridge.invalid', '{"full_name": "Samuel K. (demo)"}', '', '', '', '', now(), now()),
  ('d0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'layla@demo.skillbridge.invalid',  '{"full_name": "Layla M. (demo)"}',  '', '', '', '', now(), now()),
  ('d0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'joseph@demo.skillbridge.invalid', '{"full_name": "Joseph A. (demo)"}', '', '', '', '', now(), now()),
  ('d0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fatima@demo.skillbridge.invalid', '{"full_name": "Fatima R. (demo)"}', '', '', '', '', now(), now());

update public.profiles set is_public = true, slug = 'samuel-k-demo', field = 'Software Development', current_country = 'Kenya', origin_country = 'South Sudan',
  headline = 'Full-stack developer, 6 years of experience',
  bio = 'Fictional demo profile. Built payment and logistics tools for small businesses; lost my certificates when leaving home.'
 where id = 'd0000000-0000-0000-0000-000000000001';
update public.profiles set is_public = true, slug = 'layla-m-demo', field = 'Nursing & Healthcare', current_country = 'Uganda', origin_country = 'Eritrea',
  headline = 'Registered nurse, 9 years in intensive care',
  bio = 'Fictional demo profile. Worked in an ICU and trained junior nurses. Looking for registration support and a first placement.'
 where id = 'd0000000-0000-0000-0000-000000000002';
update public.profiles set is_public = true, slug = 'joseph-a-demo', field = 'Teaching & Education', current_country = 'Rwanda', origin_country = 'Democratic Republic of the Congo',
  headline = 'Secondary school mathematics teacher',
  bio = 'Fictional demo profile. Taught mathematics for eight years and ran an after-school tutoring club.'
 where id = 'd0000000-0000-0000-0000-000000000003';
update public.profiles set is_public = true, slug = 'fatima-r-demo', field = 'Accounting & Finance', current_country = 'Kenya', origin_country = 'Somalia',
  headline = 'Accountant, bookkeeping and payroll',
  bio = 'Fictional demo profile. Managed the books for a wholesale business. Records were lost; no papers yet.'
 where id = 'd0000000-0000-0000-0000-000000000004';

insert into public.credentials (user_id, kind, title, institution, country, year, field, description, status, verification_method, reviewer_note, reviewed_at) values
  ('d0000000-0000-0000-0000-000000000001', 'degree', 'BSc Computer Science', 'Demo University', 'South Sudan', 2016, 'Software Development', '', 'verified', 'issuer_confirmation', 'Registrar confirmed by email (demo).', now()),
  ('d0000000-0000-0000-0000-000000000001', 'work_experience', 'Full-stack developer, Demo Logistics', 'Demo Logistics', 'South Sudan', 2018, 'Software Development', 'Built dispatch and invoicing tools.', 'verified', 'reference_check', 'Former manager confirmed (demo).', now()),
  ('d0000000-0000-0000-0000-000000000001', 'certificate', 'Cloud fundamentals certificate', 'Demo Academy', 'Kenya', 2024, 'Software Development', '', 'unverified', null, '', null),
  ('d0000000-0000-0000-0000-000000000002', 'license', 'Nursing licence', 'Demo Ministry of Health', 'Eritrea', 2014, 'Nursing & Healthcare', '', 'verified', 'issuer_confirmation', 'Confirmed with the issuing body (demo).', now()),
  ('d0000000-0000-0000-0000-000000000002', 'work_experience', 'Staff nurse, ICU', 'Demo Teaching Hospital', 'Eritrea', 2015, 'Nursing & Healthcare', 'Adult intensive care.', 'pending', null, '', null),
  ('d0000000-0000-0000-0000-000000000003', 'degree', 'BEd Mathematics', 'Demo Pedagogical University', 'Democratic Republic of the Congo', 2012, 'Teaching & Education', '', 'unverified', null, '', null),
  ('d0000000-0000-0000-0000-000000000003', 'work_experience', 'Mathematics teacher', 'Demo Secondary School', 'Democratic Republic of the Congo', 2013, 'Teaching & Education', '', 'unverified', null, '', null),
  ('d0000000-0000-0000-0000-000000000004', 'work_experience', 'Accountant, wholesale trading', 'Demo Trading Co.', 'Somalia', 2016, 'Accounting & Finance', 'Ledger, payroll and tax filings.', 'unverified', null, '', null);

insert into public.assessment_attempts (user_id, assessment_id, score, total, percent, passed) values
  ('d0000000-0000-0000-0000-000000000001', 'software-development-fundamentals', 6, 6, 100, true),
  ('d0000000-0000-0000-0000-000000000002', 'nursing-healthcare-fundamentals', 5, 6, 83, true),
  ('d0000000-0000-0000-0000-000000000003', 'teaching-education-fundamentals', 3, 6, 50, false),
  ('d0000000-0000-0000-0000-000000000003', 'teaching-education-fundamentals', 5, 6, 83, true),
  ('d0000000-0000-0000-0000-000000000004', 'accounting-finance-fundamentals', 3, 6, 50, false);

-- To remove the demo people later:
--   delete from auth.users where email like '%@demo.skillbridge.invalid';
