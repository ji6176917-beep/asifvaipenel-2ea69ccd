# Roadmap
- [x] Add branded order and deposit emails to the requested admin address, covering website and reseller orders. Authenticated website order and deposit submissions/history verified; both real email sends recorded, logo/template previews pass, three recipient/idempotency tests pass. Temporary zero-charge order and unpaid deposit cleaned; publication still required.
- [x] Prevent blank navigation gaps: retain committed content until the destination is ready, then replace with fresh local state and no global loading screen. Two regression tests pass; first-visit browser navigation held for 1.5s stayed nonblank and replaced cleanly; search reset and no runtime errors verified.
- [x] Remove global navigation spinner/loading UI and artificial waiting; outgoing page unmounts immediately, intent preload has zero delay, incoming fade is 0.1s. Two regression tests pass; browser confirms no global spinner, no outgoing hero during held navigation, and search state resets.
- [x] Global route navigation: outgoing content unmounts during delayed navigation, page-local state resets, lightweight loading and reduced-motion-aware fade; browser verified Home/New Order/About/QnA/Policy/Sign In/Sign Up, back/forward and auth redirects. Two new regression tests pass; two existing routing smoke tests still time out.
- [ ] Signed-in navigation verification: blocked because preview is signed out and the requesting email has no matching customer account; requires user to sign in in preview.
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
- [ ] Reduce the mobile right-side drawer to slightly more than half-screen and compact existing cards; verify signed-in desktop/mobile rendering and search.
- [x] Restore right-side notification drawer, reduce card/text/logo sizes, align note/payment/transaction chips, and show local-payment plus crypto logos. Signed-in desktop/mobile checks confirm right-edge alignment, 199px desktop cards, visible payment logos, working search and filters; 12 tests pass.
- [x] Match the new notification reference with actual brand/platform identities, real details, search, day filters and scrolling; authenticated desktop/mobile browser checks pass with real notifications, search and filters; 12 focused tests pass.
- [x] Compact searchable notification cards with owner-scoped order/platform and funding details; search/read acknowledgement test and seven parser tests pass.
- [x] Exactly-once submission notifications across website and API creation paths; transaction-only trigger tests pass for order/deposit inserts and retries, all test rows rolled back.
- [x] Signed-in visual notification check: restored current user session; real notification cards, full list, search empty state, day filters and mobile layout verified without runtime errors.
