This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Local Dev Access

This project supports development-only PIN login with per-profile continuity.

- `DEV_ACCESS_PIN_*` identifies which PIN was entered
- `DEV_USER_ID_*` maps that PIN to a fixed Supabase profile
- the app stores that `userId` in the `dev_access` cookie, so each PIN keeps loading the same profile

If you use `vercel env pull .env.local`, do not store local-only PINs in `.env.local`, because that file can be overwritten by Vercel. Put them in `.env.development.local` instead.

Example:

```env
DEV_ACCESS_PIN_LUIS=1234
DEV_USER_ID_LUIS=uuid-del-perfil-de-luis
DEV_ACCESS_PIN_PAREJA=5678
DEV_USER_ID_PAREJA=uuid-del-perfil-de-pareja
```

Recommended split:

- `.env.local`: variables pulled from Vercel
- `.env.development.local`: local-only dev PINs and profile mappings

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
