with tester as (
  select id
  from auth.users
  where email = 'tester@porto-nm.test'
  limit 1
)
insert into public.group_members (group_id, member_id)
select group_id, tester.id
from tester
cross join (values ('g_eventos'), ('g_cuidados')) as groups(group_id)
where tester.id is not null
on conflict do nothing;

with tester as (
  select id
  from auth.users
  where email = 'tester@porto-nm.test'
  limit 1
)
insert into public.event_attendees (event_id, member_id)
select event_id, tester.id
from tester
cross join (values ('demo_event_matosinhos'), ('demo_event_jantar_sem_fotos')) as events(event_id)
where tester.id is not null
on conflict do nothing;

with tester as (
  select id
  from auth.users
  where email = 'tester@porto-nm.test'
  limit 1
)
update public.event_rooms
set member_ids =
  case
    when tester.id = any(event_rooms.member_ids) then event_rooms.member_ids
    else array_append(event_rooms.member_ids, tester.id)
  end
from tester
where event_rooms.id in ('demo_room_matosinhos_logistica', 'demo_room_jantar_aftercare')
  and tester.id is not null;
