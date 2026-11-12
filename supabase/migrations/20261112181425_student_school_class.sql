alter table public.students
  add column if not exists school_class text
  check (char_length(school_class) <= 32);
