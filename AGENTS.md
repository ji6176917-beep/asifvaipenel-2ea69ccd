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
- Submission notifications use INSERT triggers and owner-scoped snapshots. NotificationPanel uses a right Sheet and MethodLogo; central event destinations open validated reference searches in histories using HistoryCard. Why: consistent compact presentation, deep links and exactly-once alerts without ledger changes.
- Website order/deposit submissions use authenticated customer-activity server functions around the existing ledger RPCs; the reseller API calls the same server-only admin alert helper after creation. Email recipient is fixed in registered templates and dedupe keys derive from event UUIDs; mail failures are audited without invalidating committed money operations. Why: cover every customer creation path without client-controlled recipients or duplicate ledger writes.
- Add Funds uses funds-reference scoped styling and dedicated banner assets, with official local-payment CDN pointers through its MethodLogo wrapper; preserve existing deposit submission logic. Why: isolate reference redesigns from other pages and money operations.
- Global navigation keys RouteTransition and AppShell styling to the resolved location, uses no global pending/Suspense fallback, intent preloading without delay, and parameter-keyed remounts. Why: keep committed content until an atomic replacement is ready, avoiding blank gaps and mismatched layouts while preserving auth guards and shared caches.
- New Order reference styling is scoped to /order with order-reference classes; preserve shared wallet, menus, authentication and service-order behavior. Why: page redesigns must not affect other screens.
- The reference homepage uses a dedicated HomeShowcase and homepage-scoped CSS; keep shared auth, wallet, menu data and non-home styling intact so visual redesigns cannot alter business behavior.
- Homepage statistics share LiveStats variants. Why: keep counts and timing consistent.
- Use the uploaded brand logo CDN pointer directly in the shared desktop/mobile header; derive the public favicon from the same source asset. Why: stale admin logo overrides must not restore the retired mark.
- Favicons use stable public files in the root head, never expiring URLs. Why: consistent browser/crawler branding.
- All money changes go through SECURITY DEFINER Postgres functions (place_order, create_deposit, cancel_my_order) that write wallet_ledger; clients have SELECT-only grants on business tables. Why: balances must never be trusted from the client.
- Sign-in by email/phone/User ID/username is resolved in a server function (src/lib/sign-in.functions.ts) so emails are never exposed to anonymous clients.
- Signed-in pages live under src/routes/_authenticated/ (gate redirects to /sign-in?redirect=). Why: one place for auth guarding.
- Business data uses soft delete (deleted_at); seeds use ON CONFLICT DO NOTHING. Why: redeploys must never lose data.
- Admin access is a password-only httpOnly cookie session (src/lib/admin.server.ts) separate from customer auth; every admin server function must call requireAdmin(). Why: admin passwords live only in server secrets/DB hash.
- Storage buckets are private (workspace blocks public); store object paths and render via signed URLs (useStorageUrl). Why: public buckets are not allowed.
- Admin user management lives in src/lib/admin-users.functions.ts (every fn calls requireAdmin + logAdmin with old/new values); admin balance edits only via the service-role-only admin_adjust_balance() function. Why: one audited path for admin writes.
- Support messages to users use the notifications table (kind popup|notification); "sign out all devices" is enforced client-side via profiles.sessions_revoked_at. Why: auth schema must not be modified.
- Site texts come from useT()/useI18n() (src/lib/i18n.tsx) with DEFAULT_LABELS as fallback and seed; menus come from useMenu() (src/lib/menu.tsx) backed by menu_items. Why: admins edit every label/menu without code changes.
- Welcome music cache is keyed by site_settings.music_version, bumped on every admin music change. Why: visitors refetch instantly.
- Admin-editable layout/theme/language options live in site_settings JSON columns (home_config, theme_config, languages_config) read through src/lib/site-config.ts with defaults. Why: one typed place for defaults, no schema change per option.
- Telegram alerts are sent from Postgres triggers via pg_net (tg_send); the bot token lives only in telegram_config (service-role only). Why: alerts fire for every order/deposit path, token never reaches the browser.
- Hard-coded customer UI text is wrapped in tr("English") (useTr) and translated via the central src/lib/translations.json dictionary (per language, English fallback); admin labels fall back to it too. Why: one dictionary, new languages need no code changes.
- Reseller docs use one scrolling page and placeholder keys; never expose credentials.
- Upstream keys stay admin-only; stable IDs/claims avoid duplicate spending. Preserve manual/custom prices. Import all types; block unsupported paid orders. Secret-gated hourly catalogs run only for active providers.
- Per-category panel choice lives in categories.source_provider/manual_control (admin-sources.functions.ts); every change snapshots service on/off state into service_snapshots for undo, and manual_control keeps orders out of provider dispatch. Why: one panel per category with safe rollback.
