# Google-Only Authentication Design

## Goal

StudyRythms will expose one authentication action: **Continue with Google**. The application will not offer email/password sign-in, account registration, password recovery, or password-reset pages.

Any Google account may continue. On the first successful Google OAuth login, Supabase may create the corresponding user record automatically; this is part of OAuth sign-in and does not require a separate registration screen.

## User experience

The existing single-card authentication layout remains. Its content becomes:

- a single `Login` heading with no visible eyebrow or extra sign-in copy;
- one Google OAuth button;
- an inline loading state while the redirect begins; and
- an accessible error message if Supabase is missing or Google OAuth cannot start or finish.

The card keeps an accessible section label for screen readers while removing the visible brand/sign-in eyebrow.

## Login backdrop

The signed-out auth screen will show a read-only Home workspace preview behind the login card. The preview reuses the saved Home theme, custom background, clock, header, hero, a static disabled focus-timer panel, and workspace dock. A blur, dimming veil, and `pointer-events: none`/`inert` boundary make the dashboard visibly disabled while keeping the login card sharp and interactive.

The preview is deliberately not the authenticated `YouTubeRestTimer` instance. It must not start the real timer, camera, attention monitor, tracker requests, music engine, or any other authenticated side effect.

The page will not render:

- Sign in/Create account mode tabs;
- email, password, or password-confirmation fields;
- email/password submit buttons;
- the email divider;
- forgot-password links;
- registration links or copy; or
- password-reset forms.

## Authentication flow

1. The user selects **Continue with Google**.
2. The browser calls Supabase `signInWithOAuth` with provider `google` and the existing `/auth/callback` redirect.
3. The callback exchanges the authorization code for a session.
4. The callback verifies that the resulting Supabase user has a Google identity.
5. A Google user is redirected to the requested safe local path or `/`.
6. A missing, invalid, or non-Google session is signed out and redirected to `/auth` with a safe error code.

Google identity detection will accept Supabase metadata that identifies `google` as the primary provider or includes it in the provider list. This supports normal Google users and Google identities linked by Supabase while rejecting email/password-only sessions.

## Server enforcement

Google-only access is enforced beyond the visible login page:

- `getAuthenticatedUser` returns a user only when the session includes a Google identity.
- `getAuthenticatedContext` follows the same rule so future server operations cannot accidentally accept password-only sessions.
- Existing tracker API routes continue using the shared helper and therefore return their current unauthorized response for non-Google sessions.
- The home page renders the Google-only authentication screen when the current session is missing or non-Google.

No user or tracker data is deleted. Existing email/password-only accounts become unable to access the application. This change does not attempt to merge or migrate their data to a different Supabase user ID.

## Removed surface

The password-reset route at `app/auth/reset-password/page.tsx` will be removed. `AuthScreen` will remove its password modes and form state. Unused authentication CSS may be removed where it is exclusively tied to deleted controls, while the shared card, Google button, mobile layout, and error styles remain.

The Account settings page will report Google as the sign-in method and will no longer fall back to Email.

## Supabase and deployment configuration

The repository cannot disable a hosted Supabase provider by itself. The README will make the required production configuration explicit:

- enable the Google provider;
- disable the Email provider;
- configure Google OAuth credentials in Supabase;
- add local and deployed `/auth/callback` URLs to the Supabase redirect allowlist; and
- keep only the public Supabase URL and publishable key in client environment variables.

The documented local callback is `http://127.0.0.1:3000/auth/callback`. The deployed callback uses the configured StudyRythms domain, for example `https://study-rythms.vercel.app/auth/callback`.

## Testing

Automated tests will verify that:

- the auth surface contains `signInWithOAuth` with provider `google`;
- the OAuth callback exchanges the code and verifies the Google identity;
- server authentication helpers reject password-only users;
- no application auth surface contains `signInWithPassword`, `signUp`, `resetPasswordForEmail`, password inputs, registration copy, or a password-reset route;
- the Account settings surface reports Google rather than an Email fallback; and
- the README documents Google-only Supabase configuration.

The implementation must pass the TypeScript check, targeted linting, the full test suite through the repository-compatible TypeScript runner, and a production build.

## Acceptance criteria

- A signed-out visitor sees only **Continue with Google**.
- A first-time Google user can authenticate without a separate registration step.
- Email/password-only sessions cannot open the app or use tracker APIs.
- OAuth errors remain visible and accessible.
- No password-reset page remains.
- README setup instructions accurately describe Google-only authentication for local and deployed environments.
