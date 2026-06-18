insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'demo.ines@porto-nm.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Inês Faria","demo":true}'::jsonb,
    now(),
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'demo.joao@porto-nm.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"João Matos","demo":true}'::jsonb,
    now(),
    now()
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'authenticated',
    'authenticated',
    'demo.carolina@porto-nm.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Carolina Vale","demo":true}'::jsonb,
    now(),
    now()
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'authenticated',
    'authenticated',
    'demo.rita@porto-nm.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Rita Lopes","demo":true}'::jsonb,
    now(),
    now()
  ),
  (
    '55555555-5555-4555-8555-555555555555',
    'authenticated',
    'authenticated',
    'demo.nuno@porto-nm.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Nuno Seabra","demo":true}'::jsonb,
    now(),
    now()
  )
on conflict (id) do update
set
  aud = excluded.aud,
  role = excluded.role,
  email = excluded.email,
  email_confirmed_at = coalesce(auth.users.email_confirmed_at, excluded.email_confirmed_at),
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

with anchors as (
  select
    (select id from public.profiles where role = 'admin' order by joined_at, name limit 1) as admin_id
),
demo_profiles as (
  select *
  from (values
    (
      '11111111-1111-4111-8111-111111111111'::uuid,
      'Inês Faria',
      'ela/dela',
      '2026-04-09'::date,
      null::uuid,
      'membro',
      'online',
      'cafés, caminhadas, conversas sobre acordos e apresentação de pessoas novas',
      'sem prints; flirt só depois de convite claro',
      'media íntima só com envelope privado e expiração curta',
      'poliam, com uma relação âncora e espaço para conhecer devagar',
      'gosta de anfitriã/o identificado e política de fotos visível'
    ),
    (
      '22222222-2222-4222-8222-222222222222'::uuid,
      'João Matos',
      'ele/dele',
      '2026-04-21'::date,
      '11111111-1111-4111-8111-111111111111'::uuid,
      'membro',
      'online',
      'eventos pequenos, logística, conversas sobre comunicação não violenta',
      'não quer convites sexuais em canais de grupo',
      'prefere pedir contexto antes de qualquer imagem íntima',
      'relação aberta, acordos revistos mensalmente',
      'prefere grupos até 12 pessoas e sem fotografias espontâneas'
    ),
    (
      '33333333-3333-4333-8333-333333333333'::uuid,
      'Carolina Vale',
      'ela/elu',
      '2026-05-03'::date,
      null::uuid,
      'membro',
      'offline',
      'amizades queer, dates leves e companhia para eventos culturais',
      'precisa de tempo antes de conversas privadas intensas',
      'não recebe nudes sem pergunta explícita no momento',
      'solo poly, com foco em autonomia',
      'gosta de eventos com check-in e saída fácil'
    ),
    (
      '44444444-4444-4444-8444-444444444444'::uuid,
      'Rita Lopes',
      'ela/dela',
      '2026-05-19'::date,
      '22222222-2222-4222-8222-222222222222'::uuid,
      'nova pessoa',
      'online',
      'conhecer pessoas em grupo, aprender acordos de consentimento',
      'sem mensagens privadas no primeiro contacto sem apresentação',
      'sem media íntima por agora',
      'a explorar não-monogamia com curiosidade e cautela',
      'precisa de saber quem pode apoiar se ficar desconfortável'
    ),
    (
      '55555555-5555-4555-8555-555555555555'::uuid,
      'Nuno Seabra',
      'ele/dele',
      '2026-06-02'::date,
      '11111111-1111-4111-8111-111111111111'::uuid,
      'membro',
      'offline',
      'amizades, eventos ao ar livre e conversas sobre ciúme e autonomia',
      'sem contacto físico sem pergunta verbal',
      'fotografias normais ok; íntimas só em ver uma vez',
      'casal aberto, com acordos de transparência',
      'prefere eventos com propósito claro'
    )
  ) as profile_data(
    id,
    name,
    pronouns,
    joined_at,
    sponsor_id,
    role,
    status,
    consent_available_for,
    consent_limits,
    media_preference,
    relationship_context,
    event_comfort
  )
)
insert into public.profiles (
  id,
  name,
  pronouns,
  joined_at,
  sponsor_id,
  role,
  status,
  consent_available_for,
  consent_limits,
  media_preference,
  relationship_context,
  event_comfort
)
select
  demo_profiles.id,
  demo_profiles.name,
  demo_profiles.pronouns,
  demo_profiles.joined_at,
  coalesce(demo_profiles.sponsor_id, anchors.admin_id),
  demo_profiles.role,
  demo_profiles.status,
  demo_profiles.consent_available_for,
  demo_profiles.consent_limits,
  demo_profiles.media_preference,
  demo_profiles.relationship_context,
  demo_profiles.event_comfort
from demo_profiles
cross join anchors
on conflict (id) do update
set
  name = excluded.name,
  pronouns = excluded.pronouns,
  joined_at = excluded.joined_at,
  sponsor_id = excluded.sponsor_id,
  role = excluded.role,
  status = excluded.status,
  consent_available_for = excluded.consent_available_for,
  consent_limits = excluded.consent_limits,
  media_preference = excluded.media_preference,
  relationship_context = excluded.relationship_context,
  event_comfort = excluded.event_comfort;

insert into public.group_members (group_id, member_id)
values
  ('g_geral', '11111111-1111-4111-8111-111111111111'),
  ('g_eventos', '11111111-1111-4111-8111-111111111111'),
  ('g_cuidados', '11111111-1111-4111-8111-111111111111'),
  ('g_geral', '22222222-2222-4222-8222-222222222222'),
  ('g_eventos', '22222222-2222-4222-8222-222222222222'),
  ('g_geral', '33333333-3333-4333-8333-333333333333'),
  ('g_eventos', '33333333-3333-4333-8333-333333333333'),
  ('g_geral', '44444444-4444-4444-8444-444444444444'),
  ('g_geral', '55555555-5555-4555-8555-555555555555'),
  ('g_eventos', '55555555-5555-4555-8555-555555555555'),
  ('g_cuidados', '55555555-5555-4555-8555-555555555555')
on conflict do nothing;

with anchors as (
  select (select id from public.profiles where role = 'admin' order by joined_at, name limit 1) as admin_id
)
insert into public.invite_codes (code, sponsor_id, role, max_uses, uses, expires_at)
select *
from (
  values
    ('DEMO-CAFE', '11111111-1111-4111-8111-111111111111'::uuid, 'nova pessoa', 4, 1, '2026-08-31 23:59:00+00'::timestamptz),
    ('DEMO-CUIDA', '22222222-2222-4222-8222-222222222222'::uuid, 'membro', 2, 0, '2026-08-31 23:59:00+00'::timestamptz),
    ('DEMO-ADMIN', (select admin_id from anchors), 'nova pessoa', 3, 0, '2026-08-31 23:59:00+00'::timestamptz)
) as invites(code, sponsor_id, role, max_uses, uses, expires_at)
where sponsor_id is not null
on conflict (code) do update
set
  sponsor_id = excluded.sponsor_id,
  role = excluded.role,
  max_uses = excluded.max_uses,
  uses = excluded.uses,
  expires_at = excluded.expires_at;

insert into public.events (
  id,
  title,
  starts_at,
  place,
  group_id,
  capacity,
  created_by,
  vibe,
  photo_policy,
  boundary_notes,
  aftercare_prompt
)
values
  (
    'demo_event_matosinhos',
    'Caminhada consentida em Matosinhos',
    '2026-06-28 10:30:00+00',
    'Matosinhos, junto ao mar',
    'g_eventos',
    14,
    '11111111-1111-4111-8111-111111111111',
    'social',
    'perguntar primeiro',
    'Check-in inicial, pares de caminhada opcionais e saída fácil a meio.',
    'Mensagem curta no dia seguinte para perceber energia e limites.'
  ),
  (
    'demo_event_jantar_sem_fotos',
    'Jantar pequeno sem fotos',
    '2026-07-05 20:00:00+00',
    'Cedofeita',
    'g_cuidados',
    8,
    '22222222-2222-4222-8222-222222222222',
    'íntimo',
    'sem fotos',
    'Telemóveis pousados durante a ronda inicial; cada pessoa escolhe o nível de partilha.',
    'Ronda de saída e canal de aftercare aberto por 48h.'
  )
on conflict (id) do update
set
  title = excluded.title,
  starts_at = excluded.starts_at,
  place = excluded.place,
  group_id = excluded.group_id,
  capacity = excluded.capacity,
  created_by = excluded.created_by,
  vibe = excluded.vibe,
  photo_policy = excluded.photo_policy,
  boundary_notes = excluded.boundary_notes,
  aftercare_prompt = excluded.aftercare_prompt;

insert into public.event_attendees (event_id, member_id)
values
  ('demo_event_matosinhos', '11111111-1111-4111-8111-111111111111'),
  ('demo_event_matosinhos', '22222222-2222-4222-8222-222222222222'),
  ('demo_event_matosinhos', '33333333-3333-4333-8333-333333333333'),
  ('demo_event_matosinhos', '44444444-4444-4444-8444-444444444444'),
  ('demo_event_matosinhos', '55555555-5555-4555-8555-555555555555'),
  ('demo_event_jantar_sem_fotos', '11111111-1111-4111-8111-111111111111'),
  ('demo_event_jantar_sem_fotos', '22222222-2222-4222-8222-222222222222'),
  ('demo_event_jantar_sem_fotos', '55555555-5555-4555-8555-555555555555')
on conflict do nothing;

insert into public.event_rooms (id, event_id, name, purpose, expires_at, created_by, member_ids)
values
  (
    'demo_room_matosinhos_logistica',
    'demo_event_matosinhos',
    'Logística Matosinhos',
    'combinar comboios, ponto de encontro e quem acompanha novas pessoas',
    '2026-06-29 12:00:00+00',
    '11111111-1111-4111-8111-111111111111',
    array[
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
      '33333333-3333-4333-8333-333333333333',
      '44444444-4444-4444-8444-444444444444',
      '55555555-5555-4555-8555-555555555555'
    ]::uuid[]
  ),
  (
    'demo_room_jantar_aftercare',
    'demo_event_jantar_sem_fotos',
    'Aftercare jantar',
    'check-ins privados e notas para melhorar próximos encontros íntimos',
    '2026-07-07 20:00:00+00',
    '22222222-2222-4222-8222-222222222222',
    array[
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
      '55555555-5555-4555-8555-555555555555'
    ]::uuid[]
  )
on conflict (id) do update
set
  name = excluded.name,
  purpose = excluded.purpose,
  expires_at = excluded.expires_at,
  created_by = excluded.created_by,
  member_ids = excluded.member_ids;

insert into public.docs (id, code, title, summary, owner_id, updated_at, tags)
values
  (
    'demo_doc_intro',
    'DOC-DEMO-01',
    'Como pedir uma apresentação quente',
    'Antes de abordar alguém novo, pede-se contexto a uma pessoa ponte. A ponte só faz a apresentação se as duas partes disserem sim.',
    '11111111-1111-4111-8111-111111111111',
    '2026-06-18 12:20:00+00',
    array['entradas', 'consentimento', 'confiança']
  ),
  (
    'demo_doc_media',
    'DOC-DEMO-02',
    'Media íntima e envelopes privados',
    'Imagens íntimas precisam de convite explícito, prazo curto, opção de ver uma vez e nunca devem ser reenviadas fora do contexto original.',
    '22222222-2222-4222-8222-222222222222',
    '2026-06-18 12:35:00+00',
    array['media', 'privacidade', 'segurança']
  )
on conflict (id) do update
set
  code = excluded.code,
  title = excluded.title,
  summary = excluded.summary,
  owner_id = excluded.owner_id,
  updated_at = excluded.updated_at,
  tags = excluded.tags;

insert into public.decisions (id, code, title, summary, outcome, status, created_by, created_at, votes)
values
  (
    'demo_decision_aftercare',
    'DEC-DEMO-01',
    'Aftercare obrigatório em eventos íntimos',
    'A comunidade discutiu como evitar que eventos pequenos terminem sem acompanhamento emocional.',
    'Eventos íntimos passam a ter sala temporária de aftercare durante 48h, com uma pessoa responsável por recolher sinais de desconforto.',
    'decidida',
    '11111111-1111-4111-8111-111111111111',
    '2026-06-18 13:10:00+00',
    jsonb_build_array(
      jsonb_build_object('memberId', '11111111-1111-4111-8111-111111111111', 'value', 'sim', 'note', 'dá segurança às novas pessoas'),
      jsonb_build_object('memberId', '22222222-2222-4222-8222-222222222222', 'value', 'sim', 'note', 'ajuda a aprender com cada evento'),
      jsonb_build_object('memberId', '55555555-5555-4555-8555-555555555555', 'value', 'abstenção', 'note', 'concordo mas quero rever carga de trabalho')
    )
  )
on conflict (id) do update
set
  code = excluded.code,
  title = excluded.title,
  summary = excluded.summary,
  outcome = excluded.outcome,
  status = excluded.status,
  created_by = excluded.created_by,
  created_at = excluded.created_at,
  votes = excluded.votes;

insert into public.event_checkins (id, event_id, member_id, mood, note, visibility, created_at)
values
  (
    'demo_checkin_matosinhos_rita',
    'demo_event_matosinhos',
    '44444444-4444-4444-8444-444444444444',
    'bem',
    'Foi bom ter ponto de encontro claro e saber quem era a pessoa ponte.',
    'comunidade',
    '2026-06-29 10:30:00+00'
  ),
  (
    'demo_checkin_jantar_nuno',
    'demo_event_jantar_sem_fotos',
    '55555555-5555-4555-8555-555555555555',
    'misto',
    'Gostei do ambiente sem fotos; a ronda inicial podia ter sido mais curta.',
    'admins',
    '2026-07-06 11:00:00+00'
  )
on conflict (event_id, member_id) do update
set
  mood = excluded.mood,
  note = excluded.note,
  visibility = excluded.visibility,
  created_at = excluded.created_at;

insert into public.member_intentions (member_id, kinds, note, updated_at)
values
  (
    '11111111-1111-4111-8111-111111111111',
    array['amizades', 'eventos', 'só intro'],
    'Disponível para fazer pontes e ajudar novas pessoas a chegar com contexto.',
    '2026-06-18 11:45:00+00'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    array['amizades', 'eventos'],
    'Aberto a amizades e companhia para organizar eventos pequenos.',
    '2026-06-18 11:50:00+00'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    array['amizades', 'dates', 'flirt'],
    'Curiosa por dates lentos, com humor e muita clareza.',
    '2026-06-18 11:55:00+00'
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    array['amizades', 'só intro'],
    'Prefere primeiras conversas por apresentação quente.',
    '2026-06-18 12:00:00+00'
  ),
  (
    '55555555-5555-4555-8555-555555555555',
    array['amizades', 'eventos', 'dates'],
    'Procura eventos ao ar livre e conversas sem pressa.',
    '2026-06-18 12:05:00+00'
  )
on conflict (member_id) do update
set
  kinds = excluded.kinds,
  note = excluded.note,
  updated_at = excluded.updated_at;

with anchors as (
  select
    (select id from public.profiles where role = 'admin' order by joined_at, name limit 1) as admin_id,
    (select id from auth.users where email = 'tester@porto-nm.test' limit 1) as tester_id
)
insert into public.warm_introductions (id, requester_id, target_id, connector_id, note, status, created_at)
select *
from (
  select
    'demo_intro_rita_nuno' as id,
    '44444444-4444-4444-8444-444444444444'::uuid as requester_id,
    '55555555-5555-4555-8555-555555555555'::uuid as target_id,
    '11111111-1111-4111-8111-111111111111'::uuid as connector_id,
    'A Rita gostava de falar com o Nuno sobre eventos ao ar livre, mas prefere uma ponte primeiro.' as note,
    'pedido' as status,
    '2026-06-18 12:15:00+00'::timestamptz as created_at
  union all
  select
    'demo_intro_tester_ines',
    tester_id,
    '11111111-1111-4111-8111-111111111111'::uuid,
    admin_id,
    'Pedido de demo: apresentar a pessoa tester à Inês para falar sobre acolhimento.',
    'pedido',
    '2026-06-18 12:25:00+00'::timestamptz
  from anchors
  where tester_id is not null and admin_id is not null
) as intros(id, requester_id, target_id, connector_id, note, status, created_at)
on conflict (id) do update
set
  requester_id = excluded.requester_id,
  target_id = excluded.target_id,
  connector_id = excluded.connector_id,
  note = excluded.note,
  status = excluded.status,
  created_at = excluded.created_at;

with anchors as (
  select (select id from auth.users where email = 'tester@porto-nm.test' limit 1) as tester_id
),
interests as (
  select *
  from (values
    ('demo_interest_ines_nuno_evento', '11111111-1111-4111-8111-111111111111'::uuid, '55555555-5555-4555-8555-555555555555'::uuid, 'evento'),
    ('demo_interest_nuno_ines_evento', '55555555-5555-4555-8555-555555555555'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'evento'),
    ('demo_interest_caro_joao_amizade', '33333333-3333-4333-8333-333333333333'::uuid, '22222222-2222-4222-8222-222222222222'::uuid, 'amizade'),
    ('demo_interest_joao_caro_amizade', '22222222-2222-4222-8222-222222222222'::uuid, '33333333-3333-4333-8333-333333333333'::uuid, 'amizade')
  ) as base(id, from_id, to_id, kind)
  union all
  select
    'demo_interest_tester_ines_evento',
    tester_id,
    '11111111-1111-4111-8111-111111111111'::uuid,
    'evento'
  from anchors
  where tester_id is not null
)
insert into public.mutual_interests (id, from_id, to_id, kind, created_at)
select id, from_id, to_id, kind, '2026-06-18 12:40:00+00'::timestamptz
from interests
on conflict (from_id, to_id, kind) do update
set
  id = excluded.id,
  created_at = excluded.created_at;

insert into public.relationship_links (id, member_id, related_member_id, label, visibility, created_at)
values
  (
    'demo_rel_ines_joao',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    'padrinha',
    'comunidade',
    '2026-06-18 12:45:00+00'
  ),
  (
    'demo_rel_joao_rita',
    '22222222-2222-4222-8222-222222222222',
    '44444444-4444-4444-8444-444444444444',
    'padrinho',
    'comunidade',
    '2026-06-18 12:50:00+00'
  ),
  (
    'demo_rel_ines_nuno',
    '11111111-1111-4111-8111-111111111111',
    '55555555-5555-4555-8555-555555555555',
    'equipa de eventos',
    'comunidade',
    '2026-06-18 12:55:00+00'
  )
on conflict (id) do update
set
  member_id = excluded.member_id,
  related_member_id = excluded.related_member_id,
  label = excluded.label,
  visibility = excluded.visibility,
  created_at = excluded.created_at;

with recipients as (
  select array_agg(id order by name) as member_ids
  from public.profiles
  where id in (
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
      '33333333-3333-4333-8333-333333333333',
      '44444444-4444-4444-8444-444444444444',
      '55555555-5555-4555-8555-555555555555'
    )
    or role = 'admin'
    or id = (select id from auth.users where email = 'tester@porto-nm.test' limit 1)
)
insert into public.messages (id, room_id, author_id, body, created_at, recipients_at_send, citation_code, image_view_once, image_opened_by, image_consent_required, image_expires_at)
select
  message_data.id,
  message_data.room_id,
  message_data.author_id,
  message_data.body,
  message_data.created_at,
  coalesce((select member_ids from recipients), array[]::uuid[]),
  message_data.citation_code,
  false,
  array[]::uuid[],
  false,
  null::timestamptz
from (
  values
    (
      'demo_msg_geral_intro',
      'g_geral',
      '11111111-1111-4111-8111-111111111111'::uuid,
      'Deixei um resumo curto sobre como pedir apresentações quentes. Usem @DOC-DEMO-01 quando alguém novo perguntar como funciona.',
      '2026-06-18 13:00:00+00'::timestamptz,
      'DOC-DEMO-01'
    ),
    (
      'demo_msg_eventos_matosinhos',
      'g_eventos',
      '22222222-2222-4222-8222-222222222222'::uuid,
      'A sala temporária da caminhada já está aberta para combinar chegada e pares opcionais.',
      '2026-06-18 13:05:00+00'::timestamptz,
      null
    ),
    (
      'demo_msg_media',
      'g_geral',
      '33333333-3333-4333-8333-333333333333'::uuid,
      'Gostei da regra dos envelopes privados. Ajuda a falar de nudes sem tornar a conversa pesada.',
      '2026-06-18 13:12:00+00'::timestamptz,
      'DOC-DEMO-02'
    )
) as message_data(id, room_id, author_id, body, created_at, citation_code)
on conflict (id) do update
set
  room_id = excluded.room_id,
  author_id = excluded.author_id,
  body = excluded.body,
  created_at = excluded.created_at,
  recipients_at_send = excluded.recipients_at_send,
  citation_code = excluded.citation_code,
  image_view_once = excluded.image_view_once,
  image_opened_by = excluded.image_opened_by,
  image_consent_required = excluded.image_consent_required,
  image_expires_at = excluded.image_expires_at;
