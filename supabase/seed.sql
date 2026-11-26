-- SkillBridge starter content: skills assessments and bridging steps.
-- Run it after schema.sql. It is safe to run again (it replaces the questions with the versions below).
--
-- The assessments are short knowledge screens, not licences or exams. They show baseline knowledge so a reviewer or
-- an employer has something to go on when paper records are missing. Pass mark: 65 percent.
-- The bridging steps are real kinds of routes (certifications, credential evaluation, regulator registration).
-- Costs vary by country, so each step says to check with the provider. Fee-waiver availability is a SkillBridge
-- partner programme and is illustrative in this prototype: replace it with your real partners.

insert into public.assessments (id, field, title, description, pass_mark) values
  ('software-development-fundamentals', 'Software Development', 'Software development fundamentals',
   'Six questions on algorithms, the web, databases, version control and secure coding.', 65),
  ('accounting-finance-fundamentals', 'Accounting & Finance', 'Accounting and finance fundamentals',
   'Six questions on the accounting equation, statements, double entry, depreciation and ratios.', 65),
  ('nursing-healthcare-fundamentals', 'Nursing & Healthcare', 'Nursing and healthcare fundamentals',
   'Six questions on vital signs, infection control, medication safety, first response and consent.', 65),
  ('teaching-education-fundamentals', 'Teaching & Education', 'Teaching and education fundamentals',
   'Six questions on assessment, lesson objectives, scaffolding, inclusion and classroom management.', 65)
on conflict (id) do update
  set field = excluded.field, title = excluded.title, description = excluded.description, pass_mark = excluded.pass_mark;

delete from public.assessment_questions
 where assessment_id in ('software-development-fundamentals', 'accounting-finance-fundamentals',
                         'nursing-healthcare-fundamentals', 'teaching-education-fundamentals');

insert into public.assessment_questions (assessment_id, position, prompt, options, correct_index) values
-- Software development
('software-development-fundamentals', 1, 'What is the time complexity of binary search on a sorted array of n items?',
  '["O(n log n)", "O(1)", "O(n)", "O(log n)"]', 3),
('software-development-fundamentals', 2, 'Which HTTP status code means a new resource was created successfully?',
  '["200 OK", "201 Created", "204 No Content", "301 Moved Permanently"]', 1),
('software-development-fundamentals', 3, 'In SQL, which clause filters groups after GROUP BY has been applied?',
  '["HAVING", "ORDER BY", "LIMIT", "WHERE"]', 0),
('software-development-fundamentals', 4, 'Which data structure removes items in first-in, first-out order?',
  '["Hash map", "Stack", "Queue", "Binary tree"]', 2),
('software-development-fundamentals', 5, 'What does "git rebase" mainly do?',
  '["Downloads remote changes without merging", "Creates a new repository", "Deletes a branch", "Replays commits from one branch on top of another"]', 3),
('software-development-fundamentals', 6, 'What is the most reliable defence against SQL injection?',
  '["Using parameterized queries (prepared statements)", "Hiding the database port", "Choosing longer database passwords", "Escaping quotes by hand when building query strings"]', 0),
-- Accounting and finance
('accounting-finance-fundamentals', 1, 'Which expression is the basic accounting equation?',
  '["Liabilities = Assets + Equity", "Assets = Liabilities + Equity", "Assets = Revenue - Expenses", "Equity = Liabilities - Assets"]', 1),
('accounting-finance-fundamentals', 2, 'Which statement shows a business''s profit or loss over a period?',
  '["Balance sheet", "Income statement", "Trial balance", "Bank reconciliation"]', 1),
('accounting-finance-fundamentals', 3, 'A business pays 500 of rent in cash. Which double entry is correct?',
  '["Debit Rent expense 500, credit Revenue 500", "Credit Rent expense 500, credit Cash 500", "Debit Rent expense 500, credit Cash 500", "Debit Cash 500, credit Rent expense 500"]', 2),
('accounting-finance-fundamentals', 4, 'Under accrual accounting, when is revenue recognised?',
  '["When it is earned, even if cash comes later", "At the end of the financial year", "When the customer''s invoice is paid", "Only when cash is received"]', 0),
('accounting-finance-fundamentals', 5, 'Equipment costs 12,000, has a residual value of 2,000 and a 5-year life. What is the yearly straight-line depreciation?',
  '["2,400", "2,000", "2,500", "1,600"]', 1),
('accounting-finance-fundamentals', 6, 'How is the current ratio calculated?',
  '["Current liabilities divided by current assets", "Current assets divided by current liabilities", "Total assets divided by total liabilities", "Net income divided by revenue"]', 1),
-- Nursing and healthcare
('nursing-healthcare-fundamentals', 1, 'What is the normal resting heart rate range for a healthy adult?',
  '["100 to 140 beats per minute", "120 to 160 beats per minute", "30 to 50 beats per minute", "60 to 100 beats per minute"]', 3),
('nursing-healthcare-fundamentals', 2, 'Which single practice does the most to prevent the spread of infection in care settings?',
  '["Hand hygiene at the right moments", "Wearing the same gloves for the whole shift", "Avoiding all patient contact", "Cleaning floors once a day"]', 0),
('nursing-healthcare-fundamentals', 3, 'Before giving a medicine, a nurse should first:',
  '["Verify the patient''s identity and check the order against their record", "Crush the tablet to speed up absorption", "Give it, then check for allergies", "Ask a colleague to give it instead"]', 0),
('nursing-healthcare-fundamentals', 4, 'An adult is choking and cannot speak or cough. What is the right immediate action?',
  '["Give them food to push the object down", "Give them water to drink", "Give back blows and abdominal thrusts as your protocol says, and call for help", "Lay them flat and wait"]', 2),
('nursing-healthcare-fundamentals', 5, 'What does a pulse oximeter measure?',
  '["Blood pressure", "Body temperature", "Blood glucose", "Blood oxygen saturation (SpO2)"]', 3),
('nursing-healthcare-fundamentals', 6, 'Which best describes informed consent?',
  '["The patient understands the information and agrees voluntarily", "The doctor decides without discussion", "Consent given once covers every future treatment", "The family always signs on the patient''s behalf"]', 0),
-- Teaching and education
('teaching-education-fundamentals', 1, 'What is formative assessment?',
  '["The teacher''s yearly appraisal", "A final exam at the end of the term", "Ongoing checking of understanding so teaching can be adjusted", "A national ranking test"]', 2),
('teaching-education-fundamentals', 2, 'Which is a well-written, measurable learning objective?',
  '["Students will understand algebra", "Students will be able to solve two-step linear equations", "Teach algebra this week", "Students will enjoy maths"]', 1),
('teaching-education-fundamentals', 3, 'What does scaffolding mean in teaching?',
  '["Giving harder homework each week", "Arranging the classroom furniture", "Grouping learners strictly by ability", "Temporary support that is gradually removed as learners become independent"]', 3),
('teaching-education-fundamentals', 4, 'A few students dominate every class discussion. What is a good response?',
  '["Use structured turn-taking such as think-pair-share so everyone contributes", "Stop class discussions", "Ask quiet students to leave the room", "Only ask the confident students"]', 0),
('teaching-education-fundamentals', 5, 'What is differentiated instruction?',
  '["Using the same task for every learner", "Adapting content, process or product to meet varied learner needs", "Teaching only the top group", "Splitting the class by age"]', 1),
('teaching-education-fundamentals', 6, 'Which approach is most effective for classroom management?',
  '["Ignoring misbehaviour", "Raising your voice", "Clear routines and expectations set from the first day", "Punishing the whole class for one student"]', 2);

insert into public.bridging_steps (id, field, title, provider, description, url, cost_note, waiver_available) values
  ('swdev-azure-fundamentals', 'Software Development', 'Microsoft Azure Fundamentals (AZ-900)', 'Microsoft',
   'An entry-level cloud certification that gives employers a recognised, vendor-issued proof of cloud basics.',
   'https://learn.microsoft.com/credentials/', 'Exam fees vary by country - check with the provider', true),
  ('swdev-aws-practitioner', 'Software Development', 'AWS Certified Cloud Practitioner', 'Amazon Web Services',
   'A recognised cloud certification that does not depend on a university degree or old paperwork.',
   'https://aws.amazon.com/certification/', 'Exam fees vary by country - check with the provider', true),
  ('swdev-freecodecamp', 'Software Development', 'freeCodeCamp certifications', 'freeCodeCamp',
   'Free, self-paced projects that build a public portfolio. Good evidence when degrees cannot be verified.',
   'https://www.freecodecamp.org/', 'Free', false),
  ('acct-acca', 'Accounting & Finance', 'ACCA Qualification (with exemptions for prior study)', 'ACCA',
   'A globally recognised accounting qualification. Previous degrees may earn exemptions from some papers.',
   'https://www.accaglobal.com/', 'Fees vary by country - check with the provider', true),
  ('acct-icaew', 'Accounting & Finance', 'ICAEW ACA qualification', 'ICAEW',
   'Chartered accountancy training that combines exams with supervised work experience.',
   'https://www.icaew.com/', 'Fees vary by country - check with the provider', false),
  ('nurse-cgfns', 'Nursing & Healthcare', 'Credential evaluation for foreign-educated nurses', 'CGFNS International',
   'Independent verification of nursing education and licences, often a first step to registering abroad.',
   'https://www.cgfns.org/', 'Fees vary - check with the provider', true),
  ('nurse-oet', 'Nursing & Healthcare', 'OET English test for healthcare professionals', 'OET',
   'A language test built around real healthcare communication. Many regulators accept it.',
   'https://oet.com/', 'Fees vary by country - check with the provider', true),
  ('nurse-regulator', 'Nursing & Healthcare', 'Registration with the national nursing regulator', 'Your host-country regulator',
   'Each country has its own register and its own steps. Ask the regulator what it accepts when documents are missing.',
   null, 'Fees vary by country', false),
  ('teach-celta', 'Teaching & Education', 'CELTA teaching qualification', 'Cambridge English',
   'A widely accepted qualification for teaching English, useful for getting classroom experience quickly.',
   'https://www.cambridgeenglish.org/', 'Fees vary by centre - check with the provider', true),
  ('teach-registration', 'Teaching & Education', 'National teacher registration', 'Your host-country teaching council',
   'Most countries require registration to teach in public schools. Ask what is accepted when certificates are lost.',
   null, 'Fees vary by country', false),
  ('other-credential-evaluation', 'Other', 'Independent credential evaluation', 'World Education Services (WES)',
   'An evaluation report that explains a foreign degree in the local education system.',
   'https://www.wes.org/', 'Fees vary - check with the provider', true),
  ('other-coe-passport', 'Other', 'European Qualifications Passport for Refugees', 'Council of Europe',
   'A document that summarises the qualifications of refugees, including when evidence is incomplete.',
   'https://www.coe.int/', 'Check with the programme', false)
on conflict (id) do update
  set field = excluded.field, title = excluded.title, provider = excluded.provider, description = excluded.description,
      url = excluded.url, cost_note = excluded.cost_note, waiver_available = excluded.waiver_available;
