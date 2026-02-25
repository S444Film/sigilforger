# Sigil Forge — Web Application

Transform desires into unique mystical sigils using the traditional chaos magick method.

## Quick Start

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Build for production
npm run build
```

## Stripe Setup

### 1. Create Stripe Account

Go to [stripe.com](https://stripe.com) and create an account (or log in).

### 2. Create Products

In [Stripe Dashboard → Products](https://dashboard.stripe.com/products), create three products:

| Product | Type | Price |
|---------|------|-------|
| Single Sigil Unlock | One-time | £0.99 |
| Lifetime Access | One-time | £9.99 |
| Monthly Subscription | Recurring (monthly) | £2.99 |

### 3. Get Your Keys

From [Stripe Dashboard → API Keys](https://dashboard.stripe.com/apikeys):
- Copy your **Publishable key** (starts with `pk_test_` or `pk_live_`)

From each product, copy the **Price ID** (starts with `price_`).

### 4. Update the Code

In `src/App.jsx`, update the config at the top:

```javascript
const STRIPE_CONFIG = {
  publishableKey: "pk_live_YOUR_KEY_HERE",
  prices: {
    single: "price_SINGLE_PRICE_ID",
    lifetime: "price_LIFETIME_PRICE_ID", 
    monthly: "price_MONTHLY_PRICE_ID",
  }
};
```

### 5. Testing

Use `pk_test_` keys and test price IDs during development. Stripe provides test card numbers:
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002

## Deployment

### Option A: Vercel (Recommended)

1. Push code to GitHub

2. Go to [vercel.com](https://vercel.com) and import your repository

3. Deploy — Vercel auto-detects Vite

4. Add custom domain (optional)

**That's it.** Vercel handles builds automatically on every push.

### Option B: Netlify

1. Push code to GitHub

2. Go to [netlify.com](https://netlify.com) → Add new site → Import from Git

3. Configure:
   - Build command: `npm run build`
   - Publish directory: `dist`

4. Deploy

### Option C: Manual / Any Static Host

```bash
npm run build
```

Upload the `dist/` folder to any static hosting:
- GitHub Pages
- Cloudflare Pages
- AWS S3 + CloudFront
- Any web server

## File Structure

```
sigil-forge-web/
├── index.html              # Entry HTML
├── package.json            # Dependencies
├── vite.config.js          # Build config
├── public/
│   ├── favicon.svg         # Site icon
│   ├── privacy-policy.html # Legal page
│   ├── terms-of-service.html
│   └── support.html        # FAQ/Support
└── src/
    ├── main.jsx            # React entry
    └── App.jsx             # Main application
```

## Environment Variables (Optional)

For extra security, use environment variables instead of hardcoding:

```bash
# .env.local (don't commit this)
VITE_STRIPE_KEY=pk_live_xxx
VITE_PRICE_SINGLE=price_xxx
VITE_PRICE_LIFETIME=price_xxx
VITE_PRICE_MONTHLY=price_xxx
```

Then in code:
```javascript
const STRIPE_CONFIG = {
  publishableKey: import.meta.env.VITE_STRIPE_KEY,
  // ...
};
```

On Vercel/Netlify, add these in the dashboard under Environment Variables.

## Customization

### Change Prices
Update both Stripe Dashboard and the display text in `TIERS` array.

### Change Colors
The gold/dark theme uses these values throughout:
- Background: `#0a0a08`
- Gold: `#c9a84c` / `rgba(201,168,76,x)`
- Text: `#e8dcc8`

### Add Analytics
Insert your analytics script in `index.html` or use a React-based solution.

## Going Live Checklist

- [ ] Switch Stripe keys from `pk_test_` to `pk_live_`
- [ ] Update price IDs to live versions
- [ ] Test a real £0.99 purchase (refund yourself after)
- [ ] Verify legal pages load correctly
- [ ] Update contact email in legal pages
- [ ] Set up custom domain
- [ ] Submit to Google Search Console

## Stripe Webhook (Optional but Recommended)

For subscriptions, set up a webhook to handle:
- `customer.subscription.deleted` — revoke access
- `invoice.payment_failed` — notify user

Create an endpoint at `/api/webhook` and configure in Stripe Dashboard → Webhooks.

For a simple site with client-side access control (localStorage), this is optional. For production with server-side validation, it's recommended.

## Support

Questions? Issues? Contact: support@super444.com
