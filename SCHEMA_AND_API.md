# ClimbFriends - Database Schema & API Routes

## Table of Contents

1. [Database Schema](#database-schema)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [API Routes](#api-routes)
4. [Missing Data & Gaps](#missing-data--gaps)

---

## Database Schema

### `users`

The central identity table. Currently hard-coded as `CURRENT_USER` / `MOCK_USERS`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK | |
| `email` | `varchar(255)` | UNIQUE, NOT NULL | |
| `display_name` | `varchar(100)` | NOT NULL | |
| `avatar_url` | `text` | NULLABLE | |
| `password_hash` | `varchar(255)` | NOT NULL | **MISSING** - no auth exists in the app |
| `level` | `integer` | NOT NULL, DEFAULT 1 | **MISSING** - currently hard-coded in UI |
| `xp` | `integer` | NOT NULL, DEFAULT 0 | **MISSING** - currently hard-coded in UI |
| `tier` | `varchar(20)` | NOT NULL, DEFAULT 'Noob' | **MISSING** - derived from level in UI |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | **MISSING** - needed for profile edits |

---

### `user_settings`

Per-user preferences. Currently in `settings-store.ts`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `user_id` | `uuid` | PK, FK -> `users.id` | |
| `location_enabled` | `boolean` | NOT NULL, DEFAULT true | |
| `friend_visibility_enabled` | `boolean` | NOT NULL, DEFAULT true | |
| `notifications_enabled` | `boolean` | NOT NULL, DEFAULT true | |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | **MISSING** |

---

### `gyms`

The gym directory. Currently hard-coded as `SINGAPORE_GYMS` in `data/gyms.ts` (20 gyms).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `varchar(100)` | PK | Slug-style IDs (e.g. `boulder-plus-aperia`) |
| `name` | `varchar(200)` | NOT NULL | |
| `brand` | `varchar(100)` | NOT NULL | e.g. "Boulder+", "Climb Central" |
| `latitude` | `decimal(10,7)` | NOT NULL | |
| `longitude` | `decimal(10,7)` | NOT NULL | |
| `radius_meters` | `integer` | NOT NULL | For geofence auto-detection |
| `address` | `text` | NOT NULL | |
| `image_url` | `text` | NULLABLE | |
| `grades` | `text[]` | NULLABLE | Grade system (overrides brand default) |
| `walls` | `text[]` | NULLABLE | Named wall sections |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | **MISSING** |

---

### `brand_grades`

Grade systems per gym brand. Currently hard-coded as `BRAND_GRADES` in `data/gyms.ts`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `brand` | `varchar(100)` | PK | |
| `grades` | `text[]` | NOT NULL | Ordered list of grades |

> Could alternatively be a JSON column on `gyms` or remain bundled client-side since grades rarely change.

---

### `climbing_sessions`

Climbing session records. Currently in `session-store.ts`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK -> `users.id`, NOT NULL | **NOTE**: The app currently calls this `oderId` (typo for `ownerId`) |
| `gym_id` | `varchar(100)` | FK -> `gyms.id`, NOT NULL | |
| `started_at` | `timestamptz` | NOT NULL | |
| `ended_at` | `timestamptz` | NULLABLE | NULL while session is active |
| `duration_minutes` | `integer` | NOT NULL, DEFAULT 0 | Computed on session end |
| `is_active` | `boolean` | NOT NULL, DEFAULT true | |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | **MISSING** |

**Index**: `(user_id, started_at DESC)` for session history queries.

---

### `logged_climbs`

Individual climbs logged within a session. Currently nested as `climbs[]` in `ClimbingSession`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK | |
| `session_id` | `uuid` | FK -> `climbing_sessions.id`, NOT NULL | |
| `gym_id` | `varchar(100)` | FK -> `gyms.id`, NOT NULL | |
| `user_id` | `uuid` | FK -> `users.id`, NOT NULL | **MISSING** - needed for per-user climb queries |
| `grade` | `varchar(50)` | NOT NULL | |
| `color` | `varchar(20)` | NOT NULL | |
| `wall` | `varchar(100)` | NOT NULL | |
| `instagram_url` | `text` | NOT NULL, DEFAULT '' | Empty string if not provided |
| `logged_at` | `timestamptz` | NOT NULL, DEFAULT now() | |

**Index**: `(session_id)`, `(gym_id, logged_at DESC)` for beta feed queries.

---

### `friendships`

Friend relationships. The `Friendship` type exists in `types/index.ts` but is **unused** - friends are currently hard-coded as `MOCK_FRIENDS`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK | |
| `requester_id` | `uuid` | FK -> `users.id`, NOT NULL | |
| `addressee_id` | `uuid` | FK -> `users.id`, NOT NULL | |
| `status` | `varchar(10)` | NOT NULL, CHECK IN ('pending', 'accepted', 'rejected') | |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | **MISSING** |

**Unique constraint**: `(requester_id, addressee_id)`
**Index**: `(addressee_id, status)` for incoming request queries.

---

### `user_locations`

Real-time user location/gym presence. Currently modeled as fields on `Friend` (`currentGymId`, `isAtGym`, `lastSeenAt`).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `user_id` | `uuid` | PK, FK -> `users.id` | |
| `current_gym_id` | `varchar(100)` | FK -> `gyms.id`, NULLABLE | NULL when not at a gym |
| `is_at_gym` | `boolean` | NOT NULL, DEFAULT false | |
| `last_seen_at` | `timestamptz` | NULLABLE | |
| `latitude` | `decimal(10,7)` | NULLABLE | **MISSING** - for distance calculations |
| `longitude` | `decimal(10,7)` | NULLABLE | **MISSING** - for distance calculations |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | **MISSING** |

> This table is better suited as a **real-time presence system** (e.g. via WebSockets or polling) rather than standard REST. See API routes section.

---

### `planned_visits`

Planned future climbing sessions. Currently in `social-store.ts`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK -> `users.id`, NOT NULL | Creator |
| `gym_id` | `varchar(100)` | FK -> `gyms.id`, NOT NULL | |
| `planned_date` | `timestamptz` | NOT NULL | |
| `message` | `text` | NULLABLE | **MISSING** - the invite flow has a message input but it's not persisted |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | |

**Index**: `(user_id, planned_date)` for upcoming plans.

---

### `visit_invites`

Invitations to planned visits. Currently nested as `invitees[]` in `PlannedVisit`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK | |
| `planned_visit_id` | `uuid` | FK -> `planned_visits.id`, NOT NULL | |
| `invitee_id` | `uuid` | FK -> `users.id`, NOT NULL | |
| `status` | `varchar(10)` | NOT NULL, DEFAULT 'pending', CHECK IN ('pending', 'accepted', 'declined') | |
| `responded_at` | `timestamptz` | NULLABLE | **MISSING** |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | **MISSING** |

**Unique constraint**: `(planned_visit_id, invitee_id)`

---

### `feed_posts`

Published session posts and send posts for the community feed. Currently modeled as `BetaPost` in `data/mock-beta.ts` (not in the central types file).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK | |
| `type` | `varchar(10)` | NOT NULL, CHECK IN ('session', 'send') | |
| `user_id` | `uuid` | FK -> `users.id`, NOT NULL | |
| `gym_id` | `varchar(100)` | FK -> `gyms.id`, NOT NULL | |
| `posted_at` | `timestamptz` | NOT NULL, DEFAULT now() | |
| `session_id` | `uuid` | FK -> `climbing_sessions.id`, NULLABLE | **MISSING** - needed to link posts to actual sessions |
| `session_duration_minutes` | `integer` | NULLABLE | For type='session' |
| `climb_count` | `integer` | NULLABLE | For type='session' |
| `grade` | `varchar(50)` | NULLABLE | For type='send' |
| `color` | `varchar(20)` | NULLABLE | For type='send' |
| `wall` | `varchar(100)` | NULLABLE | For type='send' |
| `instagram_url` | `text` | NULLABLE | For type='send' |
| `description` | `text` | NULLABLE | **MISSING** - the publish modal has a description field |

**Index**: `(gym_id, posted_at DESC)` for per-gym beta feed, `(posted_at DESC)` for global feed.

---

### `feed_post_climbed_with`

Junction table for "climbed with" on session posts. Currently a `climbedWithNames: string[]` on `BetaPost` (denormalized names).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `feed_post_id` | `uuid` | FK -> `feed_posts.id`, NOT NULL | |
| `user_id` | `uuid` | FK -> `users.id`, NOT NULL | |

**PK**: `(feed_post_id, user_id)`

---

### `user_achievements`

Tracks which achievements each user has unlocked. Currently hard-coded inline in `settings.tsx` (~40 achievements).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `user_id` | `uuid` | FK -> `users.id`, NOT NULL | |
| `achievement_id` | `varchar(50)` | NOT NULL | e.g. 'first-contact', 'dawn-patrol' |
| `unlocked_at` | `timestamptz` | NOT NULL, DEFAULT now() | **MISSING** |

**PK**: `(user_id, achievement_id)`

> The achievement **definitions** (emoji, label, description, xp, category) can remain client-side constants or be stored in a separate `achievements` reference table.

---

### `achievements` (reference table)

Achievement definitions. Currently hard-coded in `settings.tsx` across 5 categories.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `varchar(50)` | PK | |
| `category` | `varchar(30)` | NOT NULL | 'exploration', 'grind', 'community', 'progression', 'easter_egg' |
| `label` | `varchar(100)` | NOT NULL | |
| `description` | `text` | NOT NULL | |
| `xp` | `integer` | NOT NULL, DEFAULT 0 | |
| `is_hidden` | `boolean` | NOT NULL, DEFAULT false | Easter egg badges hide description |
| `sort_order` | `integer` | NOT NULL | |

---

### `notifications`

**MISSING entirely** - the app has a `notificationsEnabled` setting but no notification system.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK -> `users.id`, NOT NULL | Recipient |
| `type` | `varchar(30)` | NOT NULL | 'friend_request', 'invite', 'plan_reminder', etc. |
| `title` | `varchar(200)` | NOT NULL | |
| `body` | `text` | NULLABLE | |
| `data` | `jsonb` | NULLABLE | Contextual payload (friend_id, visit_id, etc.) |
| `read_at` | `timestamptz` | NULLABLE | |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | |

---

### `messages`

**MISSING entirely** - the friends page has a message button (chat emoji) but no messaging system.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK | |
| `sender_id` | `uuid` | FK -> `users.id`, NOT NULL | |
| `receiver_id` | `uuid` | FK -> `users.id`, NOT NULL | |
| `content` | `text` | NOT NULL | |
| `read_at` | `timestamptz` | NULLABLE | |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | |

> Alternatively could use a `conversations` + `messages` model for group chat support.

---

## Entity Relationship Diagram

```
                              +------------------+
                              |      users       |
                              +------------------+
                              | id (PK)          |
                              | email            |
                              | display_name     |
                              | avatar_url       |
                              | password_hash    |
                              | level            |
                              | xp               |
                              | tier             |
                              | created_at       |
                              +--------+---------+
                                       |
          +-------------------+--------+---------+------------------+
          |                   |        |         |                  |
          v                   v        |         v                  v
  +-------+--------+  +------+-----+  |  +------+--------+  +-----+----------+
  | user_settings   |  | user_      |  |  | friendships   |  | notifications  |
  +----------------+  | locations  |  |  +---------------+  +--------------+
  | user_id (PK/FK)|  +------------+  |  | requester_id  |  | user_id (FK) |
  | location_on    |  | user_id(PK)|  |  | addressee_id  |  | type         |
  | friend_vis_on  |  | gym_id(FK) |  |  | status        |  | title, body  |
  | notif_on       |  | is_at_gym  |  |  +---------------+  +--------------+
  +----------------+  | last_seen  |  |
                       +------------+  |
                                       |
     +---------------------------------+-------------------------------+
     |                    |                       |                    |
     v                    v                       v                    v
+----+--------+   +-------+----------+   +-------+-------+   +-------+-------+
| climbing_   |   | planned_visits   |   | feed_posts    |   | user_         |
| sessions    |   +------------------+   +---------------+   | achievements  |
+-------------+   | id (PK)          |   | id (PK)       |   +---------------+
| id (PK)     |   | user_id (FK)     |   | type          |   | user_id (FK)  |
| user_id(FK) |   | gym_id (FK)      |   | user_id (FK)  |   | achiev_id     |
| gym_id (FK) |   | planned_date     |   | gym_id (FK)   |   | unlocked_at   |
| started_at  |   | message          |   | session_id(FK)|   +---------------+
| ended_at    |   +--------+---------+   | posted_at     |
| duration    |            |             | description   |
| is_active   |            v             +-------+-------+
+------+------+   +--------+---------+           |
       |          | visit_invites    |           v
       v          +------------------+   +-------+-----------+
+------+------+   | planned_visit_id |   | feed_post_        |
| logged_     |   | invitee_id (FK)  |   | climbed_with      |
| climbs      |   | status           |   +-------------------+
+-------------+   +------------------+   | feed_post_id (FK) |
| id (PK)     |                          | user_id (FK)      |
| session_id  |                          +-------------------+
| gym_id (FK) |
| user_id(FK) |        +------------------+
| grade       |        |      gyms        |
| color       |        +------------------+
| wall        |        | id (PK)          |
| insta_url   |        | name, brand      |
| logged_at   |        | lat, lng, radius |
+-------------+        | address          |
                        | image_url        |
                        | grades[], walls[]|
                        +------------------+
```

---

## API Routes

### Authentication

**MISSING** - No auth system exists. These are required.

| Method | Route | Description | Request Body | Response |
|--------|-------|-------------|-------------|----------|
| `POST` | `/api/auth/register` | Create account | `{ email, displayName, password }` | `{ user, token }` |
| `POST` | `/api/auth/login` | Login | `{ email, password }` | `{ user, token }` |
| `POST` | `/api/auth/logout` | Logout | - | `204` |
| `GET` | `/api/auth/me` | Get current user | - | `{ user }` |
| `POST` | `/api/auth/refresh` | Refresh token | `{ refreshToken }` | `{ token }` |

---

### Users & Profile

| Method | Route | Description | Request Body | Response |
|--------|-------|-------------|-------------|----------|
| `GET` | `/api/users/:id` | Get user profile | - | `{ user }` |
| `PATCH` | `/api/users/:id` | Update profile | `{ displayName?, avatarUrl? }` | `{ user }` |
| `GET` | `/api/users/:id/stats` | Get user stats | - | `{ UserStats }` |
| `GET` | `/api/users/:id/achievements` | Get unlocked achievements | - | `{ achievements[] }` |
| `GET` | `/api/users/:id/level` | Get level, XP, tier | - | `{ level, xp, tier, xpToNext }` |

---

### User Settings

| Method | Route | Description | Request Body | Response |
|--------|-------|-------------|-------------|----------|
| `GET` | `/api/settings` | Get current user settings | - | `{ settings }` |
| `PATCH` | `/api/settings` | Update settings | `{ locationEnabled?, friendVisibilityEnabled?, notificationsEnabled? }` | `{ settings }` |

---

### Gyms

| Method | Route | Description | Query Params | Response |
|--------|-------|-------------|-------------|----------|
| `GET` | `/api/gyms` | List all gyms | `?brand=&search=` | `{ gyms[] }` |
| `GET` | `/api/gyms/:id` | Get gym details | - | `{ gym }` |
| `GET` | `/api/gyms/:id/grades` | Get grade system for gym | - | `{ grades[] }` |
| `GET` | `/api/gyms/:id/walls` | Get wall names for gym | - | `{ walls[] }` |
| `GET` | `/api/gyms/:id/friends` | Get friends currently at gym | - | `{ friends[] }` |

---

### Climbing Sessions

| Method | Route | Description | Request Body | Response |
|--------|-------|-------------|-------------|----------|
| `POST` | `/api/sessions` | Start a new session | `{ gymId }` | `{ session }` |
| `PATCH` | `/api/sessions/:id/end` | End an active session | - | `{ session }` |
| `GET` | `/api/sessions` | List user's sessions | `?limit=&offset=&period=all\|week\|month` | `{ sessions[], total }` |
| `GET` | `/api/sessions/active` | Get current active session | - | `{ session \| null }` |
| `GET` | `/api/sessions/:id` | Get session details | - | `{ session }` |

---

### Logged Climbs

| Method | Route | Description | Request Body | Response |
|--------|-------|-------------|-------------|----------|
| `POST` | `/api/sessions/:id/climbs` | Log a climb | `{ grade, color, wall, instagramUrl? }` | `{ climb }` |
| `GET` | `/api/sessions/:id/climbs` | Get climbs for a session | - | `{ climbs[] }` |

---

### Friends

| Method | Route | Description | Request Body | Response |
|--------|-------|-------------|-------------|----------|
| `GET` | `/api/friends` | List friends | - | `{ friends[] }` (includes location/status) |
| `POST` | `/api/friends/request` | Send friend request | `{ userId }` | `{ friendship }` |
| `PATCH` | `/api/friends/request/:id` | Accept/reject request | `{ status: 'accepted'\|'rejected' }` | `{ friendship }` |
| `DELETE` | `/api/friends/:id` | Remove a friend | - | `204` |
| `GET` | `/api/friends/requests` | Get pending requests | - | `{ incoming[], outgoing[] }` |

---

### Location / Presence

| Method | Route | Description | Request Body | Response |
|--------|-------|-------------|-------------|----------|
| `POST` | `/api/location/update` | Update current location | `{ latitude, longitude }` | `{ currentGymId \| null }` |
| `POST` | `/api/location/checkin` | Manual gym check-in | `{ gymId }` | `{ success }` |
| `POST` | `/api/location/checkout` | Manual gym check-out | - | `{ success }` |

> Consider WebSocket/SSE for real-time friend presence updates instead of polling.

---

### Planned Visits

| Method | Route | Description | Request Body | Response |
|--------|-------|-------------|-------------|----------|
| `POST` | `/api/plans` | Create a planned visit | `{ gymId, plannedDate, message? }` | `{ plan }` |
| `GET` | `/api/plans` | List upcoming plans | - | `{ plans[] }` |
| `GET` | `/api/plans/:id` | Get plan details | - | `{ plan }` |
| `DELETE` | `/api/plans/:id` | Cancel a plan | - | `204` |
| `POST` | `/api/plans/:id/invite` | Invite friend(s) to plan | `{ friendIds[], message? }` | `{ invites[] }` |
| `PATCH` | `/api/plans/:id/respond` | Accept/decline invite | `{ status: 'accepted'\|'declined' }` | `{ invite }` |

---

### Feed / Beta Posts

| Method | Route | Description | Query Params | Response |
|--------|-------|-------------|-------------|----------|
| `POST` | `/api/feed/publish` | Publish a session | `{ sessionId, description?, climbedWithUserIds? }` | `{ post }` |
| `GET` | `/api/feed` | Get global feed | `?limit=&offset=&type=session\|send` | `{ posts[], total }` |
| `GET` | `/api/feed/gym/:gymId` | Get beta posts for a gym | `?grade=&wall=&limit=&offset=` | `{ posts[], total }` |

---

### Leaderboards

| Method | Route | Description | Query Params | Response |
|--------|-------|-------------|-------------|----------|
| `GET` | `/api/leaderboards/friends` | Friends leaderboard | `?limit=` | `{ entries[], currentUserRank }` |
| `GET` | `/api/leaderboards/national` | National leaderboard | `?limit=&offset=` | `{ entries[], currentUserRank, total }` |
| `GET` | `/api/leaderboards/gyms` | Gym leaderboard | `?limit=` | `{ entries[] }` |

---

### Notifications

| Method | Route | Description | Query Params | Response |
|--------|-------|-------------|-------------|----------|
| `GET` | `/api/notifications` | Get user notifications | `?unreadOnly=` | `{ notifications[], unreadCount }` |
| `PATCH` | `/api/notifications/:id/read` | Mark as read | - | `204` |
| `POST` | `/api/notifications/read-all` | Mark all as read | - | `204` |

---

### Messages

| Method | Route | Description | Request Body / Params | Response |
|--------|-------|-------------|-------------|----------|
| `GET` | `/api/messages/:userId` | Get conversation with user | `?limit=&before=` | `{ messages[] }` |
| `POST` | `/api/messages/:userId` | Send a message | `{ content }` | `{ message }` |

---

## Missing Data & Gaps

### Critical (blocks core features)

| Gap | Where | Impact |
|-----|-------|--------|
| **No authentication system** | Entire app | No `password_hash`, no tokens, no login/register flow. User is hard-coded as `'user-1'`. |
| **`oderId` typo** | `ClimbingSession` in `types/index.ts:29` | Field should be `userId` or `ownerId`. This typo propagates through all session logic. |
| **No data persistence** | All stores | Zustand stores are in-memory only. No `AsyncStorage`, no database, no API calls. All data resets on app restart. |
| **`constants/endpoints.ts` is empty** | `constants/endpoints.ts` | No API base URL or endpoint constants defined. |
| **`BetaPost` not in central types** | `data/mock-beta.ts:13-29` | The `BetaPost` interface is defined locally in the mock data file, not exported from `types/index.ts`. |
| **`GymLeaderboardEntry` not in central types** | `data/mock-sessions.ts:311-319` | Same issue - defined locally in mock data, not in the types barrel. |

### Functional (features referenced in UI but not implemented)

| Gap | Where | Impact |
|-----|-------|--------|
| **Add Friend button has no handler** | `friends.tsx` | The "+ Add Friend" button renders but does nothing on press. No search/add user flow exists. |
| **Message button has no handler** | `friends.tsx` | Chat emoji button on each friend card does nothing. No messaging schema, API, or UI exists. |
| **Notification system absent** | `settings-store.ts` | `notificationsEnabled` setting exists but there is no notification storage, delivery, or display system (no push tokens, no notification feed). |
| **Profile edit/settings buttons are decorative** | `settings.tsx` | Edit and settings buttons on the profile banner have no handlers wired. No profile edit form exists. |
| **`Friendship` type unused** | `types/index.ts:53-59` | The friend request/accept/reject workflow type is defined but never referenced in any store or component. Friends are directly added as `Friend` objects. |
| **Invite message not persisted** | `index.tsx` (friend picker) | The invite flow lets users type a custom message, but `PlannedVisit` and `VisitInvite` have no `message` field. |
| **Achievements are hard-coded** | `settings.tsx:51-571` | ~40 achievements with unlock status are defined as static constants in the component, not derived from user data or a database. |
| **Level/XP system is hard-coded** | `settings.tsx` | Level 4, 1250 XP, and tier "Noob" are static values in the component with no derivation logic. |
| **Gym distance is random** | `gyms.tsx` | Distance shown on gym cards is `Math.random()`, not computed from actual user location. |
| **Session stats not server-computed** | `session-store.ts` | Stats like `currentStreak`, `longestStreak`, `sessionsThisWeek` are initialized from mock data, not computed from actual session records. |
| **"Climbed with" on session posts uses names** | `mock-beta.ts` | `climbedWithNames: string[]` is denormalized (just names, not user IDs), making it impossible to link back to user profiles. |
| **No "like" or "comment" on feed posts** | Feed/Beta pages | Social feed has no interaction primitives beyond viewing. |

### Data Model Improvements Needed

| Improvement | Description |
|-------------|-------------|
| **Add `push_token` to users** | Needed for push notifications via Expo/FCM/APNs. |
| **Add `user_id` to `logged_climbs`** | Currently only linked via `session_id`. Direct user FK enables efficient queries like "all my sends at grade X". |
| **Add `session_id` to `feed_posts`** | Published session posts should link back to the actual session record for data integrity. |
| **Add `description` to `feed_posts`** | The publish modal has a description text input, but the `BetaPost` type has no field for it. |
| **Add `message` to `planned_visits`** | The invite flow UI has a message input field, but the data model doesn't store it. |
| **Add `responded_at` to `visit_invites`** | Track when an invite was accepted/declined. |
| **Add `updated_at` timestamps** | Most tables lack `updated_at` for tracking modifications. |
| **Normalize `climbedWith` on feed posts** | Replace `climbedWithNames: string[]` with a proper junction table (`feed_post_climbed_with`) using user IDs. |
| **Move `BetaPost` and `GymLeaderboardEntry` to central types** | These are defined in mock data files instead of `types/index.ts`. |
| **Rename `oderId` to `userId`** | Fix the typo on `ClimbingSession` (`types/index.ts:29`) and all references. |
| **Consider a `gym_visits` aggregate table** | For computing "favourite gym" and gym-level stats efficiently without scanning all sessions. |
| **Add `deleted_at` soft delete** | For sessions, posts, and friendships to support undo and audit trails. |
