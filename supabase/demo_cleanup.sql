-- Remove fictional demo content added for product walkthroughs.
-- Run this manually from the Supabase SQL editor or psql when the demo is no longer needed.

delete from public.messages
where id like 'demo_msg_%';

delete from public.feed_reactions
where id::text like 'eeeeeeee-%';

delete from public.feed_comments
where id::text like 'dddddddd-%';

delete from public.feed_posts
where id::text like 'aaaaaaaa-%';

delete from public.nocturno_items
where id::text like 'bbbbbbbb-%';

delete from public.trust_edges
where id::text like 'cccccccc-%';

delete from public.relationship_links
where id like 'demo_rel_%';

delete from public.mutual_interests
where id like 'demo_interest_%';

delete from public.warm_introductions
where id like 'demo_intro_%';

delete from public.member_intentions
where member_id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555'
);

delete from public.event_checkins
where id like 'demo_checkin_%';

delete from public.event_rooms
where id like 'demo_room_%';

delete from public.event_attendees
where event_id like 'demo_event_%'
   or member_id in (
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333',
    '44444444-4444-4444-8444-444444444444',
    '55555555-5555-4555-8555-555555555555'
   );

delete from public.event_attendees
where event_id in ('demo_event_matosinhos', 'demo_event_jantar_sem_fotos')
  and member_id = (select id from auth.users where email = 'tester@porto-nm.test' limit 1);

delete from public.events
where id like 'demo_event_%';

delete from public.decisions
where id like 'demo_decision_%';

delete from public.docs
where id like 'demo_doc_%'
   or code like 'DOC-DEMO-%';

delete from public.invite_codes
where code like 'DEMO-%';

delete from public.group_members
where member_id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555'
);

delete from public.group_members
where group_id in ('g_eventos', 'g_cuidados')
  and member_id = (select id from auth.users where email = 'tester@porto-nm.test' limit 1);

delete from public.profiles
where id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555'
);

delete from auth.users
where id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555'
);
