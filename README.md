# Salemate

**Bill Smarter, Grow Faster**

Salemate is an offline-first billing and stock management application designed for Indian retail businesses (kirana stores). Built for Android, iOS, and Web platforms.

## Features

### Stock Management
- Add and manage inventory items with flexible units (kg, pieces, liters, etc.)
- Track stock quantities with low-stock alerts
- AI-powered bill scanning to quickly add items from supplier invoices
- QR code support for quick item entry

### Billing & Invoicing
- Create GST-compliant invoices with automatic tax calculations
- Support for multiple payment methods (Cash, UPI, Bank Transfer, Cheque, Credit)
- Proforma invoice generation
- Customer GSTIN and address capture
- Editable per-item pricing and discounts
- Invoice management within current financial year (April-March)

### Inter-Store Transfers
- Transfer stock between Salemate users
- Automatic invoice generation on acceptance
- 24-hour revert window for receivers
- Complete transfer history tracking

### Subscription Plans
- **FREE**: 10 bills/month, basic features
- **BASIC** (₹299/mo): Unlimited bills, proforma support
- **PRO** (₹799/mo): Multiple logins, unlimited templates
- **ENTERPRISE** (₹1499/mo): GST filing support

### User Experience
- Quick login for returning users (7-day session caching)
- Multi-language support (English, Hindi, Kannada, Tamil)
- Mobile-first responsive design
- Offline-first architecture with sync capabilities

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenAI GPT-4o for bill scanning
- **Payments**: Stripe integration

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - `DATABASE_URL` - PostgreSQL connection string
   - `OPENAI_API_KEY` - For AI bill scanning feature
   - `SESSION_SECRET` - For session management (production)

4. Push database schema:
   ```bash
   npm run db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:5000`

## Project Structure

```
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Page components
│   │   ├── lib/          # Utilities and hooks
│   │   └── hooks/        # Custom React hooks
├── server/               # Express backend
│   ├── routes.ts         # API endpoints
│   ├── storage.ts        # Database operations
│   └── openai.ts         # AI integration
├── shared/               # Shared types and schemas
│   └── schema.ts         # Drizzle database schema
└── attached_assets/      # Static assets
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new store
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/me` - Get current user

### Inventory
- `GET /api/items` - List items
- `POST /api/items` - Create item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice

### Transfers
- `GET /api/transfers` - List transfers
- `POST /api/transfers` - Create transfer
- `POST /api/transfers/:id/accept` - Accept transfer
- `POST /api/transfers/:id/reject` - Reject transfer

## License

Copyright © 2025 Salemate. All rights reserved.
