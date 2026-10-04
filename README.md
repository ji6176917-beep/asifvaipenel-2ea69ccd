# Exactly The Screenshot

Implement exactly the screenshot and nothing else

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c171b247-43c9-4bd4-b511-4692ff71cc3d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Backups & restore

- **Automatic backups:** the database is backed up daily by Lovable Cloud. For point-in-time recovery, upgrade the backend plan in Lovable Cloud settings.
- **Manual backup:** Admin → Backup & Health → "Download full backup" gives a ZIP with a CSV and JSON file per table. Passwords, admin sessions and the Telegram bot token are never included.
- **Restore:** ask in the Lovable chat to restore from a daily backup, or import the needed CSV files table by table (parents first: platforms → categories → services → payment_methods → profiles → orders/deposits → wallet_ledger). Always run "Reconcile balances" afterwards — it must show no mismatches.
- **Deleted items:** most items are soft-deleted and can be restored from Admin → Trash.
