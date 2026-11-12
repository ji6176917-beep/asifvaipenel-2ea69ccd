# Roadmap
- [x] Refine desktop reference dashboard for guests/customers: divided statistics, shared real order form/details, profile/music sidebar, no duplicate Popular Services, Q&A below; desktop guest submit redirect, real customer category/service/charge/details and collapse verified; mobile homepage preserved. 18 focused tests pass; no paid order submitted; publication not performed.
- [x] Replace the desktop right menu with a signed-in-only 256px left sidebar and 64px icon mode; guest homepage remains full-width and mobile keeps its Sheet/bottom bar. Seven tests pass; real customer Balance → Add Funds, active links, collapse/reopen, Settings/logout and 1146px/390px layouts verified without runtime errors or money writes. Publication not performed.
- [x] Desktop-only persistent right menu, close/reopen controls, guest sign-in/sign-up, existing settings actions grouped; seven tests pass, guest Profile redirect and signed-in Balance/Settings/logout verified, mobile Sheet and 1146px no-overflow verified.
- [x] Implement email → verified code → new password recovery; four regression tests pass, public browser gating works without runtime errors, build OK; recovery preview includes sample code.
- [ ] Activate branded recovery email delivery and verify a real emailed code/password reset end-to-end; no workspace email domain configured despite legacy setup-complete status. Requires sender-domain setup by owner; no real user password changed.
- [x] Verify live self-control trigger snapshots no provider; remove legacy admin Accept dispatch path. Six regression tests pass; zero provider-linked legacy manual orders currently need repair. No paid order or authenticated admin transition executed.
- [x] Customer catalog refreshes on entry/every 10 seconds and clears hidden selections; OFF writes report failures. Five visibility tests pass; browser catalog read contains 1,022 services, zero OFF/deleted/unavailable rows. Reseller active filters inspected, authenticated reseller request not executed.
- [ ] Verify protected service dropdown/admin OFF action end-to-end; requesting owner has no matching customer account for automatic test sign-in and no active admin session. Requires owner sign-in; no paid order submitted.
- [x] Isolate Own Services categories/services under shared platforms without changing API panels or controls; 19 focused tests pass and preview build OK. Read-only live counts confirm TikTok has 4 own categories and 27 excluded provider categories.
- [ ] Verify updated own hierarchy and add/toggle flow through authenticated admin UI; configured master-password login did not establish a session. Requires the owner's working admin session; no catalog or money data changed during verification.
- [x] Order notifications/history show current actual status; protected 2-minute status-only sync runs. 33 focused tests pass; live sync responded successfully.
- [x] Homepage Popular Services now uses the same horizontal cards as New Order (logo left, name right, 179×62 at 6 columns desktop, 3 columns mobile); card click navigation and no mobile overflow browser-verified.
- [ ] Connect both providers: Royal SMM World and World of SMM addresses saved OFF; usable real keys could not be read from the recordings. Requires entering real keys in Admin → Services → API; no live upstream request/order made.
- [x] Import all provider types, upstream off flags/removals and price changes; preserve custom prices. Paginate consumer/reseller service lists. Protected hourly catalog callbacks scheduled only on provider activation (needs publication); inactive providers have no jobs. 27 focused tests pass, anonymous callback rejected, authenticated nonexistent-provider callback skipped, build OK. Special-input types are listed but their orders safely blocked pending dedicated input support. Transactional DB integration test retained but could not execute through sandbox psql.
- [x] Add multi-provider management with admin-only credentials, paginated service editing, preserved custom names/prices, percentage markup, independent source/provider switches, gated reseller/catalog reads, mapped dispatch claims and ledger-based status reconciliation. Customer fonts/styles unchanged. 23 focused tests pass and preview build is clean.
- [ ] Connect Royal SMM World and verify live import; requires a real provider key (uploaded video shows documentation only).
- [ ] Verify provider admin actions and real upstream order end-to-end; admin login did not establish a session, and no valid upstream key is available. No paid test order submitted. Hourly catalog lifecycle is configured; provider order statuses still use the admin button.
- [x] Show full lower Add Funds image on desktop only; verified full 1920:640 image at 992×331 and unchanged 2.9 mobile ratio. Other styling untouched.
- [x] Final read-only customer/login review: 11 signed-in/public pages and 4 guest auth pages open; invalid customer login rejected, session survives reload, no overflow/runtime errors, all 22 tests pass. Signup/email delivery and live money/settings writes not executed.
- [ ] Final authenticated admin retest blocked: current admin password attempt did not establish a session. All 19 sections were verified in the previous audit; this pass only inspected source and signed-out access guard. Requires a working admin session to retest protected actions; no further password attempts made.
- [x] Match October 13 Add Funds reference with green wallet banner, three payment cards, official local-payment logos and social banner. Signed-in Binance/USDT/P2P selection and amount/transaction entry verified; images load, no overflow at 320/390px, no runtime errors, 17 related tests pass. No deposit submitted; payment rules unchanged.
- [x] Open matching reference-filtered history from order/funding notifications; balance/security notices open Balance/Account, generic notices expand details. Compact HistoryCard preserves statuses, IDs, payment logos, notes and order actions. Real funding notification → matching history verified desktop/mobile without overflow.
- [x] Review public and signed-in pages and admin sections: 15 customer/public routes and 19 authenticated admin sections opened without runtime errors; all 22 tests pass. Order history has no real orders for the current customer; money operations, outbound delivery and saving every live admin setting were intentionally not executed. Repeat admin login later hit an access wait; initial authenticated section review succeeded.
- [x] Add branded order and deposit emails to the requested admin address, covering website and reseller orders. Authenticated website order and deposit submissions/history verified; both real email sends recorded, logo/template previews pass, three recipient/idempotency tests pass. Temporary zero-charge order and unpaid deposit cleaned; publication still required.
- [x] Prevent blank navigation gaps: retain committed content until the destination is ready, then replace with fresh local state and no global loading screen. Two regression tests pass; first-visit browser navigation held for 1.5s stayed nonblank and replaced cleanly; search reset and no runtime errors verified.
- [x] Remove global navigation spinner/loading UI and artificial waiting; outgoing page unmounts immediately, intent preload has zero delay, incoming fade is 0.1s. Two regression tests pass; browser confirms no global spinner, no outgoing hero during held navigation, and search state resets.
- [x] Global route navigation: outgoing content unmounts during delayed navigation, page-local state resets, lightweight loading and reduced-motion-aware fade; browser verified Home/New Order/About/QnA/Policy/Sign In/Sign Up, back/forward and auth redirects. Two new regression tests pass; two existing routing smoke tests still time out.
- [x] Signed-in navigation verified with the current injected customer session across histories, Balance, Account, Add Funds and API docs (Oct 13).
- [x] Match New Order desktop/mobile reference, add platform search and preserve other pages; browser checked filtering, empty results and sign-in redirect. Existing routing smoke tests still time out (same two failures).
- [x] Fix mobile illustration cropping, refine service-title typography, and share mobile count-up animation with the desktop statistics strip; browser-verified both sizes and matching final counts.
- [x] Match the supplied homepage desktop/mobile design; browser-verified five service tiles, CTA navigation and no horizontal overflow. Existing routing smoke tests still time out (2 failures); browser flow and preview build pass.
- [x] Remove the homepage welcome subtitle and verify Google site-name schema and stable brand favicon in the rendered homepage and server HTML.
- [x] Pin the shared desktop/mobile header to a fresh uploaded A logo asset, bypassing stale SM overrides; check footer for retired marks.
- [x] Apply the uploaded green A logo site-wide and derive its browser favicon; verify desktop and mobile header alignment.
- [x] Replace the old site name throughout website text and code; preserve all logo and graphical assets.
- [x] Create a green SM site logo and matching favicon; set the home tab title to Apex SMM World.
## Phase 1 (done)
- [x] Design system, header, menu, bottom bar, footer, sign up/in, ordering, Add Funds, histories, profile

## Fix & Update request (Oct 2026)
- [x] Support Admin: 1 tap Telegram / 6 taps admin login (shared provider)
- [x] Admin login server-side (master + changeable password, lockout, admin_log, httpOnly session)
- [x] ADMIN_MASTER_PASSWORD and ADMIN_PASSWORD secrets saved
- [x] WhatsApp/Telegram links use separate settings, digits-only wa.me, hidden when empty
- [x] Payment logos: uploaded-image support + coloured badge fallback
- [x] Add Funds: replace bKash, Nagad and Rocket badges with original brand images sourced online; preserve page layout and other payment methods.
- [x] Profile photo upload/remove; shown in menu header
- [x] Premium 3-dot button, bottom sheet on mobile, closes on route change
- [x] Starter catalog seeded as inactive drafts
- [x] Admin sidebar (20 sections) + Dashboard + Users (search, filters, list, detail, password, balance, popup/notification, edit, ban, verify, API key, CSV) + sign-in tracking + user bell/popups
- [ ] Waiting on user: rest of the admin task file (it was cut off after the Users section)
- [x] Admin: Music + API (Reseller) sections; public 3-dot menu verified
- [x] Admin: Orders (manual delivery)
- [ ] Admin: Add Funds, Services, Content, Menu, Home, Support, QnA, Pages, Languages, Notifications, Theme, Backup, Activity Log, Trash
- [ ] Database Backup ZIP + System Health / reconcile; README restore steps
- [ ] Notifications, popups, maintenance mode, reseller API, languages, music, Telegram alerts, captcha

## Spec 9–11 (Oct 4)
- [x] 9 Music: URL or upload, volume/loop/autoplay/show-for, master switch, versioned refresh, admin preview
- [x] 10 Content & Labels: registry, admin editor, branding, banner, popup; header/menu/footer/home/order form wired
- [ ] 10b Wire remaining pages (sign up/in, balance, add funds, histories, profile, API, QnA, notifications, emails) to labels
- [x] 11 Menu & Navigation editor (3-dot, bottom bar, footer, home shortcuts)

## Spec 12–18 (Oct 4)
- [x] 12 Home page editor  - [x] 13 Support & Contacts  - [x] 14 QnA, Policies & Pages
- [x] 15 Languages  - [x] 16 Notifications, popups, Telegram alerts  - [x] 17 Theme  - [x] 18 General settings
- [x] 19 Backup & Health, Activity Log, Trash
- [ ] 20 Full verification pass (not run yet)
- [x] Fix A: Admin Services 3-level manager (platforms/categories/services)
- [ ] Fix B: Full-site translation (dictionary for every page, save language to account)
- [x] Home layout, footer toggles, home QnA, Site Identity, full-site translations (Oct 2026)
- [x] New Order service dropdown shows numeric service ID before the name (Oct 12, live on apexsmmworld.com)
- [x] Reseller API documentation: replace tabs with stacked action tables and visible code examples.
- [x] WhatsApp: remove header icon, keep single fixed floating button bottom-right on every page with pulse animation (Oct 12).
- [x] Mobile header: logo + brand name inline and vertically centered, tagline hidden on mobile; feature badge removed on all devices (Oct 12).
- [x] Homepage text raised to normal reading size on desktop and mobile, service names set in Manrope, three-dot trigger turned into a highlighted mint "Menu" pill (word hidden on mobile so the brand name never truncates); browser-verified both sizes (Oct 12).
- [x] Popular Services cards redesigned as brand-tinted cards showing only the platform logo and name; the "Followers • Likes • Views" / "Subscribers • Likes • Views" / "Members • Views • Shares" captions removed on all devices; hover adds lift, brand glow, sheen and a corner arrow. Desktop, mobile and dark mode browser-verified (Oct 12).

## Customer notifications (Oct 13)
- [x] Reduce mobile right-side drawer to 64% screen width; preserve colors and compact cards, text and logos. Signed-in checks at 320/390/1280px confirm right alignment, no card overflow, 144–151px cards at 390px, payment logos, search and filters; 12 tests pass and preview build is clean.
- [x] Restore right-side notification drawer, reduce card/text/logo sizes, align note/payment/transaction chips, and show local-payment plus crypto logos. Signed-in desktop/mobile checks confirm right-edge alignment, 199px desktop cards, visible payment logos, working search and filters; 12 tests pass.
- [x] Match the new notification reference with actual brand/platform identities, real details, search, day filters and scrolling; authenticated desktop/mobile browser checks pass with real notifications, search and filters; 12 focused tests pass.
- [x] Compact searchable notification cards with owner-scoped order/platform and funding details; search/read acknowledgement test and seven parser tests pass.
- [x] Exactly-once submission notifications across website and API creation paths; transaction-only trigger tests pass for order/deposit inserts and retries, all test rows rolled back.
- [x] Signed-in visual notification check: restored current user session; real notification cards, full list, search empty state, day filters and mobile layout verified without runtime errors.
