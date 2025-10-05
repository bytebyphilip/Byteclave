# ByteClave — Your Digital Hub for AI, Apps & Resources

Dark-themed static marketplace + news hub powered by Firebase Firestore and Firebase Storage. Includes admin dashboard, product listing/detail, articles + RSS merge, WhatsApp checkout, caching, lazy-loading, SEO (OG + JSON-LD), and fallback sample data.

## Tech stack
- ES Modules only (no bundler needed)
- Firebase (Firestore + Storage via CDN v9 modular)
- Static pages hosted on GitHub Pages (or any static host)

## Admin login
- Password: `1234` (client-side gate) — change in `app.js` by editing `ADMIN_PASSWORD`.
- On login, sets `sessionStorage.byteclave_admin = true` and `sessionStorage.admin_expiry = Date.now() + 3600*1000`.

## Category & Subcategory Taxonomy (UI + Admin)

1) PDFs
- Purpose: downloadable guides, ebooks, reports.
- Subcategories: AI Guides; Tutorials; Cheatsheets
- Example tags: ["guide","pdf","ebook","ai","tutorial"]
- Format field: "PDF"
- UI behavior: product card shows PDF badge + preview button if available; filter by category/subcategory. Preview opens the file link.
- Admin: fields `fileLink`, `fileSize`, `previewPages[]` (1–3+)

2) Apps
- Purpose: mobile/desktop app packages or links.
- Subcategories: Android; iOS; Desktop
- Example tags: ["apk","app","android","ios","desktop"]
- Format: "APK" or "APP/ZIP"
- UI: platform badges, install/download link.

3) Tools & Scripts
- Subcategories: CLI Tools; Web Tools; Automation Scripts
- Example tags: ["script","automation","cli","tool","extension"]
- UI: short capability lines and usage.

4) Courses
- Subcategories: Beginner; Intermediate; Advanced
- Example tags: ["course","video","class","certificate"]

5) Templates & UI Kits
- Subcategories: Figma; HTML/CSS; Tailwind Components
- Example tags: ["figma","template","ui-kit","design"]

6) Plugins & Extensions
- Subcategories: WordPress; VSCode; Browser (Chrome/Firefox)
- Example tags: ["plugin","extension","wordpress","vscode"]

7) AI Models & Demos
- Subcategories: Vision; NLP; Audio
- Example tags: ["model","nlp","vision","dataset"]

8) Services & Consultations
- Subcategories: Consulting; Custom Dev; Prompt Engineering
- Example tags: ["service","consult","dev","prompt-engineering"]

9) Datasets & APIs
- Subcategories: Public Datasets; API Access
- Example tags: ["dataset","api","csv","json"]

10) Misc / Other
- Purpose: anything else not fitting above.
- Subcategories: free-form, admin-created.
- Example tags: admin-defined.

### Filters & UI rules
- Category dropdown limits subcategory dropdown to relevant subcats; both act with AND.
- Tags are OR within tags, AND with category/subcategory selection.
- Search across `title`, `shortDescription`, `tags`, and `slug`.
- Price slider/inputs filter numeric range; price 0 shows "FREE".
- Sort: Newest, Price Low→High, Price High→Low, Popular (views placeholder).
- Pagination: 12 per page; sidebar shows per-category counts.

### Product Document Schema
```
{
  title: string,
  slug: string,
  shortDescription: string,
  description: string (HTML),
  price: number,
  currency: string,
  category: string,
  subcategory: string,
  tags: string[],
  image: string,
  previewPages: string[],
  fileLink: string,
  fileSize: number,
  format: string,
  license: string,
  published: boolean,
  createdAt: ISO string,
  updatedAt: ISO string,
  deleted: boolean
}
```

Admin enforces valid category/subcategory; slug is auto-generated and checked for uniqueness.

## First run and data seeding
- Categories: on first admin login, default taxonomy is seeded into the `categories` collection.
- Products/Articles: public pages read from Firestore; if unavailable, they fallback to `/data/sample-products.json` and `/data/sample-articles.json`.

### Firestore quick seed (optional)
- Open the Admin and save one product/article to create collections, or
- Use Firestore Import/Export to import your JSON, or
- Use the console to add docs matching the schema above.

## File structure
- See repository root — all required files exist under the specified paths.

## Firebase config
- Located in `firebase.js` with modular imports (v9.22.1). Replace only if you switch Firebase projects.

## WhatsApp checkout
- Number: `+254791943551`. Change in `app.js` (`WHATSAPP_NUMBER`).

## RSS proxy (optional)
- `rss-proxy.js` is an optional serverless/edge function. If not deployed, the app falls back to `rss2json` public API.

## Deploy to GitHub Pages
1. Commit and push to a `main` branch.
2. In GitHub repo Settings → Pages, set Source to `Deploy from a branch`, select `main` and `/ (root)`.
3. Wait for publish; your site will be at the Pages URL.

## Developer instructions
- Open with a static file server (e.g. VSCode Live Server). GitHub Pages will host as-is.
- Ensure images exist in `assets/` or upload via Admin (Storage).
- Change admin password and WhatsApp number in `app.js` before production.

## Test checklist
- Splash → Products → Add to cart → Checkout opens WhatsApp.
- Admin login `1234` → upload thumbnail → create product → appears on Products after a short delay.
- News: shows local articles, merging RSS if proxy/remote available.

## Future enhancements (suggestions)
- Analytics events (views, add-to-cart, purchases) to power Popular sort.
- Download gating and license keys for paid items.
- Web Workers for RSS parsing and client caching.
- Image CDN and responsive `srcset`.
- PWA (offline caching) and installable app.
- Stripe or M-Pesa checkout integration alongside WhatsApp.
