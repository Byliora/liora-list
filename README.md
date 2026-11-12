# The Liora List

Private, mobile-first web app for Liora's shidduch work. Single user. Families only ever see "By Liora" (PDFs, share links, self-submission form).

- Stack: Next.js (App Router) + TypeScript + Tailwind, Supabase (London), Cloudflare R2 (EU) for files, Vercel Hobby.
- Build plan and decisions: see the shared "The Liora List – Build Plan" doc.
- Development uses fake data only (dev Supabase project). Never put real people's details in development or in this repo.
- Secrets live in environment variables only, never in code.

## Develop

```bash
npm install
npm run dev
```
