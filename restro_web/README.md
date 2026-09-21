# 🔥 EMBER & OAK — Full-Stack Restaurant Platform

A production-grade restaurant website with a complete reservation system, admin panel, and menu CMS.

## ✨ Features

### Frontend
- Award-winning scroll animations (GSAP + ScrollTrigger)
- Lenis smooth scrolling + custom magnetic cursor
- Preloader with progress, scroll progress bar
- Dynamic menu loaded from the API with category filtering
- Reservation form wired to the backend with slot capacity checks
- Newsletter signup + contact capture
- Fully responsive + reduced-motion support

### Backend
- Node.js + Express REST API
- MongoDB with Mongoose (Reservation, MenuItem, User, Contact)
- JWT authentication + bcrypt password hashing
- Automated email confirmations (Nodemailer — logs to console until SMTP is configured)
- Slot availability endpoint + capacity limits
- Helmet, CORS, compression, rate limiting
- Health check endpoint

### Admin Panel (`/admin`)
- JWT login screen
- Reservations dashboard (today / week / guests / pending stats, confirm, cancel, delete)
- Full menu CRUD with modal editor
- Contact & newsletter inbox (mark as read)
- Basic analytics (estimated revenue, avg party size, subscribers)

## 🚀 Quick Start

```bash
# 1. Install dependencies
cd server
npm install

# 2. Configure environment (already created with dev defaults)
#    Edit server/.env if needed

# 3. Seed the database (requires MongoDB running)
npm run seed

# 4. Start the server
npm start        # or: npm run dev (nodemon)
```

Visit:

- 🌐 Site: http://localhost:5000
- 🛠️ Admin: http://localhost:5000/admin
- 🔑 Default admin (after seeding): admin@emberoak.com / admin123

> **Note:** Without MongoDB running, the site still works and the menu falls back to the built-in seed list, but the admin panel and data persistence require MongoDB. Reservations submitted without a DB will return an error.

## 📁 Project Structure

```
ember-oak/
├── public/                 # Frontend (served at /)
│   ├── index.html
│   ├── css/style.css
│   ├── js/main.js          # Forms, menu tabs, newsletter
│   ├── js/animations.js    # GSAP reveals, counters, magnetic buttons
│   ├── js/cursor.js        # Custom cursor
│   ├── favicon.svg, robots.txt, sitemap.xml, site.webmanifest
├── server/                 # Express API
│   ├── index.js
│   ├── config/db.js
│   ├── models/             # Reservation, MenuItem, User, Contact
│   ├── routes/             # reservations, menu, auth, contact, analytics
│   ├── middleware/         # auth (JWT), rateLimit
│   ├── utils/              # sendEmail, emailTemplates, seed, test
│   └── .env / .env.example
├── admin/                  # Admin panel (served at /admin)
│   ├── index.html
│   ├── admin.js
│   └── admin.css
├── vercel.json
├── Procfile
└── README.md
```

## 🔌 API Reference

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | /api/reservations | Public | Create reservation (validates + capacity check, emails confirmation) |
| GET | /api/reservations | Private | List reservations (filter: status, date, page, limit) |
| PATCH | /api/reservations/:id | Private | Update status / notes |
| DELETE | /api/reservations/:id | Private | Delete reservation |
| GET | /api/reservations/availability | Public | Slot availability (?date=&time=) |
| GET | /api/menu | Public | Menu items (?category=, ?includeUnavailable=1 for admin) |
| POST | /api/menu | Private | Create item |
| PUT | /api/menu/:id | Private | Update item |
| DELETE | /api/menu/:id | Private | Delete item |
| POST | /api/auth/login | Public | Login → JWT |
| GET | /api/auth/me | Private | Current user |
| POST | /api/auth/register | Private (admin role) | Create staff user |
| POST | /api/contact | Public | Newsletter / inquiry |
| GET | /api/contact | Private | Contact inbox |
| PATCH | /api/contact/:id/read | Private | Mark as read |
| POST | /api/analytics | Public | Client event tracking |
| GET | /api/analytics/stats | Public | Basic stats |
| GET | /api/health | Public | Health check |

## 🔐 Environment Variables

See `server/.env.example`. Key values:

- `MONGO_URI` — MongoDB connection string (local or MongoDB Atlas)
- `JWT_SECRET` — long random string (change in production)
- `ADMIN_EMAIL` — email used by the seeder for the default admin
- `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USER` / `EMAIL_PASS` — SMTP for real emails; leave `EMAIL_USER` empty to log emails to the console instead

## 🌐 Production Deployment

1. **Database** — MongoDB Atlas free tier (whitelist `0.0.0.0/0` or your host IPs)
2. **Backend + site** — Railway / Render / Heroku (`Procfile` included): set env vars, `npm start`
3. **Frontend alternative** — Vercel for `public/` (`vercel.json` included) pointing API calls at your API host
4. Set `JWT_SECRET` to a fresh random string and change the seeded admin password immediately

## 🧪 Smoke Test

```bash
npm run test
```

## 📌 Notes / Known Gaps

- Placeholder image blocks are used instead of real photography (drop images into `public/assets/` and replace `.image-placeholder` blocks)
- Stripe is intentionally not wired up (reservation deposits would be the next step)
- Analytics are in-memory only (reset on restart) — plug in a real analytics service for production
- Update `sitemap.xml`, `robots.txt` and the Schema.org block in `index.html` with your production domain
