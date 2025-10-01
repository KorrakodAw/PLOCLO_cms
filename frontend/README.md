# PLOCLO CMS Frontend

> This is the frontend for the PLOCLO CMS, built with Next.js and TypeScript.

## Features

- Program Learning Outcomes (PLO) management
- Program management
- Account and authentication management
- Role-based access (admin, instructor, etc.)
- Internationalization (i18n) with English and Thai
- Responsive UI with Tailwind CSS

## Getting Started

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Start the development server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

### 3. Usage

- Log in with your account (provided by admin or registered via backend)
- Use the navigation bar to access PLO, program, and account management
- Only users with the correct role can access certain pages
- All user-facing text supports English and Thai (switch via the language menu)

### 4. Project Structure

- `app/` — Main Next.js pages and routing
- `components/` — Shared React components
- `locales/` — i18n translation files
- `utils/` — API clients and helpers

### 5. API Connection

The frontend expects the backend API to be running (see backend README). API endpoints are configured to `/api/*` and require authentication for most actions.

## Deployment

Deploy easily to [Vercel](https://vercel.com/) or your own server. See Next.js deployment docs for details.

## Support

For help, contact the project maintainer or open an issue in the repository.
