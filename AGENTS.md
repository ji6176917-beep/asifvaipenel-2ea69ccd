<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Password recovery gates password inputs on a successful recovery OTP/session and revalidates the same user before updating; email previews include a sample recovery token. Why: unverified codes and ordinary sign-in sessions must not unlock recovery forms.
- Submission alerts use INSERT triggers and owner-scoped snapshots; NotificationPanel uses a right Sheet and MethodLogo; event destinations open validated reference searches via HistoryCard. Website order/deposit submissions use authenticated customer-activity server functions around the ledger RPCs; the reseller API calls the same admin alert helper. Email recipient is fixed in registered templates, dedupe keys derive from event UUIDs, mail failures are audited without invalidating committed money operations. Why: deep links, exactly-once alerts, every creation path covered safely.
- Page redesigns stay scoped: Add Funds (funds-reference classes, payment CDN logos via MethodLogo), New Order (order-reference classes on /order), Homepage (HomeShowcase + homepage CSS + LiveStats variants). Preserve shared wallet, menus, auth and deposit/order logic. Why: redesigns must not affect other screens or money operations.
- Navigation uses resolved locations, no global pending fallback, immediate intent preload and parameter-keyed remounts. Why: atomic replacements preserve auth/caches without blank gaps.
- Use the uploaded brand logo CDN pointer directly in the shared header; favicons are stable public files in the root head. Why: stale overrides must not restore the retired mark.
- All money changes go through SECURITY DEFINER Postgres functions (place_order, create_deposit, cancel_my_order) that write wallet_ledger; clients have SELECT-only grants on business tables. Why: balances must never be trusted from the client.
- Sign-in by email/phone/User ID/username is resolved in src/lib/sign-in.functions.ts so emails are never exposed to anonymous clients.
- Signed-in pages live under src/routes/_authenticated/ (gate redirects to /sign-in?redirect=). Why: one place for auth guarding.
- Business data uses soft delete (deleted_at); seeds use ON CONFLICT DO NOTHING. Why: redeploys must never lose data.
- Admin access is a password-only httpOnly cookie session (src/lib/admin.server.ts) separate from customer auth; every admin server function must call requireAdmin(). Admin user management lives in src/lib/admin-users.functions.ts (requireAdmin + logAdmin with old/new values); balance edits only via service-role-only admin_adjust_balance(). Why: one audited path for admin writes.
- Storage buckets are private; store object paths and render via signed URLs (useStorageUrl). Why: public buckets are not allowed.
- Support messages use the notifications table (kind popup|notification); "sign out all devices" is enforced client-side via profiles.sessions_revoked_at. Why: auth schema must not be modified.
- Site texts come from useT()/useI18n() with DEFAULT_LABELS fallback; menus from useMenu() backed by menu_items; hard-coded customer text is wrapped in tr() and translated via src/lib/translations.json. Why: admins edit every label/menu/language without code changes.
- Admin-editable layout/theme/language options live in site_settings JSON columns (home_config, theme_config, languages_config) read through src/lib/site-config.ts; music cache uses site_settings.music_version. Why: one typed place for defaults, no schema change per option.
- Scheduled status-only polling feeds current order status to histories/notifications. Why: actual states without changing dispatch.
- Telegram alerts are sent from Postgres triggers via pg_net (tg_send); the bot token lives only in telegram_config (service-role only). Why: token never reaches the browser.
- Reseller docs use one scrolling page and placeholder keys; never expose credentials.
- Upstream keys stay admin-only; stable IDs/claims avoid duplicate spending. Preserve manual/custom prices. Secret-gated hourly catalogs run for every non-deleted provider with catalog_sync=true (active only controls customer/reseller visibility). Panel choice: provider tabs, exclusive platform/name category ON, per-service edits, undo snapshots. Why: safe provider selection.
- Own Services shares platforms, excludes categories with any provider-backed services (including Trash), and filters services by provider_id IS NULL. Why: source_provider is routing preference, not ownership.
- Self-controlled orders snapshot NULL provider references and dispatch_state=manual; admin updates only use the ledger status RPC and never dispatch upstream. API-connected orders dispatch directly; catalog_sync=false providers stay hand-wired and comments_template supplies quantity comment lines. Why: self control must not purchase provider services.
- Customer catalogs explicitly filter active/non-deleted/available entries and refresh on entry and every ten seconds while visible, with realtime invalidation as an accelerator. Why: disabled entries must disappear even when realtime events are unavailable.
- Home-screen install and offline support come from vite-plugin-pwa (worker emitted to the published static root) and are registered only from src/lib/pwa-registration.ts, which refuses dev, iframes and Lovable preview hosts; the manifest and icons stay hand-maintained public files and the Account page install card is src/components/InstallAppCard.tsx. Why: preview browsers must never hold a stale app-shell cache while the published site stays installable.
