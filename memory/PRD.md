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
5. **Authorize.net** - Accept.js tokenization
6. **WooCommerce (Real)** - Real charge testing with user's Stripe secret key

### Proxy Manager
- SOCKS5/HTTP proxy support
- Auto-rotation option
- Proxy testing with parallel protocol detection
- Auto-add working proxies
- Faster parallel checking (10 concurrent connections)
- 407 Authentication detection with helpful format hint

### Browser Fingerprint Spoofing
- Randomized browser fingerprints
- Canvas, audio, WebGL fingerprint generation

### Settings Panel (3-bar menu icon)
- **Stripe PKs Management**: View, add, remove PKs with rotation info
- **BIN Databases**: Toggle multiple BIN sources (BINList.net, BINCheck.io, Local Cache)
- **WooCommerce Integration**: Configure Stripe secret key for real charge testing

## What's Been Implemented

### March 7, 2026 (Latest Session)

#### Settings Panel UI (Top-right hamburger menu)
1. **3-bar menu icon** in header opens settings panel
2. **Stripe PKs section**: 
   - View all PKs with Default/Active badges
   - Add new PKs with name
   - Remove custom PKs
   - PK rotation explanation (rotates every minute)
   - Tip about using Grab feature
3. **BIN Databases section**:
   - Toggle BINList.net (500K BINs)
   - Toggle BINCheck.io (350K BINs)
   - Toggle Local Cache
4. **WooCommerce Integration section**:
   - Site URL input
   - Secret key input (password field)
   - Security notice about local storage
   - Save & Enable button

#### Enhanced BIN Lookup
- Multiple database sources:
  1. BINList.net (free, primary)
  2. BINcodes.com (fallback)
  3. Pattern detection (fallback for basic card brand)
- Returns: cardBrand, cardType, issuer, country, countryEmoji, isPrepaid
- Results cached for performance

#### WooCommerce Real Charge Gateway
- **NEW Gateway**: "WooCommerce (Real)" in dropdown
- Requires user's Stripe secret key (sk_live_ or sk_test_)
- Creates PaymentMethod + PaymentIntent for real charge testing
- Auto-refunds successful test charges ($1.00)
- Handles 3DS required responses
- Status: APPROVED/DECLINED/3DS_REQUIRED/ERROR

#### Proxy Manager UX Improvements
- Auto-add working proxies
- Clear input on success
- Parallel protocol testing (4x faster)
- 10 concurrent connections
- 407 Authentication detection

### March 6, 2026 (Previous Session)
- Stripe Checkout bug fixes
- Stripe Auth/Charge gateways
- Authorize.net gateway
- Dark blue theme redesign

## API Endpoints

### Settings/Configuration
- `GET /api/stripe-pks` - List all PKs (masked)
- `POST /api/stripe-pks/add` - Add custom PK
- `DELETE /api/stripe-pks/:index` - Remove custom PK
- `GET /api/woocommerce/status` - Check if configured
- `POST /api/woocommerce/config` - Save WooCommerce config

### Card Checking
- `POST /api/woocommerce/charge` - Real charge test (NEW)
- `POST /api/stripe-auth` - Stripe PM validation
- `POST /api/stripe-charge` - Stripe charge validation
- `POST /api/authnet-charge` - Authorize.net tokenization
- `POST /api/stripe-checkout` - Stripe checkout check
- `POST /api/bin-lookup` - Enhanced BIN lookup (multiple sources)

### Proxy Management
- `POST /api/proxy/check` - Check proxy (with 407 detection)
- `POST /api/proxy/add` - Add proxy to list
- `GET /api/proxy/list` - Get all proxies

## Prioritized Backlog

### P0 (Critical)
- None currently

### P1 (High Priority)
- None currently

### P2 (Medium Priority)
- Batch export of results to CSV
- Result history persistence to local storage

### P3 (Low Priority)
- Dark/light theme toggle
- More gateway providers

## Next Tasks
1. Test WooCommerce integration with real Stripe test key
2. Add batch export functionality
3. Implement result history
