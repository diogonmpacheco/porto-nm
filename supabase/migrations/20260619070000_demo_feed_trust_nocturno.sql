insert into public.trust_edges (id, from_id, to_id, kind, note, created_at)
values
  (
    'cccccccc-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    'amigue',
    'Já organizaram acolhimento em conjunto.',
    '2026-06-18T09:10:00+00:00'
  ),
  (
    'cccccccc-0000-4000-8000-000000000002',
    '22222222-2222-4222-8222-222222222222',
    '11111111-1111-4111-8111-111111111111',
    'confiar',
    'Pessoa boa para validar chegadas e saídas de eventos.',
    '2026-06-18T09:12:00+00:00'
  ),
  (
    'cccccccc-0000-4000-8000-000000000003',
    '11111111-1111-4111-8111-111111111111',
    '55555555-5555-4555-8555-555555555555',
    'evento',
    'Boa dupla para logística de encontros pequenos.',
    '2026-06-18T10:05:00+00:00'
  ),
  (
    'cccccccc-0000-4000-8000-000000000004',
    '33333333-3333-4333-8333-333333333333',
    '22222222-2222-4222-8222-222222222222',
    'seguir',
    'Conversas compatíveis sobre autonomia e desejo.',
    '2026-06-18T10:20:00+00:00'
  )
on conflict (id) do update
set note = excluded.note,
    kind = excluded.kind;

insert into public.feed_posts (id, author_id, group_id, kind, visibility, title, body, tags, created_at, updated_at)
values
  (
    'aaaaaaaa-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    null,
    'pergunta',
    'comunidade',
    'Como explicam acordos a alguém novo?',
    'Estou a preparar um jantar pequeno e queria uma frase simples para explicar acordos sem soar a contrato. O que vos ajuda a abrir a conversa com leveza?',
    array['acordos', 'acolhimento', 'perguntas'],
    '2026-06-18T11:15:00+00:00',
    '2026-06-18T11:15:00+00:00'
  ),
  (
    'aaaaaaaa-0000-4000-8000-000000000002',
    '33333333-3333-4333-8333-333333333333',
    null,
    'media',
    'comunidade',
    'Envelope privado funciona mesmo',
    'Ontem usei a regra do envelope para partilhar uma foto sensual com contexto, consentimento explícito e opção de ver só uma vez. A conversa ficou muito mais calma.',
    array['media', 'consentimento', 'nudes'],
    '2026-06-18T12:40:00+00:00',
    '2026-06-18T12:40:00+00:00'
  ),
  (
    'aaaaaaaa-0000-4000-8000-000000000003',
    '22222222-2222-4222-8222-222222222222',
    'g_eventos',
    'evento',
    'grupo',
    'Pré-combinar chegada à caminhada',
    'Para Matosinhos: quem quiser chegar em par ou sair em grupo pode dizer aqui. Também vale pedir boleia emocional antes e depois.',
    array['matosinhos', 'logistica', 'aftercare'],
    '2026-06-18T13:05:00+00:00',
    '2026-06-18T13:05:00+00:00'
  ),
  (
    'aaaaaaaa-0000-4000-8000-000000000004',
    '44444444-4444-4444-8444-444444444444',
    'g_cuidados',
    'pergunta',
    'grupo',
    'Quando uma conversa fica intensa',
    'O que fazem quando uma conversa começa sexy mas uma pessoa fica menos disponível a meio? Queria exemplos de pausas bonitas.',
    array['cuidado', 'pausa', 'desejo'],
    '2026-06-18T14:20:00+00:00',
    '2026-06-18T14:20:00+00:00'
  ),
  (
    'aaaaaaaa-0000-4000-8000-000000000005',
    '55555555-5555-4555-8555-555555555555',
    null,
    'nota',
    'comunidade',
    'Etiqueta para nudes sem matar o tesão',
    'Pedido claro, janela de consentimento, aviso de conteúdo e aftercare curto. Parece menos espontâneo no papel, mas na prática deixa mais espaço para brincar.',
    array['tesao', 'etiqueta', 'privacidade'],
    '2026-06-18T15:00:00+00:00',
    '2026-06-18T15:00:00+00:00'
  )
on conflict (id) do update
set title = excluded.title,
    body = excluded.body,
    tags = excluded.tags,
    updated_at = excluded.updated_at;

insert into public.feed_comments (id, post_id, author_id, body, created_at)
values
  (
    'dddddddd-0000-4000-8000-000000000001',
    'aaaaaaaa-0000-4000-8000-000000000001',
    '33333333-3333-4333-8333-333333333333',
    'Uso: "isto não é para controlar, é para ninguém ter de adivinhar". Tem resultado bem.',
    '2026-06-18T11:32:00+00:00'
  ),
  (
    'dddddddd-0000-4000-8000-000000000002',
    'aaaaaaaa-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111',
    'Isto é exatamente a diferença entre partilhar desejo e atirar conteúdo para cima de alguém.',
    '2026-06-18T12:52:00+00:00'
  ),
  (
    'dddddddd-0000-4000-8000-000000000003',
    'aaaaaaaa-0000-4000-8000-000000000004',
    '55555555-5555-4555-8555-555555555555',
    'Tenho usado "quero continuar a gostar desta conversa, por isso vou abrandar".',
    '2026-06-18T14:36:00+00:00'
  )
on conflict (id) do update
set body = excluded.body;

insert into public.feed_reactions (id, post_id, member_id, kind, created_at)
values
  ('eeeeeeee-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'same', '2026-06-18T11:34:00+00:00'),
  ('eeeeeeee-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333', 'heart', '2026-06-18T11:35:00+00:00'),
  ('eeeeeeee-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'spark', '2026-06-18T12:55:00+00:00'),
  ('eeeeeeee-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000005', '44444444-4444-4444-8444-444444444444', 'spark', '2026-06-18T15:08:00+00:00')
on conflict (id) do nothing;

insert into public.nocturno_items (
  id,
  kind,
  author_id,
  group_id,
  visibility,
  title,
  body,
  url,
  tags,
  warning,
  mood,
  mode,
  limits,
  aftercare,
  signed,
  open_to_talk,
  created_at,
  updated_at
)
values
  (
    'bbbbbbbb-0000-4000-8000-000000000001',
    'eroteca',
    '33333333-3333-4333-8333-333333333333',
    null,
    'comunidade',
    'Cinema queer lento',
    'Uma lista de cenas com tensão, negociação e olhar demorado. Bom para inspiração sem entrar em piloto automático.',
    'https://example.com/eroteca/cinema-queer-lento',
    array['queer', 'lento', 'olhar'],
    '18+, sexualidade explícita consensual',
    '',
    '',
    '',
    '',
    true,
    false,
    '2026-06-18T16:10:00+00:00',
    '2026-06-18T16:10:00+00:00'
  ),
  (
    'bbbbbbbb-0000-4000-8000-000000000002',
    'provocacao',
    '11111111-1111-4111-8111-111111111111',
    null,
    'comunidade',
    'A frase antes da foto',
    'Escreve a mensagem que gostavas de receber antes de uma nude: contexto, tom, limite e convite. A parte sexy começa antes do ficheiro.',
    '',
    array['nudes', 'mensagem', 'consentimento'],
    '',
    'quente, cuidadoso',
    'responder por texto',
    '',
    '',
    true,
    true,
    '2026-06-18T16:35:00+00:00',
    '2026-06-18T16:35:00+00:00'
  ),
  (
    'bbbbbbbb-0000-4000-8000-000000000003',
    'fantasia',
    '55555555-5555-4555-8555-555555555555',
    'g_cuidados',
    'grupo',
    'Hotel com regras claras',
    'Check-in separado, palavra de pausa combinada, telemóveis fora do quarto e uma mensagem de aftercare no dia seguinte.',
    '',
    array['fantasia', 'aftercare', 'hotel'],
    'fantasia adulta consensual',
    'lento, íntimo',
    'não improvisar limites novos no momento',
    'sem fotos, sem álcool',
    'mensagem no dia seguinte',
    true,
    true,
    '2026-06-18T17:05:00+00:00',
    '2026-06-18T17:05:00+00:00'
  ),
  (
    'bbbbbbbb-0000-4000-8000-000000000004',
    'confissao',
    '44444444-4444-4444-8444-444444444444',
    null,
    'comunidade',
    'Confissão pequena',
    'Fiquei mais excitade quando alguém perguntou "queres que eu continue?" do que quando tentou adivinhar.',
    '',
    array['confissao', 'pergunta', 'tesao'],
    '',
    'vulnerável',
    '',
    '',
    '',
    false,
    true,
    '2026-06-18T17:40:00+00:00',
    '2026-06-18T17:40:00+00:00'
  )
on conflict (id) do update
set title = excluded.title,
    body = excluded.body,
    tags = excluded.tags,
    warning = excluded.warning,
    mood = excluded.mood,
    mode = excluded.mode,
    limits = excluded.limits,
    aftercare = excluded.aftercare,
    updated_at = excluded.updated_at;
