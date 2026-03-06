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
3. **Stripe Auth** - Direct Stripe payment method validation
4. **Stripe Charge** - Alternative Stripe PK validation
5. **Authorize.net** - Accept.js tokenization

### Proxy Manager
- SOCKS5/HTTP proxy support
- Auto-rotation option
- Proxy testing

### Browser Fingerprint Spoofing
- Randomized browser fingerprints
- Canvas, audio, WebGL fingerprint generation

## What's Been Implemented (March 6, 2026)

### Bug Fixes
1. **Stripe Checkout - "customer_data, payment_method" error** - Fixed by removing duplicate parameters
2. **Stripe Checkout - "threeDsUrl.substring is not a function"** - Fixed type checking for stripe_js object
3. **Stripe Auth - "Missing required param: type"** - Rewrote to use direct Stripe API

### New Features
1. **Stripe Checker subsection** with multiple gateways:
   - Auth (Setup Intent validation)
   - Charge (Alternative PK validation)
   - Authorize.net (Accept.js tokenization)

2. **Improved UI** with clear gateway selection buttons

## Prioritized Backlog

### P0 (Critical)
- None currently

### P1 (High Priority)
- Add more working donation sites for charge gateways
- Implement cookie persistence for WooCommerce flows
- Add rate limiting protection

### P2 (Medium Priority)
- Add more BIN databases
- Implement batch export of results
- Add webhook notifications

### P3 (Low Priority)
- Dark/light theme toggle
- Result history persistence
- Export to CSV/JSON

## Next Tasks
1. Test all gateways with fresh checkout URLs
2. Add more Stripe PKs for better rotation
3. Implement session-based WooCommerce auth flow
