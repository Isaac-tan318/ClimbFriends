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
  -- Existing Gyms with custom radius
  ('boulder-plus-aperia', 'Boulder+ Aperia', 'Boulder+', 1.3099000, 103.8642000, 15, '12 Kallang Ave, #03-17 Aperia Mall, Singapore 339511'),
  ('boulder-plus-chevrons', 'Boulder+ The Chevrons', 'Boulder+', 1.3310000, 103.7483000, 50, '48 Boon Lay Way, #04-01 The Chevrons, Singapore 609961'),
  ('boulder-planet-sembawang', 'Boulder Planet Sembawang', 'Boulder Planet', 1.4420000, 103.8251000, 30, '604 Sembawang Rd, #B1-22/23 Sembawang Shopping Centre, Singapore 758459'),
  ('boulder-planet-taiseng', 'Boulder Planet Tai Seng', 'Boulder Planet', 1.3340000, 103.8884000, 15, '601 MacPherson Rd, #02-07 Grantral Mall, Singapore 368242'),
  ('climb-central-kallang', 'Climb Central Kallang', 'Climb Central', 1.3027000, 103.8735000, 15, '1 Stadium Pl, #B1-01 Kallang Wave Mall, Singapore 397628'),
  ('climb-central-funan', 'Climb Central Funan', 'Climb Central', 1.2914000, 103.8499000, 20, '107 North Bridge Rd, #B2-19/21 Funan, Singapore 179105'),
  ('climb-central-novena', 'Climb Central Novena', 'Climb Central', 1.3204000, 103.8437000, 10, '238 Thomson Rd, #03-23/25 Velocity @ Novena Square, Singapore 307683'),
  ('bff-climb-bendemeer', 'BFF Climb Bendemeer', 'BFF Climb', 1.3123000, 103.8632000, 25, '2 Kallang Ave, #01-20 CT Hub, Singapore 339407'),
  ('fitbloc-depot', 'FitBloc Depot', 'FitBloc', 1.2813000, 103.8101000, 30, '108 Depot Rd, #02-01 Depot Heights Shopping Centre, Singapore 109670'),
  ('fitbloc-maxwell', 'FitBloc Maxwell', 'FitBloc', 1.2794000, 103.8467000, 40, '7 Maxwell Rd, #06-01 MND Building Annexe B, Singapore 069111'),
  ('lighthouse-climbing', 'Lighthouse Climbing', 'Lighthouse', 1.2750000, 103.7943000, 15, '44 Pasir Panjang Rd, #B-02, Singapore 118504'),
  
  -- Newly Added Gyms
  ('climb-central-cck', 'Climb Central SAFRA Choa Chu Kang', 'Climb Central', 1.3887000, 103.7473000, 30, '28 Choa Chu Kang Dr, #03-02A SAFRA, Singapore 689964'),
  ('bff-climb-yoha', 'BFF Climb Yoha', 'BFF Climb', 1.3434000, 103.9416000, 15, '6 Tampines St 92, #03-06 yo:HA Commercial, Singapore 528893'),
  ('bff-climb-tampines-hub', 'BFF Climb Tampines Hub', 'BFF Climb', 1.3540000, 103.9403000, 30, '1 Tampines Walk, #02-81 Our Tampines Hub, Singapore 528523'),
  ('fitbloc-sciencepark', 'FitBloc Science Park', 'FitBloc', 1.2878000, 103.7905000, 30, '87 Science Park Dr, #03-02 The Oasis, Singapore 118260'),
  ('outpost-climbing', 'Outpost Climbing', 'Outpost', 1.3047000, 103.8622000, 30, '464 Crawford Ln, #01-464, Singapore 190464'),
  ('climba-gym', 'Climba Gym', 'Climba', 1.2792000, 103.8493000, 30, '61 Robinson Rd, #05-03/04, Singapore 068893'),
  ('oyeyo', 'OYEYO Boulder Home', 'Oyeyo', 1.3072000, 103.8468000, 30, '148 Mackenzie Rd, Singapore 228724'),
  ('z-vertigo', 'Z-Vertigo Boulder Gym', 'Z-Vertigo', 1.3429000, 103.7762000, 30, '170 Upper Bukit Timah Rd, #B2-20B Bukit Timah Shopping Centre, Singapore 588179')
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
  -- Exploration Badges
  ('first-contact', 'exploration', 'First Contact', 'Check in at your first climbing gym.', 50, false, 1),
  ('east-coast-plan', 'exploration', 'East Coast Plan', 'Visit three different gyms in the East (BFF Tampines OTH, BFF Yoha, Climb@T3, Upwall Climbing).', 150, false, 2),
  ('journey-to-the-west', 'exploration', 'Journey to the west', 'Visit three different gyms in the West (Boulder+ Chervons, Climb Central Chua Chu Kang, Fitbloc Depot Heights, Fitbloc Kent Ridge, Lighthouse Climbing, Z-Vertigo Boulder Gym).', 150, false, 3),
  ('northern-attitude', 'exploration', 'Northern attitude', 'Visit three different gyms in the North/North East (Boulder Planet Sembawang, Boulder Planet Taiseng, Boulder Movement Taiseng, Ark Bloc).', 150, false, 4),
  ('sendtral', 'exploration', 'Sendtral', 'Visit three different gyms in Central Singapore (Kinetics Climbing, Ground Up Climbing, OYEYO Boulder Home, Boulder Movement Rochor, Climb Central Kallang, Outpost Climbing).', 150, false, 5),
  ('south', 'exploration', 'South', 'Visit three different gyms in the South/CBD area (Climba, Boulder Movement Downtown, Boulder Movement Bugis, Climb Central Funan).', 150, false, 6),
  ('island-hopper', 'exploration', 'Island Hopper', 'Visit at least one gym in the North, South, East, West, and Central regions.', 150, false, 7),
  ('how-did-we-get-here', 'exploration', 'How did we get here?', 'Visit every single climbing gym in Singapore.', 1000, false, 8),
  ('gym-hopper', 'exploration', 'Gym Hopper', 'Visit 5 different gyms.', 100, false, 9),

  -- Grind Badges
  ('the-worm', 'grind', 'The Worm', 'Enter a gym before 10:30 AM.', 100, false, 10),
  ('weekend-warrior', 'grind', 'Weekend Warrior', 'Log a session on both Saturday and Sunday in the same weekend.', 100, false, 11),
  ('regular-shower', 'grind', 'Regular shower', 'Climb at least 3 days a week for 4 weeks in a row.', 500, false, 12),
  ('well-hydrated', 'grind', 'Well hydrated', 'Log 100 or more total hours of climbing.', 500, false, 13),
  ('extraterrestrial', 'grind', 'Extraterrestrial', 'Log 100 sessions in a single Boulder Planet outlet.', 1500, false, 14),
  ('umai', 'grind', 'Umai!', 'Log 100 sessions in a single Climba outlet.', 1500, false, 15),
  ('flow', 'grind', 'Flow', 'Log 100 sessions in a single Boulder Movement outlet.', 1500, false, 16),
  ('illuminator', 'grind', 'The Illuminator', 'Log 100 sessions in a single Lighthouse Climbing outlet.', 1500, false, 17),
  ('center-stage', 'grind', 'Center Stage', 'Log 100 sessions in a single Climb Central outlet.', 1500, false, 18),
  ('session-starter', 'grind', 'Session Starter', 'Complete your first recorded session.', 50, false, 19),
  ('ten-sessions', 'grind', 'Committed', 'Complete 10 sessions.', 200, false, 20),

  -- Community Badges
  ('climbfriends', 'community', 'ClimbFriends', 'Add your first friend on the app.', 50, false, 21),
  ('buddy-climbs', 'community', 'Buddy climbs', 'Climb at the same gym with a friend for at least 2 hours.', 100, false, 22),
  ('squads', 'community', 'Squads', 'Have a session where 4 or more mutual friends are at the same gym at the same time.', 200, false, 23),
  ('five-stack', 'community', 'Five stack', 'Send out a session invite that 4 or more people accept and actually attend.', 300, false, 24),
  ('full-lobby', 'community', 'Full lobby', 'Send out a session invite that 10 or more people accept and actually attend.', 1000, false, 25),
  ('last-warning', 'community', 'Last warning', 'Send out a session invite that 25 or more people accept and actually attend.', 1500, false, 26),
  ('question', 'community', '?????????????', 'Send out a session invite that 50 or more people accept and actually attend.', 5000, false, 27),
  ('where-have-you-been', 'community', 'Where have you been?', 'Invite a friend that you have not climbed with for at least 3 months, and actually attend.', 150, false, 28),
  ('social-climber', 'community', 'Social Climber', 'Climb with 3 different friends.', 120, false, 29),

  -- Progression Badges
  ('breaking-the-plateau', 'progression', 'Breaking the Plateau', 'Manually log a new max grade for the first time (e.g., moving from BM3 to BM4, or V3 to V4).', 100, false, 30),
  ('stoned', 'progression', 'Stoned', 'Log 42 hours specifically at high-wall gyms (like Climb Central Sports Hub or Ground Up).', 500, false, 31),
  ('flash-master', 'progression', 'Flash Master', 'Log a session where you flashed a route at your max grade.', 250, false, 32),
  ('system-calibrator', 'progression', 'System Calibrator', 'Log 10 benchmark problems on a system board of your choice.', 200, false, 33),
  ('creative-space', 'progression', 'Creative Space', 'Set and log 5 custom boulder problems on the spray wall.', 200, false, 34),
  ('rock-solid', 'progression', 'Rock Solid', 'Do 50 consecutive moves on an endurance wall.', 200, false, 35),
  ('strong-contender', 'progression', 'Strong Contender', 'Complete a competition style boulder on the comp wall.', 250, false, 36),

  -- Fun / Easter Eggs (Hidden Badges)
  ('crowd-surfer', 'easter_egg', 'Crowd Surfer', 'Enter a gym when the app live map marks it as Very Crowded.', 100, true, 37),
  ('ghost-town', 'easter_egg', 'Ghost Town', 'Enter a gym when you are the only person using the app there.', 100, true, 38),
  ('rest-days-are-a-myth', 'easter_egg', 'Rest Days Are A Myth', 'Log a gym session 7 days in a row.', 200, true, 39),
  ('the-end-question', 'easter_egg', 'The End?', 'Climb at least one highest graded route in every gym in Singapore.', 1000, true, 40),
  ('the-beginning-question', 'easter_egg', 'The beginning?', 'Enter a local comp for the first time in any category (Novice-open).', 100, true, 41),
  ('the-beginning', 'easter_egg', 'The beginning', 'Win a local comp for the first time in any category (Novice-open).', 500, true, 42),
  ('the-end', 'easter_egg', 'The End', 'Win a local comp for the first time in open category.', 1000, true, 43),
  ('top-of-the-world', 'easter_egg', 'Top of the world', 'Enter and win an international comp of any discipline (boulder, lead, speed climb).', 5000, true, 44),
  ('overkill', 'easter_egg', 'Overkill', 'Flash all the routes in a local comp for bouldering in any category.', 2000, true, 45),
  ('over-overkill', 'easter_egg', 'Over-Overkill', 'Flash all the routes in an international comp for bouldering.', 10000, true, 46),
  ('night-owl', 'easter_egg', 'Night Owl', 'Finish a session after midnight.', 80, true, 47)
on conflict (id) do update
set
  category = excluded.category,
  label = excluded.label,
  description = excluded.description,
  xp = excluded.xp,
  is_hidden = excluded.is_hidden,
  sort_order = excluded.sort_order;