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
- New Order reference styling is scoped to /order with order-reference classes; preserve shared wallet, menus, authentication and service-order behavior. Why: page redesigns must not affect other screens.
- The reference homepage uses a dedicated HomeShowcase and homepage-scoped CSS; keep shared auth, wallet, menu data and non-home styling intact so visual redesigns cannot alter business behavior.
- Homepage desktop and mobile statistics share LiveStats with layout variants. Why: both views must use the same count-up timing and data without changing their placement.
- Use the uploaded brand logo CDN pointer directly in the shared desktop/mobile header; derive the public favicon from the same source asset. Why: stale admin logo overrides must not restore the retired mark.
- Serve brand favicons through stable public files declared in the root head; do not replace them with expiring storage URLs after hydration. Why: crawlers and browsers need the same persistent brand icon.
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
- Reseller API documentation uses a single scrolling page with semantic parameter tables and placeholder keys in code samples. Why: resellers can compare actions without tabs and copying examples does not disclose credentials.
