# Norraphat’s Memory Index

A one-page personal archive for Norraphat Tupiya’s favorite songs, photographs,
and the moments attached to them. Visitors can browse the curated memories. New
song and picture memories can be added from the page and are kept privately in
the current browser with `localStorage`; no account or database is required.

Built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui.

## Run locally

```bash
npm install
npm run dev -- --port 43127
```

Open [http://localhost:43127](http://localhost:43127).

## Checks

```bash
npm test
npm run lint
npm run build
```

## How local memories work

- Songs store their title, artist, note, optional listening link, and date.
- Pictures are resized and compressed in the browser before storage.
- Saved additions belong to that browser profile and do not sync between devices.
- Clearing this site’s browser data also clears locally added memories.
