# Salemate - Billing & Stock Management App

## Overview

Salemate is an Indian, multi-language billing and stock management application designed for Android, iOS, and Web platforms. The app targets small and medium businesses needing invoice generation, inventory tracking, and GST compliance features. It follows an offline-first approach with sync capabilities and operates on a subscription-based model with tiered plans (FREE, BASIC, PRO, ENTERPRISE).

Core features include:
- Stock/Inventory management with bill scanning via AI
- Invoice and Proforma generation
- App-to-app stock transfer between Salemate users
- GST reporting for tax filing
- QR code-based item entry
- Multi-language support (English, Hindi, Kannada, Tamil)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state, Zustand for client state (i18n)
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with custom theme variables for consistent design
- **Build Tool**: Vite with custom plugins for Replit integration

The frontend follows a page-based structure with shared layout components. The AppShell provides consistent navigation via a fixed sidebar, and pages are organized by feature domain (dashboard, inventory, billing, transfers).

### Backend Architecture
- **Runtime**: Node.js with Express
- **API Pattern**: RESTful endpoints under `/api/*` prefix
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Validation**: Zod schemas shared between frontend and backend via `drizzle-zod`

The server uses a storage abstraction layer (`IStorage` interface) to decouple business logic from database operations, making it easier to swap implementations or add caching.

### Data Storage
- **Primary Database**: PostgreSQL accessed via `DATABASE_URL` environment variable
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Key Tables**: 
  - `storeProfiles` - Business profile and subscription plan
  - `items` - Inventory/stock items with pricing, GST, and quantity
  - `invoices` + `invoiceLineItems` - Sales documents
  - `transferRequests` + `transferLineItems` - Inter-store transfers

### AI Integration
- **OpenAI GPT-4o**: Used for bill scanning feature - extracts item details from supplier invoice images
- **Input**: Base64-encoded image of physical or digital supplier bills
- **Output**: Structured JSON with item names, prices, HSN codes, GST percentages

### Subscription & Entitlements
Plan limits are enforced client-side via the `entitlements.ts` service:
- FREE: 10 bills/month, 1 login, basic features
- BASIC: Unlimited bills, proforma support
- PRO: Multiple logins, unlimited templates
- ENTERPRISE: GST filing support

## External Dependencies

### Database
- **PostgreSQL**: Required for all data persistence. Connection via `DATABASE_URL` environment variable. Schema migrations managed through Drizzle Kit (`db:push` command).

### Third-Party APIs
- **OpenAI API**: Powers the bill scanning feature. Requires `OPENAI_API_KEY` environment variable. Uses GPT-4o model for vision capabilities.

### Key NPM Packages
- `drizzle-orm` + `drizzle-kit`: Database ORM and migration tooling
- `@tanstack/react-query`: Async state management
- `zod`: Runtime validation shared across stack
- `date-fns`: Date manipulation for reports and filtering
- Radix UI primitives: Accessible component foundations
- `wouter`: Minimal React router

### Session Management
- `connect-pg-simple`: PostgreSQL session store (available but sessions not fully implemented yet)
- `express-session`: Session middleware

### Future Considerations (Architecture Notes)
- Store marketplace listing feature planned but not yet built
- Offline-first sync mechanism will require service workers and local database (IndexedDB)
- Mobile apps will likely use React Native or similar cross-platform approach