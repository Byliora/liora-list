-- DEMO DATA – fake people only, for the dev project. NEVER run this in Liora's live project.
-- Run setup.sql first, create your test login, then paste this into SQL Editor -> New query -> Run.
-- It attaches everything to the first login created in this project.
-- To start again: delete from public.ideas; delete from public.people; then run this again.

do $$
declare
  me uuid := (select id from auth.users order by created_at limit 1);
  p_sarah uuid; p_david uuid; p_miriam uuid; p_yossi uuid; p_chana uuid; p_eli uuid;
  p_rivka uuid; p_avi uuid; p_leah uuid; p_dov uuid; p_tamar uuid; p_shmuel uuid;
begin
  if me is null then
    raise exception 'Create your test login first (Authentication -> Users -> Add user).';
  end if;

  insert into public.people (owner_id, first_name, surname, gender, date_of_birth, country, city, area, height_cm, religious_level, status,
    contact_who, contact_name, contact_phone, phone, description, looking_for, private_notes)
  values (me, 'Sarah', 'Demo-Cohen', 'female', '1999-05-02', 'United Kingdom', 'Manchester', 'Salford', 168, 4, 'Available',
    'mother', 'Rachel', '+44 7700 900001', '+44 7700 900002',
    'Warm and organised, teaches in a nursery. Loves hosting Shabbos meals.',
    'A learning boy for a few years, then working. Kind and steady.',
    'Lovely family. Mother is very involved, call her first.')
  returning id into p_sarah;

  insert into public.people (owner_id, first_name, surname, gender, birth_year, country, city, height_cm, religious_level, status,
    contact_who, contact_name, contact_phone, description, looking_for)
  values (me, 'David', 'Demo-Levy', 'male', 1997, 'Belgium', 'Antwerp', 180, 4, 'Dating',
    'father', 'Moshe', '+32 470 00 00 01',
    'Learning in kollel, plans to go into accountancy. Calm and thoughtful.',
    'Someone warm and grounded, open to living in Antwerp or London.')
  returning id into p_david;

  insert into public.people (owner_id, first_name, surname, gender, date_of_birth, country, city, area, height_cm, religious_level, status,
    contact_who, contact_phone, description, looking_for)
  values (me, 'Miriam', 'Demo-Katz', 'female', '1996-11-20', 'United States', 'Lakewood', null, 163, 8, 'Researching',
    'single', '+1 732 555 0101',
    'Speech therapist. Independent, funny, very close to her siblings.',
    'Learning boy, long term. Must be a mensch.')
  returning id into p_miriam;

  insert into public.people (owner_id, first_name, surname, gender, approx_age, country, city, height_cm, status,
    description)
  values (me, 'Yossi', 'Demo-Friedman', 'male', 26, 'United Kingdom', 'London', 175, 'Available',
    'Works in IT. Details still to come.')
  returning id into p_yossi;

  insert into public.people (owner_id, first_name, surname, gender, date_of_birth, country, city, area, height_cm, religious_level, status,
    contact_who, contact_name, contact_phone, description, looking_for)
  values (me, 'Chana', 'Demo-Weiss', 'female', '2001-02-14', 'Israel', 'Jerusalem', 'Har Nof', 160, 4, 'Available',
    'mother', 'Esther', '+972 50 000 0001',
    'Seminary graduate, now teaching. Gentle and creative.',
    'Serious learner, Jerusalem or Bnei Brak.')
  returning id into p_chana;

  insert into public.people (owner_id, first_name, surname, gender, date_of_birth, country, city, height_cm, religious_level, status,
    contact_who, contact_phone, description, looking_for)
  values (me, 'Eli', 'Demo-Goldberg', 'male', '1994-08-30', 'United Kingdom', 'Gateshead', 183, 4, 'On hold',
    'single', '+44 7700 900010',
    'In yeshiva, very sincere. Taking a short break from dating.',
    'Chareidi family, open to Israel.')
  returning id into p_eli;

  insert into public.people (owner_id, first_name, surname, gender, birth_year, country, city, height_cm, religious_level, status,
    contact_who, contact_name, contact_phone, description)
  values (me, 'Rivka', 'Demo-Stern', 'female', 1993, 'France', 'Paris', 165, 2, 'Available',
    'other', 'Mrs Bloom (teacher)', '+33 6 00 00 00 01',
    'Pharmacist, divorced, no children. Bright and straightforward.')
  returning id into p_rivka;

  insert into public.people (owner_id, first_name, surname, gender, date_of_birth, country, city, height_cm, religious_level, status,
    description, looking_for)
  values (me, 'Avi', 'Demo-Rosen', 'male', '1990-03-12', 'France', 'Paris', 178, 3, 'Available',
    'Lawyer, widowed with one child. Warm and family-minded.',
    'Open to someone previously married. Modern-centrist home.')
  returning id into p_avi;

  insert into public.people (owner_id, first_name, surname, gender, date_of_birth, country, city, height_cm, religious_level, status)
  values (me, 'Leah', 'Demo-Klein', 'female', '1998-07-07', 'Canada', 'Toronto', 170, 3, 'Engaged')
  returning id into p_leah;

  insert into public.people (owner_id, first_name, surname, gender, approx_age, country, city, height_cm, religious_level, status)
  values (me, 'Dov', 'Demo-Schwartz', 'male', 28, 'Canada', 'Toronto', 181, 3, 'Engaged')
  returning id into p_dov;

  insert into public.people (owner_id, first_name, surname, gender, date_of_birth, country, city, height_cm, religious_level, status,
    contact_who, contact_phone, description)
  values (me, 'Tamar', 'Demo-Adler', 'female', '2000-12-01', 'South Africa', 'Johannesburg', 166, 3, 'Redt',
    'single', '+27 82 000 0001',
    'Occupational therapist. Outgoing, loves the outdoors.')
  returning id into p_tamar;

  insert into public.people (owner_id, first_name, surname, gender, birth_year, country, city, height_cm, religious_level, status,
    description)
  values (me, 'Shmuel', 'Demo-Berg', 'male', 1999, 'United Kingdom', 'Manchester', 177, 4, 'Redt',
    'Learning and working part time. Easy-going, great sense of humour.')
  returning id into p_shmuel;

  insert into public.ideas (owner_id, person_a, person_b, note) values
    (me, p_sarah, p_shmuel, 'Both in Manchester, similar outlook. Ask Rachel first.'),
    (me, p_miriam, p_eli, 'Maybe after Eli is back from his break?'),
    (me, p_rivka, p_avi, 'Both in Paris, both previously married. Worth a call.'),
    (me, p_chana, null, 'Someone from Bnei Brak for Chana?'),
    (me, p_tamar, p_shmuel, 'Already redt. Waiting to hear back from both sides.');

  insert into public.ideas (owner_id, person_a, person_b, note, archived) values
    (me, p_leah, p_dov, 'Mazal tov! Engaged.', true);

  -- Kosher level and type for each demo person
  update public.people set kosher_level = 4, community = array['ashkenazi','chareidi'] where id = p_sarah;
  update public.people set kosher_level = 4, community = array['ashkenazi'] where id = p_david;
  update public.people set kosher_level = 4, community = array['ashkenazi','chareidi'] where id = p_miriam;
  update public.people set kosher_level = 3, community = array['sephardi'] where id = p_yossi;
  update public.people set kosher_level = 4, community = array['sephardi','chareidi'] where id = p_chana;
  update public.people set kosher_level = 4, community = array['ashkenazi','chareidi'] where id = p_eli;
  update public.people set kosher_level = 2, community = array['mizrachi'] where id = p_rivka;
  update public.people set kosher_level = 3, community = array['sephardi','mizrachi'] where id = p_avi;
  update public.people set kosher_level = 3, community = array['ashkenazi'] where id = p_leah;
  update public.people set kosher_level = 3, community = array['ashkenazi'] where id = p_dov;
  update public.people set kosher_level = 3, community = array['yemeni'] where id = p_tamar;
  update public.people set kosher_level = 4, community = array['ashkenazi','chabad'] where id = p_shmuel;
end $$;
