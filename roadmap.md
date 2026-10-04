# Roadmap
## Phase 1 (done)
- [x] Design system, header, menu, bottom bar, footer, sign up/in, ordering, Add Funds, histories, profile

## Fix & Update request (Oct 2026)
- [x] Support Admin: 1 tap Telegram / 6 taps admin login (shared provider)
- [x] Admin login server-side (master + changeable password, lockout, admin_log, httpOnly session)
- [x] ADMIN_MASTER_PASSWORD and ADMIN_PASSWORD secrets saved
- [x] WhatsApp/Telegram links use separate settings, digits-only wa.me, hidden when empty
- [x] Payment logos: uploaded-image support + coloured badge fallback
- [ ] Waiting on user: official bKash/Nagad/Rocket/Binance/USDT logo files (upload to logos bucket)
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
