# Study Tracker

A fully featured and secure study tracking application.

## Features

| Layer | Details |
|-------|----------|
| **Authentication** | JWT (15 min access + 7 day refresh), token rotation, session management, bcrypt password hashing |
| **Logging** | Daily study hours, subject, notes, mood (1–5) |
| **Dashboard** | Weekly bar chart, goal donut ring, streak counter, subject distribution |
| **History** | Monthly heatmap + list view |
| **Goals** | Color-tagged goal cards, progress bars |
| **Settings** | Profile management, password change, active sessions, logout from all devices |
| **Database** | SQLite (WAL, FK enabled) — zero configuration |
| **Responsive** | Mobile-friendly sidebar + hamburger menu |

## Installation & Running

```powershell
npm install
npm start
```

Then open in your browser:  
`http://localhost:3000`

### Development Mode (auto-reload)

```powershell
npm run dev
```

## Project Structure

```
├── server.js          ← Express entry point
├── server/
│   ├── db.js          ← SQLite schema & connection
│   ├── auth.js        ← JWT utilities
│   ├── middleware.js  ← authenticate / optionalAuth
│   ├── authRoutes.js  ← /auth/...
│   └── apiRoutes.js   ← /api/...
├── public/
│   ├── index.html
│   ├── css/app.css
│   └── js/
│       ├── api.js     ← Fetch + token refresh logic
│       ├── charts.js  ← Canvas rendering
│       └── app.js     ← Application logic
└── .env               ← JWT_SECRET & PORT
```
