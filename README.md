# MOSE Webshop 🏭

> **Geen poespas. Wel karakter.**  
> Premium streetwear uit Groningen, gebouwd met moderne web technologie.

## 🚀 Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, Framer Motion
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Payments**: Stripe (iDEAL, Credit Card, PayPal, Klarna)
- **Deployment**: Vercel (automatic deployments via GitHub)
- **State Management**: Zustand (cart + wishlist)

## 🎨 Design Systeem

- **Primaire kleur**: Jadegroen `#00A676`
- **Accent**: Zwart `#000000`, Wit `#FFFFFF`
- **Typografie**: 
  - Display: Anton (headings, uppercase)
  - Body: Montserrat (clean, modern)
- **Stijl**: Minimalistisch, industrieel, stoer

## 📦 Features

### E-commerce Core
- [x] Product catalog met categories
- [x] Product variants (size + color combinations)
- [x] Real-time stock management
- [x] Shopping cart (persistent via Zustand)
- [x] Guest & authenticated checkout
- [x] Multiple payment methods (Stripe)
- [x] Order management & tracking
- [ ] Wishlist / favorites
- [ ] Product reviews
- [ ] Search & filters
- [ ] Related products

### Fashion-Specifiek
- [x] Size selector met stock indicator
- [x] Color swatches met hex values
- [ ] Product image gallery met zoom
- [ ] Size guide modal
- [ ] Quick view modal
- [ ] Recently viewed products
- [ ] Back-in-stock notifications
- [ ] Gift cards

### Performance
- [x] Next.js Image optimization
- [x] Server-side rendering (SSR)
- [x] Static generation (SSG) voor product pages
- [x] Edge functions voor snelle API's
- [ ] Infinite scroll product listing
- [ ] Prefetching on hover
- [ ] Virtual scrolling

## 🗄️ Database Schema

```sql
categories
├── id (UUID)
├── name (TEXT)
├── slug (TEXT)
├── description (TEXT)
└── image_url (TEXT)

products
├── id (UUID)
├── name (TEXT)
├── slug (TEXT)
├── description (TEXT)
├── base_price (DECIMAL)
├── category_id (UUID → categories)
├── is_featured (BOOLEAN)
└── is_active (BOOLEAN)

product_variants
├── id (UUID)
├── product_id (UUID → products)
├── sku (TEXT)
├── size (TEXT)
├── color (TEXT)
├── color_hex (TEXT)
├── stock_quantity (INT)
└── price_adjustment (DECIMAL)

product_images
├── id (UUID)
├── product_id (UUID → products)
├── variant_id (UUID → product_variants)
├── url (TEXT)
├── position (INT)
└── is_primary (BOOLEAN)

orders
├── id (UUID)
├── user_id (UUID → auth.users)
├── email (TEXT)
├── status (TEXT)
├── total (DECIMAL)
├── shipping_address (JSONB)
├── billing_address (JSONB)
├── stripe_payment_intent_id (TEXT)
└── tracking_code (TEXT)

order_items
├── id (UUID)
├── order_id (UUID → orders)
├── product_id (UUID → products)
├── variant_id (UUID → product_variants)
├── quantity (INT)
├── price_at_purchase (DECIMAL)
└── sku (TEXT)
```

## 🛠️ Development

### Prerequisites
- Node.js 18+
- GitHub CLI (`gh`)
- Vercel CLI (`vercel`)
- Supabase CLI (`supabase`)

### Setup

```bash
# Clone repository
git clone https://github.com/mosewear/mose-webshop.git
cd mose-webshop

# Install dependencies
npm install

# Setup environment variables
cp .env.local.example .env.local
# Edit .env.local met je API keys

# Run development server
npm run dev
```

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App (local: http://localhost:3000 — production: https://www.mosewear.com)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

On Vercel production, set `NEXT_PUBLIC_SITE_URL` to the canonical storefront URL (`https://www.mosewear.com`). If unset, the app falls back to that URL for emails and payment flows.

### Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking

# Database
supabase db push     # Push migrations to Supabase
supabase db reset    # Reset database
supabase gen types typescript --local > src/lib/supabase/types.ts

# Deployment
vercel               # Deploy to preview
vercel --prod        # Deploy to production
```

## 📁 Project Structure

```
mose-webshop/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (shop)/            # Shop pages group
│   │   │   ├── shop/          # Product listing
│   │   │   ├── product/[slug] # Product detail
│   │   │   ├── cart/          # Shopping cart
│   │   │   └── checkout/      # Checkout flow
│   │   ├── (account)/         # User account pages
│   │   ├── api/               # API routes
│   │   ├── globals.css        # Global styles + Tailwind
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Homepage
│   ├── components/
│   │   ├── ui/                # Reusable UI components
│   │   ├── product/           # Product-specific components
│   │   ├── cart/              # Cart components
│   │   └── layout/            # Layout components (header, footer)
│   ├── lib/
│   │   ├── supabase/          # Supabase client & types
│   │   ├── stripe/            # Stripe utilities
│   │   └── utils/             # Helper functions
│   └── store/
│       ├── cart.ts            # Cart state (Zustand)
│       └── wishlist.ts        # Wishlist state
├── supabase/
│   ├── migrations/            # Database migrations
│   ├── seed.sql               # Seed data
│   └── config.toml            # Supabase config
├── public/                    # Static assets
└── package.json
```

## 🚢 Deployment

Het project is automatisch verbonden met Vercel via GitHub:
- **Productie**: https://mose-webshop.vercel.app
- **Preview**: Elke PR krijgt automatisch een preview URL

### Manual Deployment

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

## 📊 Roadmap

### MVP (Week 1-2)
- [x] Database schema & seed data
- [x] Basic homepage met hero
- [x] Product listing met filters
- [ ] Product detail page
- [ ] Shopping cart functionality
- [ ] Checkout flow met Stripe
- [ ] Order confirmation emails

### Phase 2 (Week 3-4)
- [ ] User authentication (Supabase Auth)
- [ ] User account dashboard
- [ ] Order history & tracking
- [ ] Wishlist functionality
- [ ] Product reviews
- [ ] Admin dashboard

### Phase 3 (Week 5-6)
- [ ] Lookbook sectie
- [ ] Size guide modal
- [ ] Product recommendations
- [ ] Email marketing integration
- [ ] Analytics (Vercel Analytics)
- [ ] SEO optimalisatie

### Future
- [ ] Mobile app (React Native + Expo)
- [ ] Loyalty program
- [ ] Gift cards
- [ ] International shipping
- [ ] Multi-currency support

## 🤝 Contributing

Dit is een privé project voor MOSE. Contact via [info@mosewear.nl](mailto:info@mosewear.nl).

## 📄 License

© 2025 MOSE. Alle rechten voorbehouden.

---

**Gemaakt met ❤️ in Groningen**
