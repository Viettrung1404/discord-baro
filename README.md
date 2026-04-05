# Discord Clone

A Discord clone built with Next.js 15, TypeScript, Prisma, and Clerk authentication.

## Features

- Real-time messaging
- Server creation and management
- User authentication with Clerk
- Database with Prisma ORM
- Modern UI with Tailwind CSS
- File uploads
- Voice and video calls

## Tech Stack

- **Framework:** Next.js 15
- **Language:** TypeScript
- **Database:** MySQL with Prisma ORM
- **Authentication:** Clerk
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui

## Getting Started

### Prerequisites

- Node.js 18+
- Docker và Docker Compose
- Clerk account for authentication

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/discord-baro.git
cd discord-baro
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual values.

Optional: tune database pool for better API throughput on higher traffic.

```env
PG_POOL_MAX=5
PG_POOL_MIN=0
PG_POOL_IDLE_TIMEOUT_MS=10000
PG_POOL_CONNECT_TIMEOUT_MS=10000
PG_POOL_MAX_USES=5000
```

4. Start Docker services (PostgreSQL + MinIO):

```bash
npm run docker:up
```

5. Set up the database:

```bash
npm run db:migrate
```

6. Run the development server:

```bash
npm run dev
```

Or run everything at once:

```bash
npm run dev:full
```

## Docker Services

This project uses Docker Compose to run:

- **PostgreSQL**: Database on port 5432
- **MinIO**: Object storage on port 9000 (API) and 9001 (Console)

### Docker Commands

```bash
# Start all services
npm run docker:up

# Stop all services
npm run docker:down

# View logs
npm run docker:logs

# Restart services
npm run docker:restart
```

### MinIO Console

Access MinIO console at: http://localhost:9001

- Username: `minioadmin`
- Password: `minioadmin123`

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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### Realtime note for Vercel

This project uses Socket.IO with in-memory rooms/presence. Vercel serverless functions are not a persistent Socket.IO runtime, so your UI may stay in fallback polling mode unless you use an external realtime server.

Set these environment variables:

```env
NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app
NEXT_PUBLIC_SOCKET_URL=https://your-realtime-server.example.com
```

`NEXT_PUBLIC_SOCKET_URL` must point to a persistent Node server that hosts the Socket.IO endpoint at `/api/socket/io`.
