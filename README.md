# Multi-Channel E-Commerce ERP System

**Project by:** TechoMax Solution  
**Project Type:** Multi-Channel E-Commerce ERP, Billing, Inventory & Purchase Management  
**Architecture:** React + Node.js + Express.js + MySQL  
**Estimated Timeline:** 16–20 weeks

---

## 1. Project Overview

Build a production-ready, web-based ERP system to manage e-commerce sales, offline billing, inventory, purchasing, payments, and reporting from a centralized dashboard.

The system must support:

- Amazon marketplace integration
- Flipkart marketplace integration
- Shopify store integration
- Offline sales and Point of Sale (POS)
- Centralized billing and invoice management
- Custom discount management
- Dynamic QR-based online payments
- Multi-city, multi-warehouse, and multi-store inventory
- Purchase order and stock replenishment management
- Customer and supplier management
- Dashboards and business reports
- Role-based permissions and audit logs

The application must be modular, secure, responsive, maintainable, and designed to support future expansion.

## 2. Technology Stack

### Frontend

- React.js
- Vite
- JavaScript
- React Router
- Axios
- Tailwind CSS
- Reusable UI components
- React Hook Form for complex forms
- Zod for client-side validation where appropriate
- Recharts for dashboards and charts

### Backend

- Node.js
- Express.js
- JavaScript using ES modules
- REST APIs
- Prisma ORM
- MySQL
- JWT-based authentication using secure practices
- bcrypt for password hashing
- Zod for request validation
- Multer for controlled file uploads where needed

### Background Processing

Use a background job system for marketplace synchronization, retries, and scheduled tasks when required. Redis and BullMQ may be used for this purpose.

### Development and Deployment

- Git and GitHub
- Environment-based configuration
- ESLint and Prettier
- PM2 for production process management
- Nginx as a reverse proxy
- HTTPS using SSL certificates

**Important:** This is not a MongoDB project. Use MySQL for all primary application data and Prisma as the ORM. Do not introduce MongoDB.

## 3. Project Architecture

Use a monorepo structure:

```text
multi-channel-erp/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── products/
│   │   │   ├── inventory/
│   │   │   ├── warehouses/
│   │   │   ├── orders/
│   │   │   ├── billing/
│   │   │   ├── payments/
│   │   │   ├── purchases/
│   │   │   ├── customers/
│   │   │   ├── suppliers/
│   │   │   ├── marketplaces/
│   │   │   ├── reports/
│   │   │   └── settings/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── roles/
│   │   │   ├── products/
│   │   │   ├── inventory/
│   │   │   ├── warehouses/
│   │   │   ├── orders/
│   │   │   ├── billing/
│   │   │   ├── payments/
│   │   │   ├── purchases/
│   │   │   ├── customers/
│   │   │   ├── suppliers/
│   │   │   ├── marketplaces/
│   │   │   ├── reports/
│   │   │   └── audit-logs/
│   │   ├── jobs/
│   │   ├── routes/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
│
├── docs/
│   ├── DATABASE_DESIGN.md
│   ├── API_DOCUMENTATION.md
│   ├── MARKETPLACE_INTEGRATION.md
│   └── DEPLOYMENT.md
│
├── .gitignore
└── README.md
```

Keep modules separated by business responsibility. Use controllers for HTTP handling, services for business logic, and repositories or Prisma service layers for database operations where useful.

## 4. User Roles and Permissions

Implement role-based access control (RBAC).

Initial roles:

1. **Super Admin** — Full system access and configuration.
2. **Business Admin** — Manage business operations and users within assigned permissions.
3. **Sales Manager** — View and manage sales and orders.
4. **Billing Executive** — Create invoices and process permitted billing operations.
5. **Inventory Manager** — Manage stock, transfers, and stock adjustments.
6. **Purchase Manager** — Manage suppliers and purchase orders.
7. **Warehouse Staff** — Perform permitted stock receipts, issues, and transfers.
8. **Accountant** — View payment, invoice, purchase, and financial reports.
9. **Viewer** — Read-only access to authorized modules.

Permissions must be enforced on the backend, not just hidden in the frontend.

Support configurable access to modules, actions, and assigned locations.

## 5. Authentication and Security

Implement:

- Login and logout.
- Secure password hashing.
- User activation and deactivation.
- Password reset workflow.
- Role and permission middleware.
- Access token expiration and secure refresh handling where required.
- Rate limiting for authentication and sensitive endpoints.
- Request validation and centralized error handling.
- Secure HTTP headers.
- Parameterized database operations through Prisma.
- Audit logging for sensitive changes.
- Environment variables for secrets.
- No hardcoded credentials or API keys.
- No sensitive information in logs.

Use secure, HTTP-only cookies where appropriate. Apply CSRF protection if cookie-based authentication requires it.

## 6. Core Modules

### 6.1 Dashboard

Create a responsive dashboard displaying:

- Total sales.
- Sales today and for selected periods.
- Orders by channel.
- Pending and completed orders.
- Inventory value and available stock.
- Low-stock products.
- Pending purchase orders.
- Outstanding invoices.
- Payment status.
- City-wise and channel-wise performance.

Dashboard metrics must be calculated from actual database records. Do not use hardcoded production statistics.

### 6.2 Product and SKU Management

Each product should support:

- Product name and description.
- SKU and optional barcode.
- Category and brand.
- Unit of measurement.
- Purchase cost and selling price.
- Tax configuration.
- Product images where needed.
- Active/inactive status.
- Marketplace-specific product identifiers.
- Reorder threshold.
- Product variations where required.

Prevent duplicate internal SKUs. Marketplace identifiers must be mapped separately to internal products.

### 6.3 Multi-City and Warehouse Management

Support:

- Multiple cities.
- Multiple warehouses and stores.
- Location-wise inventory balances.
- Warehouse transfers.
- Stock receipt and issue records.
- Stock adjustment with reason and authorization.
- Inventory movement history.
- Channel-specific stock allocation.
- Low-stock notifications.
- Returned and damaged stock handling.

Do not store the entire inventory quantity only in the product record. Maintain stock balances by product and location, with a transaction history.

### 6.4 Inventory Data Model

Design inventory around these concepts:

- Product
- Warehouse
- Stock Balance
- Stock Movement
- Stock Transfer
- Stock Reservation
- Channel Inventory Allocation

A stock movement should record:

- Product ID.
- Source and destination locations, where applicable.
- Quantity.
- Movement type.
- Reference document.
- Timestamp.
- User responsible.
- Reason or remarks.

Use database transactions for stock-changing operations. Prevent negative inventory unless explicitly allowed by authorized business rules.

### 6.5 Sales Order Management

Support orders originating from:

- Amazon.
- Flipkart.
- Shopify.
- Offline POS.

Each order should store:

- Internal order number.
- External marketplace order ID, where applicable.
- Sales channel.
- Customer information where available.
- Order items and quantities.
- Prices, discounts, and taxes.
- Order status.
- Payment status.
- Fulfillment status.
- Source and synchronization timestamps.

Use unique constraints to prevent duplicate external orders from being imported.

### 6.6 Billing and Invoices

Implement:

- Invoice creation.
- Unique invoice numbering.
- Product selection by SKU or barcode.
- Quantity and price calculation.
- Fixed and percentage discounts.
- Tax calculation.
- Customer details.
- Payment records.
- PDF generation and printing.
- Invoice history.
- Cancellation and credit-note workflows as approved.
- Partial and full payment tracking.

Use decimal-safe database types for monetary values. Avoid JavaScript floating-point arithmetic for authoritative financial calculations; use a decimal library or integer minor units where appropriate.

The backend must validate prices, discounts, taxes, and totals. Never trust financial totals submitted by the browser.

### 6.7 Custom Discount Management

Support:

- Fixed amount discounts.
- Percentage discounts.
- Product-level discounts.
- Order-level discounts.
- Customer-specific discounts when required.
- Configurable maximum discount limits.
- Role-based approval for exceptional discounts.
- Discount reasons.
- Audit records.

All discount rules must be validated by the backend.

### 6.8 Dynamic QR Payments

Integrate with a suitable payment provider that supports the intended payment flow.

Expected workflow:

1. Create an invoice or payment request.
2. Calculate the authoritative amount on the backend.
3. Create a payment request with the provider.
4. Generate or display the provider-supported QR code.
5. Allow the customer to complete payment.
6. Verify payment through a signed webhook or server-to-server API.
7. Update payment and invoice status in a database transaction.
8. Record the provider transaction ID and payment reference.

Requirements:

- Never mark an invoice paid only because the customer scanned a QR code.
- Never trust a client-side success message.
- Validate webhook signatures.
- Handle repeated webhooks idempotently.
- Support pending, successful, failed, and refunded states.
- Do not store card or banking credentials.
- Keep provider secrets in environment variables.

The provider must be selected after confirming the required payment method and supported QR payment capabilities.

### 6.9 Purchase Order Management

Implement:

- Supplier selection.
- Purchase order creation.
- Product and quantity selection.
- Expected delivery date.
- Purchase order approval.
- Draft, approved, partially received, completed, and cancelled states.
- Goods receipt records.
- Partial deliveries.
- Purchase history.
- Supplier invoice references.
- Stock updates after receipt.
- Purchase reports.

A purchase order must not increase available inventory merely because it has been created. Inventory is updated when goods are received and accepted according to the configured workflow.

### 6.10 Customer Management

Maintain:

- Customer name.
- Contact information.
- Billing and shipping addresses.
- Tax registration details where applicable.
- Order history.
- Invoice history.
- Payment history.
- Customer status.

Only store customer information that is needed for business operations.

### 6.11 Supplier Management

Maintain:

- Supplier name and contact information.
- Business and tax details where applicable.
- Products supplied.
- Purchase order history.
- Goods receipt history.
- Supplier invoice references.
- Supplier status.

### 6.12 Amazon Integration

Use the official Amazon Selling Partner API where the seller account and application are eligible.

Implementation tasks:

- Configure credentials and authorization.
- Map Amazon listings to internal SKUs.
- Import supported orders.
- Synchronize supported order statuses.
- Synchronize inventory where supported and authorized.
- Handle rate limits, retries, and API errors.
- Log synchronization results without exposing secrets.

Do not assume all Amazon operations are available by default. Confirm required API roles and permissions.

### 6.13 Flipkart Integration

Use official Flipkart seller integration APIs where available and authorized.

Implementation tasks:

- Configure seller API credentials.
- Map marketplace listings to internal SKUs.
- Import supported orders.
- Synchronize order status.
- Synchronize inventory where supported.
- Handle rate limits and failures.
- Record synchronization history.

Confirm API access and the currently supported integration capabilities before implementation.

### 6.14 Shopify Integration

Use Shopify's official APIs and supported authentication method.

Implementation tasks:

- Connect the authorized store.
- Import supported orders and products.
- Map Shopify products and variants to internal SKUs.
- Synchronize inventory where authorized.
- Process supported order webhooks.
- Validate webhook signatures.
- Handle retries and duplicate events.
- Provide connection and synchronization status.

Do not expose store access tokens in the frontend.

### 6.15 Marketplace Synchronization Service

Create a dedicated integration layer for each marketplace.

Requirements:

- Separate provider adapters.
- Secure credential storage.
- Scheduled and event-driven synchronization where supported.
- Idempotent order imports.
- Retry policies with backoff.
- Rate-limit handling.
- Synchronization logs.
- Error reporting.
- Manual resynchronization controls for authorized users.
- SKU mapping and conflict handling.

Do not make external marketplace calls inside long-running user-facing HTTP requests when they can be handled asynchronously.

**Inventory safety:** Use one authoritative inventory ledger. Marketplace quantities should be derived from available stock minus reservations, safety buffers, and channel allocations. Avoid independently editing the same stock quantity in multiple modules.

### 6.16 Offline POS

Implement an offline sales interface for authorized billing staff.

Features:

- Product search.
- SKU or barcode lookup.
- Quantity entry.
- Discount application.
- Tax calculation.
- Customer selection.
- Invoice generation.
- Payment recording.
- Stock deduction after confirmed sale.
- Printable receipt or invoice.

If true offline operation in the browser is required, treat it as a separate feature with explicit local data storage, synchronization, conflict resolution, and security design. Do not assume the web application works offline automatically.

### 6.17 Reports and Reconciliation

Implement:

- Sales reports.
- Channel-wise sales.
- City-wise sales.
- Product-wise sales.
- Inventory balances.
- Stock movement.
- Low-stock products.
- Purchase order reports.
- Invoice reports.
- Payment reports.
- Discount reports.
- Marketplace settlement reconciliation based on available settlement data.
- Export to CSV or Excel where required.

Financial reports must be based on persisted transactions and reconciled totals, not frontend calculations.

## 7. MySQL Database Design

Use MySQL with Prisma migrations.

Initial entities should include:

- User
- Role
- Permission
- UserRole
- RolePermission
- City
- Warehouse
- Product
- ProductCategory
- ProductVariant
- MarketplaceListing
- MarketplaceConnection
- Customer
- Supplier
- SalesOrder
- SalesOrderItem
- Invoice
- InvoiceItem
- Payment
- PaymentWebhookEvent
- DiscountRule
- PurchaseOrder
- PurchaseOrderItem
- GoodsReceipt
- GoodsReceiptItem
- StockBalance
- StockMovement
- StockTransfer
- StockReservation
- ChannelInventoryAllocation
- MarketplaceSyncJob
- MarketplaceSyncLog
- AuditLog
- TaxConfiguration
- BusinessSetting

Create foreign keys, unique constraints, indexes, and suitable delete/update rules.

Use `DECIMAL` types for prices, amounts, and tax calculations. Store timestamps consistently and handle business-local time zones in the application.

Create a Prisma schema that accurately models relationships before implementing all business modules.

## 8. API Design

Use a versioned REST API:

```text
/api/v1/auth
/api/v1/users
/api/v1/roles
/api/v1/products
/api/v1/customers
/api/v1/suppliers
/api/v1/cities
/api/v1/warehouses
/api/v1/inventory
/api/v1/stock-transfers
/api/v1/orders
/api/v1/invoices
/api/v1/payments
/api/v1/discounts
/api/v1/purchase-orders
/api/v1/goods-receipts
/api/v1/marketplaces
/api/v1/reports
/api/v1/audit-logs
```

Use consistent response structures, appropriate HTTP status codes, pagination, filtering, sorting, and centralized error handling.

Validate all input on the backend. Apply authentication and authorization to every protected endpoint.

Document the APIs using Swagger/OpenAPI.

## 9. Frontend Requirements

Create a professional, modern ERP interface.

Design expectations:

- Responsive desktop and tablet layouts.
- Sidebar navigation.
- Header with user profile and notifications.
- Dashboard cards and charts.
- Searchable and filterable data tables.
- Pagination for large datasets.
- Reusable form components.
- Consistent loading, empty, success, and error states.
- Confirmation dialogs for destructive actions.
- Clear validation messages.
- Permission-aware navigation.
- Accessible forms and controls.

Use a consistent visual design system for colors, typography, spacing, buttons, forms, tables, and dialogs.

Avoid building the entire application as one large React component. Use reusable components and feature-based modules.

## 10. Development Standards

Antigravity must follow these standards:

1. Inspect the existing repository before making changes.
2. Create a clear implementation plan and identify dependencies.
3. Build the application in small, testable modules.
4. Use MySQL and Prisma exclusively for primary application data.
5. Keep controllers thin and business logic in services.
6. Use database transactions for financial and inventory operations.
7. Validate all requests.
8. Add appropriate indexes and unique constraints.
9. Use environment variables for secrets and configuration.
10. Provide meaningful error handling and logs.
11. Avoid duplicate code and oversized components.
12. Do not use hardcoded production data in place of actual functionality.
13. Do not claim an integration works until it has been tested with authorized credentials.
14. Add tests for critical calculations and workflows.
15. Update documentation as modules are implemented.
16. Never silently remove or overwrite existing project functionality.
17. Keep all generated code consistent with the existing project conventions.

## 11. Testing Requirements

Write tests for critical workflows, including:

- Login and role permissions.
- Product and SKU uniqueness.
- Stock receipt and transfer.
- Prevention of unauthorized stock adjustments.
- Negative inventory prevention.
- Duplicate marketplace order prevention.
- Invoice totals and discount calculations.
- Payment webhook signature validation.
- Duplicate webhook handling.
- Purchase order and goods receipt processing.
- API validation and error responses.
- Marketplace synchronization retry logic.

Use automated tests for important backend services and API routes. Add frontend tests for critical user workflows where appropriate.

## 12. Environment Configuration

Create `backend/.env.example` with placeholders such as:

```dotenv
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173

DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/multichannel_erp"

JWT_ACCESS_SECRET=replace_with_secure_random_secret
JWT_REFRESH_SECRET=replace_with_secure_random_secret

# Payment provider configuration
PAYMENT_PROVIDER=
PAYMENT_API_KEY=
PAYMENT_API_SECRET=
PAYMENT_WEBHOOK_SECRET=

# Marketplace credentials must be configured securely
AMAZON_CLIENT_ID=
AMAZON_CLIENT_SECRET=
AMAZON_REFRESH_TOKEN=

FLIPKART_API_KEY=
FLIPKART_API_SECRET=

SHOPIFY_STORE_DOMAIN=
SHOPIFY_ACCESS_TOKEN=

# Background job processing, if enabled
REDIS_URL=
```

These are placeholders only. Confirm the exact environment variables required by the selected marketplace APIs and payment provider. Never commit actual secrets to Git.

## 13. Local Development Setup

### Prerequisites

- Node.js LTS version compatible with the selected dependencies.
- MySQL.
- Git.
- npm.
- Optional Redis for background jobs.

### Backend Setup

```bash
cd backend
npm install
```

Create the `.env` file using `.env.example`, then configure the MySQL connection.

Create the database using MySQL and apply Prisma migrations:

```bash
npx prisma generate
npx prisma migrate dev
```

Run the backend using the development script defined in `package.json`:

```bash
npm run dev
```

### Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend should use the configured backend API URL.

## 14. Deployment Requirements

Prepare deployment documentation for:

- Production MySQL configuration.
- Environment variables and secret management.
- Prisma production migrations.
- Frontend build and deployment.
- Backend deployment with PM2.
- Nginx reverse proxy configuration.
- HTTPS configuration.
- Database backup and recovery.
- Application logging and monitoring.
- Background worker deployment if used.
- Health-check endpoints.
- Production smoke tests.

Do not expose MySQL publicly unless a specific, securely configured requirement exists. Prefer private network access and restricted database users.

## 15. Estimated Project Timeline

| Phase | Estimated Duration |
|---|---|
| Requirements and UI/UX | 1–2 weeks |
| Core ERP and user management | 2 weeks |
| Inventory and warehouse management | 2–3 weeks |
| Purchase order management | 1–2 weeks |
| Billing and discounts | 2 weeks |
| QR payment integration | 1–2 weeks |
| Marketplace integrations | 3–4 weeks |
| Dashboards and reports | 1–2 weeks |
| Testing and deployment | 2 weeks |
| **Overall estimated timeline** | **16–20 weeks** |

The schedule is indicative. Several phases can overlap, and marketplace approvals or third-party API restrictions may affect delivery.

## 16. Implementation Roadmap for Antigravity

Implement the project in the following order:

### Stage 1 — Foundation

- Inspect the repository and establish the architecture.
- Set up React, Express, MySQL, and Prisma.
- Create the initial database schema and migrations.
- Implement authentication, roles, permissions, and layouts.
- Add environment configuration and error handling.

### Stage 2 — Core Business Modules

- Implement products and SKU management.
- Implement customers and suppliers.
- Implement cities and warehouses.
- Implement inventory balances and stock movements.
- Implement purchase orders and goods receipt.

### Stage 3 — Sales and Payments

- Implement offline POS and billing.
- Implement invoices, taxes, and discounts.
- Implement payment records.
- Integrate invoice-linked QR payments with verified status updates.

### Stage 4 — Marketplace Integrations

- Build the marketplace adapter framework.
- Implement Shopify integration first if API access is available.
- Implement Amazon and Flipkart integrations after confirming account permissions.
- Implement order import, SKU mapping, inventory synchronization, retries, and monitoring.
- Test duplicate events and stock consistency.

### Stage 5 — Reports and Completion

- Implement dashboards and operational reports.
- Add settlement reconciliation based on available data.
- Complete automated and integration tests.
- Conduct user acceptance testing.
- Deploy to the production environment.
- Update documentation and complete handover.

## 17. Initial Acceptance Criteria

The initial release should satisfy the following:

- Users can log in and access only permitted modules.
- Products and SKUs can be managed in MySQL.
- Stock balances are maintained by warehouse and channel allocation.
- Stock movements are auditable and transactional.
- Purchase orders and goods receipts update inventory correctly.
- Invoices calculate prices, taxes, and discounts on the backend.
- QR payment status changes only after verified provider confirmation.
- Connected marketplaces import supported orders without duplicates.
- Dashboards show data derived from real transactions.
- Critical workflows have tests and documented results.
- The application can be configured and deployed using the supplied instructions.

## 18. Instructions to Antigravity

Treat this README as the main project specification.

Before writing substantial code:

1. Inspect the current repository and identify existing files, dependencies, and functionality.
2. Prepare an implementation plan and database relationship diagram.
3. Identify any missing requirements that block implementation.
4. List external API credentials and approvals required for integrations.
5. Implement the foundation and core modules first.
6. Run migrations, tests, and build checks after each major stage.
7. Maintain a progress checklist in `docs/IMPLEMENTATION_PROGRESS.md`.
8. Update this README and API documentation when implementation details change.
9. Do not fabricate API responses or claim real integrations work without verification.
10. Prioritize correctness, data integrity, security, and maintainable architecture over generating a large amount of code at once.

**Final goal:** Deliver a functional, secure, maintainable Multi-Channel E-Commerce ERP using React, Node.js, Express.js, and MySQL, with marketplace integrations, billing, inventory, purchasing, QR payments, and reporting.
