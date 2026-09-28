# Tower of Grace Farms & Agro-Based Industries Ltd

Corporate website, poultry shop (broilers, noilers, eggs, turkeys) and admin control panel.

| Layer    | Stack                                                                       |
| -------- | --------------------------------------------------------------------------- |
| Frontend | React 18 (JavaScript, `.js` files), React Router, Axios, plain CSS, Vite    |
| Backend  | Node.js, Express, MongoDB + Mongoose, JWT + bcryptjs                        |
| Media    | Cloudinary (URL + public ID stored in MongoDB)                              |
| Payments | Paystack and Flutterwave (server-verified), bank transfer, pay on delivery  |

No TypeScript, Tailwind, Bootstrap or UI kits are used. Styling is plain CSS with shared tokens in
`client/src/styles/variables.css` and one CSS file per component or page.

---

## 1. Quick start (local)

Prerequisites: Node.js 18 or newer, and a MongoDB database (local `mongod` or a MongoDB Atlas connection string).

```bash
# 1. Install dependencies
npm run install:all

# 2. Configure the API
cp server/.env.example server/.env
#    then edit server/.env. At minimum set MONGO_URI, JWT_SECRET, ADMIN_EMAIL and ADMIN_PASSWORD

# 3. Run the API (http://localhost:5000)
npm run dev:server

# 4. In a second terminal, run the website (http://localhost:5173)
npm run dev:client
```

On first start the API automatically creates:

- the four product categories: **Broilers, Noilers, Eggs, Turkeys**
- the first admin account, using `ADMIN_EMAIL` and `ADMIN_PASSWORD`

Sign in to the admin panel at **http://localhost:5173/admin/login**.

> The shop is empty until you add products in **Admin → Products**. No prices, weights or stock levels
> are hard-coded, because those come from the business.

### Environment variables (`server/.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | no | API port (default 5000) |
| `MONGO_URI` | **yes** | MongoDB connection string |
| `JWT_SECRET` | **yes** | Long random string (32+ characters in production) |
| `JWT_EXPIRES_IN` | no | Session length, e.g. `7d` |
| `FRONTEND_URL` | yes | Public site URL, used for payment redirect URLs |
| `FRONTEND_URLS` | no | Extra comma-separated origins allowed by CORS |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | first run | First admin account |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | for uploads | Image uploads |
| `PAYSTACK_SECRET_KEY` | optional | Enables Paystack at checkout |
| `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_HASH` | optional | Enables Flutterwave at checkout |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM`, `ADMIN_NOTIFY_EMAIL` | optional | Order and enquiry emails |

Client: `client/.env.example` → `VITE_API_URL` (leave empty in development; Vite proxies `/api`).

---

## 2. Design reference

The UI follows the Google Stitch project **https://stitch.withgoogle.com/projects/4081069928484532661**,
which has six screens. Each maps to code as follows:

| Stitch screen | Implemented in |
| --- | --- |
| Homepage — Tower of Grace | `pages/HomePage.js` (dark-green hero with amber second headline line, pillars, poultry product cards, infrastructure block, retail/bulk split, footer CTA) |
| Shop — Commercial Poultry Marketplace | `pages/ShopPage.js` (category tabs, sidebar filters, toolbar and sort, 3-column grid, pagination, trust strip, dark bulk CTA band) |
| Shopping Cart & Checkout | `pages/CartPage.js`, `pages/CheckoutPage.js`, `components/OrderSummary.js` (numbered checkout steps, option cards, sticky summary) |
| Product Details — Broiler Chicken | `pages/ProductDetailsPage.js` (gallery with thumbnails, amber price panel, weight chips, quantity, Add to Cart / Buy Now, spec tabs, options table + chart, related products) |
| Admin Dashboard — Product Management | `layouts/AdminLayout.js`, `pages/admin/AdminDashboardPage.js`, `pages/admin/AdminProductsPage.js`, `pages/admin/AdminProductFormPage.js` |
| Admin Inventory & Weight Batches | `pages/admin/AdminInventoryPage.js` ("Stock & Weight Ledger": stat cards, filterable ledger, stock-adjust modal) |

Reusable pieces taken from the reference: `ProductCard`, `AdminStatsCard`, `DataTable`, `StatusBadge`,
`Modal`, `EmptyState`, `PageHero`, `SectionHeading`, `FeatureGrid`, `BarChart`.

**Colours.** `variables.css` uses colours sampled from the official logo: tower/wordmark green `#003c24`,
highlight green `#00542b`, leaf green `#186c24`, gold `#e4a80c` / `#f9bf3a`, and comb red `#e41316`
(used sparingly). The layout language follows the Stitch screens.

**Logo.** The official logo is `client/public/brand/logo.jpg`, with favicons downscaled from it
(`logo-32/180/192/512.png`). It is always shown whole, at its original proportions, and never recoloured.
On dark backgrounds it sits on its own white plate. An admin can replace it in **Admin → Settings**.

**Imagery.** No stock photos are used. Every image slot shows a branded placeholder until an admin
uploads real Tower of Grace photos (products, gallery, hero, farm and production sections).

---

## 3. What the admin can manage (no code changes needed)

- **Products**: create, edit, delete, enable/disable, featured, sold out, category, SKU, descriptions,
  multiple Cloudinary images (reorder, alt text), price and sale price, stock, weight and min/max weight,
  storage, production and recommended-use information, SEO metadata.
- **Weight and pack options**: any number of options per product, each with its own label, weight range
  or units per pack, price, sale price, stock and SKU. Broilers, noilers and turkeys use weight bands;
  eggs use pack sizes (6, 12, 30, tray, bulk, and so on). The admin defines every value.
- **Inventory**: per-option on-hand, reserved and available stock; set or adjust stock. Values are
  validated server-side, so stock can never go negative or drop below the reserved amount.
- **Orders**: search and filter, status workflow (PENDING → CONFIRMED → PROCESSING → READY →
  OUT_FOR_DELIVERY → COMPLETED / CANCELLED), payment status, re-checking an online payment with the
  gateway, customer and delivery details, internal notes.
- **Customers**: list with order count and total spent, order history, deactivate or reactivate.
- **Content (CMS)**: homepage hero and sections, About (story, vision, mission, values), Our Farm,
  Quality & Hygiene, How We Produce, Contact details (phone, email, WhatsApp, map, hours), Bulk Orders
  page, footer and social links, announcement bar.
- **Gallery**: upload, replace, caption, categorise (Farm, Broilers, Noilers, Eggs, Turkeys, Facilities,
  Production, Team, Packaging, Deliveries), feature on the homepage, delete.
- **Certifications**: name, issuer, number, dates, image, status, public toggle. Nothing appears on the
  site until a real certificate is added.
- **Bulk requests and messages**: status tracking and notes.
- **Settings**: logo, delivery methods and fees, bank-transfer details, and enabling or disabling
  bank transfer and pay on delivery.

---

## 4. Orders, stock and payments

1. At checkout the **server** re-prices every item from the database. Prices sent by the browser are ignored.
2. Stock is **reserved** atomically when an order is placed, so overselling is rejected.
3. Stock is **committed** (deducted) when payment is confirmed or the order is completed.
4. **Cancelling** an order returns reserved stock, or restocks it if it was already deducted.
5. Order numbers are sequential per year: `TGF-2026-000001`.

Payments:

- **Paystack and Flutterwave** only appear at checkout when their secret keys are set. The customer is
  redirected to the gateway. The order is marked PAID only after the API verifies the transaction with
  the gateway and confirms the amount and currency. Nothing is simulated.
- **Webhooks** (set these in each gateway dashboard):
  - Paystack: `POST {API_URL}/api/payments/webhook/paystack` (HMAC-SHA512 signature verified)
  - Flutterwave: `POST {API_URL}/api/payments/webhook/flutterwave` (`verif-hash` must equal `FLUTTERWAVE_WEBHOOK_HASH`)
- **Bank transfer and pay on delivery** stay PENDING until an admin confirms payment on the order page.
- **Transfer receipts**:
  1. After a bank-transfer order, the customer uploads their receipt (JPG, PNG, WEBP or PDF, up to 5 MB) on
     the order confirmation, track-order or My Orders page. Receipts are stored in Cloudinary under `receipts/`.
  2. The order is flagged **Receipt to review** in Admin → Orders, and the dashboard shows it too.
  3. On the order page, the admin either clicks **Confirm money received** or rejects the receipt with a reason.
  4. Confirming marks the order PAID and CONFIRMED, deducts the stock and emails the customer. An open
     order page updates by itself (it re-checks every 20 seconds) and shows a "Payment confirmed" banner.
     A rejection emails the customer the reason and asks them to upload again.
  5. Emails need `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER` and `EMAIL_PASSWORD` in `server/.env`. Set
     `ADMIN_NOTIFY_EMAIL` to be alerted when a receipt is uploaded. Without these, the page confirmation still
     works and emails are skipped.

---

## 5. API overview

Base URL: `/api`

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET/PATCH /auth/me`, `PATCH /auth/password` |
| Account | `GET/POST /users/me/addresses`, `PUT/DELETE /users/me/addresses/:id` |
| Catalogue | `GET /categories`, `GET /products`, `GET /products/filters`, `GET /products/:slug` |
| Orders | `POST /orders`, `GET /orders/track`, `GET /orders/mine`, `GET /orders/mine/:id`, `POST /orders/mine/:id/cancel` |
| Payments | `GET /payments/config`, `POST /payments/initialize`, `GET /payments/verify`, webhooks |
| Public content | `GET /content`, `GET /content/:key`, `GET /gallery`, `GET /certifications`, `POST /contact`, `POST /bulk-orders` |
| Admin | `/admin/dashboard`, `/admin/products`, `/admin/inventory`, `/admin/orders`, `/admin/customers`, `/admin/content/:key`, `/admin/gallery`, `/admin/certifications`, `/admin/messages`, `/admin/bulk-orders`, `/admin/uploads`; category CRUD at `/categories` |

Security: Helmet, a CORS allow-list, rate limits (global, auth and forms), `express-mongo-sanitize`,
express-validator input checks, bcrypt (12 rounds), JWT with role-based `admin` guards, central error
handling, and secrets only in `.env`.

---

## 6. Testing

```bash
npm run smoke
```

This starts a throwaway in-memory MongoDB and runs the main flows end to end: auth and roles, product
and option CRUD, filters, guest checkout, reservation, overselling protection, payment confirmation,
cancellation, inventory limits, CMS, contact and bulk requests, and dashboard figures.

---

## 7. Production build and deployment

```bash
npm run build          # outputs client/dist
npm start              # starts the API
```

- Host `client/dist` on any static host (Netlify, Vercel, S3/CloudFront, Nginx). Configure it to
  serve `index.html` for every route, and set `VITE_API_URL` to your API URL before building.
- Run the API on a Node host (Render, Railway, a VPS with PM2). Set `NODE_ENV=production`, a strong
  `JWT_SECRET`, `FRONTEND_URL`, and your Cloudinary and payment keys.

---

## 8. Project structure

```
server/
  config/        env, MongoDB, Cloudinary
  controllers/   request handlers per resource
  middleware/    auth, validation, uploads, rate limits, errors
  models/        User, Category, Product, Order, Counter, Gallery, Content, ContactMessage, BulkOrder, Certification
  routes/        REST routes
  services/      inventory, payments, orders, uploads, email, settings, product presenter
  utils/         helpers, bootstrap/seed, smoke test
  server.js
client/src/
  assets/  components/  context/  hooks/  layouts/  pages/ (+ account/, admin/)  routes/  services/  styles/  utils/
  App.js  main.js  index.css
```

---

## 9. Content still needed from Tower of Grace

These are left as editable placeholders on purpose. Nothing has been invented:

- Farm, product and team photos
- Company story, vision, mission and values
- Contact phone, email, address, WhatsApp number, map link and opening hours
- Real products, weights and pack sizes, prices and stock
- Delivery fees and bank account details
- Any genuine certifications or approvals
