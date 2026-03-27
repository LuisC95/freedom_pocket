-- ─────────────────────────────────────────────────────────────────────────────
-- Fastlane Compass — seed de desarrollo
-- Reemplaza el UUID de user_id con el ID real de tu usuario en Supabase Auth
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  v_user_id     uuid := '1e04cc3d-2c30-4cf9-a977-bb7209aece3a';
  v_period_id   uuid;
  v_prev_id     uuid;
begin

  -- ── Periodo anterior (Febrero 2026) ────────────────────────────────────────
  insert into public.periods (user_id, label, start_date, end_date, is_active)
  values (v_user_id, 'Febrero 2026', '2026-02-01', '2026-02-28', false)
  returning id into v_prev_id;

  insert into public.transactions (user_id, period_id, type, amount, category, description, date) values
    (v_user_id, v_prev_id, 'income',  42000, 'freelance',    'Proyecto cliente A',       '2026-02-05'),
    (v_user_id, v_prev_id, 'income',  18000, 'freelance',    'Consultoría mensual',      '2026-02-15'),
    (v_user_id, v_prev_id, 'expense',  9800, 'renta',        'Renta febrero',            '2026-02-01'),
    (v_user_id, v_prev_id, 'expense',  4200, 'comida',       'Súper + restaurantes',     '2026-02-10'),
    (v_user_id, v_prev_id, 'expense',  2100, 'transporte',   'Gasolina + Uber',          '2026-02-12'),
    (v_user_id, v_prev_id, 'expense',  1500, 'suscripciones','Adobe, Notion, Figma',     '2026-02-01'),
    (v_user_id, v_prev_id, 'expense',  3600, 'salud',        'Seguro médico',            '2026-02-08');

  insert into public.real_hours (user_id, period_id, hours_worked) values
    (v_user_id, v_prev_id, 148);

  -- ── Periodo activo (Marzo 2026) ────────────────────────────────────────────
  insert into public.periods (user_id, label, start_date, end_date, is_active)
  values (v_user_id, 'Marzo 2026', '2026-03-01', '2026-03-31', true)
  returning id into v_period_id;

  -- Transacciones de marzo
  insert into public.transactions (user_id, period_id, type, amount, category, description, date) values
    (v_user_id, v_period_id, 'income',  45000, 'freelance',    'Proyecto cliente B',       '2026-03-03'),
    (v_user_id, v_period_id, 'income',  18000, 'freelance',    'Consultoría mensual',      '2026-03-15'),
    (v_user_id, v_period_id, 'income',   8500, 'otro',         'Venta curso online',       '2026-03-20'),
    (v_user_id, v_period_id, 'expense',  9800, 'renta',        'Renta marzo',              '2026-03-01'),
    (v_user_id, v_period_id, 'expense',  3800, 'comida',       'Súper semanal',            '2026-03-04'),
    (v_user_id, v_period_id, 'expense',  2400, 'comida',       'Restaurantes',             '2026-03-10'),
    (v_user_id, v_period_id, 'expense',  1900, 'transporte',   'Gasolina',                 '2026-03-07'),
    (v_user_id, v_period_id, 'expense',   650, 'transporte',   'Uber x3',                  '2026-03-14'),
    (v_user_id, v_period_id, 'expense',  1500, 'suscripciones','Adobe, Notion, Figma',     '2026-03-01'),
    (v_user_id, v_period_id, 'expense',  3600, 'salud',        'Seguro médico',            '2026-03-05'),
    (v_user_id, v_period_id, 'expense',  6200, 'equipo',       'Monitor LG 27"',           '2026-03-18'),
    (v_user_id, v_period_id, 'expense',  1200, 'educacion',    'Curso de TypeScript',      '2026-03-22'),
    (v_user_id, v_period_id, 'expense',   890, 'comida',       'Cena de cumpleaños',       '2026-03-25');

  -- Presupuestos de marzo
  insert into public.budgets (user_id, period_id, category, amount) values
    (v_user_id, v_period_id, 'renta',         10000),
    (v_user_id, v_period_id, 'comida',          7000),
    (v_user_id, v_period_id, 'transporte',      2500),
    (v_user_id, v_period_id, 'suscripciones',   2000),
    (v_user_id, v_period_id, 'salud',           4000),
    (v_user_id, v_period_id, 'equipo',          5000),  -- <-- excedido
    (v_user_id, v_period_id, 'educacion',       1500);

  -- Horas trabajadas en marzo (hasta ahora)
  insert into public.real_hours (user_id, period_id, hours_worked) values
    (v_user_id, v_period_id, 112);

end $$;
