-- Base seed data for immutable/reference tables

insert into public.brand_grades (brand, grades)
values
  ('Boulder Planet', array['Wild','1','2','3','4','5','6','7','8','9','10','11','12']),
  ('Boulder+', array['White','Yellow','Red','Blue','Purple','Green','Pink','Black']),
  ('FitBloc', array['0','1','2','3','4','5','6','7','8','Supercharged'])
on conflict (brand) do update
set grades = excluded.grades;

insert into public.gyms (id, name, brand, latitude, longitude, radius_meters, address)
values
  ('boulder-plus-aperia', 'Boulder+ Aperia', 'Boulder+', 1.3099000, 103.8642000, 100, '12 Kallang Ave, #03-17 Aperia Mall, Singapore 339511'),
  ('boulder-plus-chevrons', 'Boulder+ The Chevrons', 'Boulder+', 1.3310000, 103.7483000, 100, '48 Boon Lay Way, #04-01 The Chevrons, Singapore 609961'),
  ('boulder-planet-sembawang', 'Boulder Planet Sembawang', 'Boulder Planet', 1.4420000, 103.8251000, 100, '604 Sembawang Rd, #B1-22/23 Sembawang Shopping Centre, Singapore 758459'),
  ('boulder-planet-taiseng', 'Boulder Planet Tai Seng', 'Boulder Planet', 1.3340000, 103.8884000, 100, '601 MacPherson Rd, #02-07 Grantral Mall, Singapore 368242'),
  ('climb-central-kallang', 'Climb Central Kallang', 'Climb Central', 1.3027000, 103.8735000, 100, '1 Stadium Pl, #B1-01 Kallang Wave Mall, Singapore 397628'),
  ('climb-central-funan', 'Climb Central Funan', 'Climb Central', 1.2914000, 103.8499000, 100, '107 North Bridge Rd, #B2-19/21 Funan, Singapore 179105'),
  ('climb-central-novena', 'Climb Central Novena', 'Climb Central', 1.3204000, 103.8437000, 100, '238 Thomson Rd, #03-23/25 Velocity @ Novena Square, Singapore 307683'),
  ('bff-climb-bendemeer', 'BFF Climb Bendemeer', 'BFF Climb', 1.3123000, 103.8632000, 100, '2 Kallang Ave, #01-20 CT Hub, Singapore 339407'),
  ('fitbloc-depot', 'FitBloc Depot', 'FitBloc', 1.2813000, 103.8101000, 100, '108 Depot Rd, #02-01 Depot Heights Shopping Centre, Singapore 109670'),
  ('fitbloc-maxwell', 'FitBloc Maxwell', 'FitBloc', 1.2794000, 103.8467000, 100, '7 Maxwell Rd, #06-01 MND Building Annexe B, Singapore 069111'),
  ('lighthouse-climbing', 'Lighthouse Climbing', 'Lighthouse', 1.2750000, 103.7943000, 100, '44 Pasir Panjang Rd, #B-02, Singapore 118504')
on conflict (id) do update
set
  name = excluded.name,
  brand = excluded.brand,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  radius_meters = excluded.radius_meters,
  address = excluded.address;

insert into public.achievements (id, category, label, description, xp, is_hidden, sort_order)
values
  ('first-contact', 'exploration', 'First Contact', 'Check in at your first climbing gym.', 50, false, 1),
  ('gym-hopper', 'exploration', 'Gym Hopper', 'Visit 5 different gyms.', 100, false, 2),
  ('session-starter', 'grind', 'Session Starter', 'Complete your first recorded session.', 50, false, 3),
  ('ten-sessions', 'grind', 'Committed', 'Complete 10 sessions.', 200, false, 4),
  ('night-owl', 'easter_egg', 'Night Owl', 'Finish a session after midnight.', 80, true, 5),
  ('social-climber', 'community', 'Social Climber', 'Climb with 3 different friends.', 120, false, 6)
on conflict (id) do update
set
  category = excluded.category,
  label = excluded.label,
  description = excluded.description,
  xp = excluded.xp,
  is_hidden = excluded.is_hidden,
  sort_order = excluded.sort_order;
