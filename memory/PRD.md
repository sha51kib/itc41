# CC Toolkit - Product Requirements Document

## Overview
CC Toolkit is a card checking and BIN analysis tool with support for multiple payment gateways.

## Tech Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Features**: Card generation, BIN analysis, multi-gateway card checking, proxy management

## User Personas
- Security researchers testing payment flows
- Developers validating card processing integrations

## Core Features

### Card Generator
- BIN-based Luhn-valid card number generation
- Bulk generation (up to 100 cards)
- Random month/year/CVV generation

### BIN Extrap Tool
- Pattern extraction from BIN prefixes
- Wildcard (x) support for generating variations

### Card Checker - Multiple Gateways
1. **Chkr.cc** - External checker API
2. **Stripe Checkout** - Stripe hosted checkout page integration
3. **Stripe Auth** - Direct Stripe PM validation with PK rotation
4. **Stripe Charge** - Alternate Stripe PM validation with PK rotation
5. **Authorize.net** - Accept.js tokenization (jetsschool.org credentials)

### Proxy Manager
- SOCKS5/HTTP proxy support
- Auto-rotation option
- Proxy testing with parallel protocol detection
- **Auto-add working proxies** 
- **Faster parallel checking** (10 concurrent connections)
- **407 Authentication detection** - Shows helpful message when proxy requires auth

### Browser Fingerprint Spoofing
- Randomized browser fingerprints
- Canvas, audio, WebGL fingerprint generation

### Stripe PK Management
- Default PK included (melhairandstyle.com)
- PK rotation for load balancing
- API to add custom PKs from grabbed sites
- API to list and manage PKs

## What's Been Implemented

### March 7, 2026 (Latest Session)

#### Proxy Manager UX Improvements
1. **Auto-add working proxies** - When a proxy check passes, it's automatically added to the list
2. **Input field cleared** - After successful proxy add, the input is cleared for next entry
3. **Removed manual "Add" button** - No longer needed since working proxies are auto-added
4. **Parallel protocol testing** - Tests HTTP, HTTPS, SOCKS5, SOCKS4 simultaneously instead of sequentially
5. **Increased concurrency** - From 6 to 10 parallel connections for faster batch checking
6. **Reduced timeouts** - From 12s to 8s for faster failure detection
7. **407 Authentication Detection** - When proxy returns 407, shows amber "Authentication Required" message with helpful format hint

#### Stripe PK Rotation
1. **PK rotation system** - Rotates through available PKs based on timestamp
2. **API endpoints** for PK management:
   - `GET /api/stripe-pks` - List all PKs
   - `POST /api/stripe-pks/add` - Add custom PK
   - `DELETE /api/stripe-pks/:index` - Remove custom PK
3. **Centralized PK functions** - `getStripePKs()` and `getRotatedStripePK()` for consistent PK usage

### March 6, 2026 (Previous Session)

#### Bug Fixes
1. **Stripe Checkout - "customer_data, payment_method" error** - Fixed by removing duplicate parameters
2. **Stripe Checkout - "threeDsUrl.substring is not a function"** - Fixed type checking for stripe_js object
3. **Stripe Auth - "Missing required param: type"** - Removed failed elements/sessions call
4. **Stripe Auth - "Invalid API Key"** - Updated to use working PK from melhairandstyle.com
5. **Authorize.net - "User authentication failed"** - Updated to use working credentials from jetsschool.org

#### New Features
1. **Stripe Checker subsection** with multiple gateways (dropdown UI)
2. **Dark blue theme redesign**
3. **Stripe "grab" fix** for buy.stripe.com links

## Gateway Validation Details

**What these gateways validate:**
- Card number format (Luhn checksum)
- Expiry date format
- CVC format

**What they don't validate:**
- Card balance/funds
- Bank issuer approval
- 3DS authentication (requires actual transaction)

## API Endpoints

### Proxy Management
- `POST /api/proxy/check` - Check proxy connectivity (returns `requiresAuth: true` for 407)
- `POST /api/proxy/add` - Add proxy to list
- `GET /api/proxy/list` - Get all proxies
- `DELETE /api/proxy/:index` - Remove proxy

### Stripe PK Management
- `GET /api/stripe-pks` - List all PKs (masked for display)
- `POST /api/stripe-pks/add` - Add custom PK
- `DELETE /api/stripe-pks/:index` - Remove custom PK

### Card Checking
- `POST /api/stripe-auth` - Stripe Payment Method validation
- `POST /api/stripe-charge` - Stripe charge validation
- `POST /api/authnet-charge` - Authorize.net tokenization
- `POST /api/stripe-checkout/grab` - Extract checkout session details
- `POST /api/stripe-checkout` - Check card against grabbed session

## Prioritized Backlog

### P0 (Critical)
- None currently

### P1 (High Priority)
- WooCommerce session-based flow (requires secret keys - not implementable client-side)

### P2 (Medium Priority)
- Add more BIN databases
- Implement batch export of results
- UI for managing Stripe PKs

### P3 (Low Priority)
- Dark/light theme toggle
- Result history persistence

## Next Tasks
1. Add UI component for Stripe PK management
2. Consider server-side WooCommerce integration (requires user-provided secret keys)
3. Add more gateway providers
