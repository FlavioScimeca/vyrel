# Mobile smoke checklist

1. Start API: `bun run --cwd apps/server dev` (listen on `0.0.0.0` / reachable from the device)
2. Set `EXPO_PUBLIC_SERVER_URL` in `apps/mobile/.env`:
   - Android emulator: `http://10.0.2.2:3000` (`localhost` on the emulator is the emulator itself)
   - Physical device: `http://<your-lan-ip>:3000`
   - iOS simulator: `http://localhost:3000` is fine
3. Start Expo: `bun run --cwd apps/mobile start` (restart Metro after changing `.env`)
3. Sign up → land on onboarding → create organization → Home
4. Create / edit / delete a task (optional image)
5. Switch organization from Home
6. Open More → Profile / Organizations / theme toggle
7. Sign out → return to sign-in
8. Request password reset (email link should deep-link via `mobile://`)
