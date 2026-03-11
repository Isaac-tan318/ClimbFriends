# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Supabase Migration Notes

This repo now includes a Supabase-first backend scaffold:

- Supabase client: `lib/supabase.ts`
- Feature flags: `constants/feature-flags.ts`
- SQL schema + RLS: `supabase/migrations/202603110001_initial_schema.sql`
- Base seed data: `supabase/seed.sql`
- Edge function stubs: `supabase/functions/*`
- One-off mock import: `scripts/supabase/import-mock-data.mjs`

### Environment setup

1. Copy `.env.example` to `.env`.
2. Set:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. For scripts/functions also set:
   - `SUPABASE_SECRET_KEY`

### Feature flags

Use these environment flags during hybrid rollout:

- `EXPO_PUBLIC_FEATURE_AUTH`
- `EXPO_PUBLIC_FEATURE_SESSIONS`
- `EXPO_PUBLIC_FEATURE_FEED`
- `EXPO_PUBLIC_FEATURE_SOCIAL`
- `EXPO_PUBLIC_FEATURE_MESSAGES`
- `EXPO_PUBLIC_FEATURE_NOTIFICATIONS`
- `EXPO_PUBLIC_FEATURE_PRESENCE`
