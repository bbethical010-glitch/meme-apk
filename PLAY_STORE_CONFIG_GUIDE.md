# Google Play Store Configuration & In-App Purchases Guide
**Application:** Meme Capsule (`com.meme.capsule`)  
**Version:** v3.7 (versionCode 28)  
**Target Platform:** Google Play Console  

---

## 1. Overview of In-App Products (SKUs)

Meme Capsule features **3 one-time non-consumable in-app products**. Configure these under **Google Play Console > Monetize with Play > In-app products**.

| Product Name | Product ID (SKU) | Type | Base Price (INR) | Tax Category | Entitlement Granted |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **COMBO PACK** | `meme_capsule_pro` | One-time (Non-consumable) | **₹199** | Digital Content / In-App Product (GST 18%) | Removes all interstitial ads + Unlimited Mood Boards |
| **REMOVE ADS** | `remove_ads_forever` | One-time (Non-consumable) | **₹199** | Digital Content / In-App Product (GST 18%) | Nukes all interstitial & banner ads forever |
| **UNLIMITED MOOD BOARDS** | `unlimited_mood_boards` | One-time (Non-consumable) | **₹49** | Digital Content / In-App Product (GST 18%) | Removes the 3-board limit for unlimited creation |

---

## 2. Product Details & Copy for Play Console Entry

### Product 1: Combo Pack (Flagship Bundle)
- **Product ID:** `meme_capsule_pro`
- **Name / Title:** `Combo Pack: No Ads + Unlimited Boards` *(Max 55 characters)*
- **Description:** `Permanently removes all interstitial ads and unlocks unlimited mood boards.` *(Max 80 characters)*
- **Status:** Active
- **Pricing:**
  - **India (Default):** `₹199.00` (Tax Inclusive)
  - **Worldwide:** Auto-convert exchange rates based on INR base price.

---

### Product 2: Remove Ads (Single Pass)
- **Product ID:** `remove_ads_forever`
- **Name / Title:** `Remove Ads Forever` *(Max 55 characters)*
- **Description:** `Permanently nukes all screen-transition interstitials and banners forever.` *(Max 80 characters)*
- **Status:** Active
- **Pricing:**
  - **India (Default):** `₹199.00` (Tax Inclusive)
  - **Worldwide:** Auto-convert exchange rates based on INR base price.

---

### Product 3: Unlimited Mood Boards (Single Pass)
- **Product ID:** `unlimited_mood_boards`
- **Name / Title:** `Unlimited Mood Boards` *(Max 55 characters)*
- **Description:** `Create unlimited custom thematic mood boards without the 3-board free cap.` *(Max 80 characters)*
- **Status:** Active
- **Pricing:**
  - **India (Default):** `₹49.00` (Tax Inclusive)
  - **Worldwide:** Auto-convert exchange rates based on INR base price.

---

## 3. Tax Classification & Pricing Regulations

### A. India GST Compliance
- **Tax Category:** Digital Goods / Electronically Supplied Services (ESS).
- **GST Rate:** **18%** (Standard rate applied by Google Play in India).
- **Price Inclusive Policy:** Google Play prices displayed in India (`₹199`, `₹49`) are **tax-inclusive** by default. When a user pays ₹199:
  - GST component is ~₹30.36.
  - Net base price is ~₹168.64.
  - Google Play service fee applies to the net amount.

### B. Google Play Service Fee Tier
- Under Google’s 15% tier (for the first $1M USD of developer earnings each year), Google deducts 15% after local taxes.

---

## 4. Step-by-Step Configuration in Google Play Console

### Step 1: Open In-App Products
1. Log in to the [Google Play Console](https://play.google.com/console).
2. Select the **Meme Capsule** app.
3. In the left navigation menu, expand **Monetize with Play** > click **In-app products**.

### Step 2: Create or Update Products
1. Click **Create product** in the upper right.
2. Enter the **Product ID** exactly as listed (`remove_ads_forever`, `unlimited_mood_boards`, or `meme_capsule_pro`).
   > [!IMPORTANT]
   > Product IDs are case-sensitive and must strictly match the code constants in `src/monetization/products.ts`.
3. Fill in the **Name** and **Description** from Section 2 above.
4. Under **Price**, click **Set price**:
   - Set the default country (India) price to `₹199` (or `₹49`).
   - Click **Update exchange rates** to automatically calculate international pricing (USD, EUR, GBP, etc.).
   - Click **Apply**.
5. Save and click **Activate**.

### Step 3: Setup License Testing (Zero-Cost QA on Physical Devices)
To test in-app purchases on physical phones without spending real money:
1. In Google Play Console, go to **Setup** > **License testing**.
2. Add your Google account email (`pratham...` or testing accounts) to the **License testers** list.
3. Set **License response** to `RESPOND_NORMALLY`.
4. Ensure your test track (Internal Testing, Closed Testing, or Production) has your tester email in the testers list.
5. On your physical phone, when purchasing through Google Play, the Play billing sheet will display `Test Card, always approves` instead of charging your real UPI/card.

### Step 4: Merchant Account & Payout Setup
1. Go to **Settings** > **Developer account** > **Payment settings**.
2. Link your Google Payments Merchant profile with your legal entity / PAN / GSTIN (if applicable) and bank account IFSC for monthly disbursements.

---

## 5. Analytics & Telemetry Configuration (Phase 1)

Meme Capsule features an offline-first, privacy-compliant behavioral analytics pipeline supporting Android native and web hybrid delivery.

### A. Backend Endpoint & Authentication
- **Endpoint:** `https://meme-capsule-eww.pages.dev/api/analytics/events`
- **Header:** `X-Analytics-App-Token: <token>`
- **Content-Type:** `application/json`

> [!CAUTION]
> **Client Credential Classification:**
> Any static token embedded within an Android APK or frontend JavaScript bundle is extractable by client reverse engineering (decompilation or network inspection). **The client token must NEVER be treated as a secret or proof of app authenticity.** It serves exclusively as temporary coarse abuse throttling until hardware-backed attestation (Google Play Integrity API) is integrated.

### B. Configuring the Analytics Token
Tokens must NEVER be committed to source control or exposed in frontend web bundles.
1. **CI/CD & Android Release Builds (Environment Variable):**
   ```bash
   export ANALYTICS_APP_TOKEN="your_actual_token_value"
   ```
   Or locally in untracked `android/local.properties`:
   ```properties
   ANALYTICS_APP_TOKEN=your_actual_token_value
   ```
2. **Web Bundle Security:**
   - Production web bundles do NOT use `VITE_ANALYTICS_APP_TOKEN` or embed any client token.
   - Browser analytics remains disabled on non-native web runtimes without configured credentials, preventing accidental token leakage or client spoofing.

### C. Build Enforcement & Release Guardrails
- **Strict Release Build Enforcement:** Gradle release tasks (`assembleRelease`, `bundleRelease`) strictly require `ANALYTICS_APP_TOKEN` to be present and non-placeholder. If unset or a placeholder string (`placeholder`, `your_production_token`), release tasks immediately fail with `RELEASE BUILD SECURITY ERROR`.
- **No Release Bypass:** The `ALLOW_EMPTY_ANALYTICS_TOKEN` flag is strictly forbidden and ignored on release packaging tasks (`assembleRelease`, `bundleRelease`). It cannot weaken release artifacts.
- **Git Exclusions:** `analytics.properties`, `*.local.properties`, and `.env*.local` are strictly ignored by `.gitignore`.

### D. Authentication Abstraction (`AnalyticsAuthProvider`)
- **Android Native:** `AnalyticsAuthProvider` interface (`com.meme.capsule.analytics.auth`) with `StaticTokenAuthProvider` (active) and `PlayIntegrityAuthProvider` (future attestation stub).
- **Attestation Stub Status:** `PlayIntegrityAuthProvider` is explicitly marked unsupported and throws `UnsupportedOperationException` until backend verification is deployed. It is never claimed as active and never silently falls back to static tokens in release builds.
- **Frontend Web:** `AnalyticsAuthProvider` interface (`src/analytics/analyticsAuth.ts`) with `StaticTokenAuthProvider` and `ServerIssuedAuthProvider` stubs.
- **Graceful 401 Handling:** When HTTP 401 is received, `onAuthFailure()` disables subsequent uploads to prevent retry spam and logs a sanitized error.

### E. Privacy & Zero PII Guardrails
- **Zero PII:** Only random UUID install identifier converted to 64-char lowercase SHA-256 (`user_hash`). No email, phone, IMEI, MAC, GPS, or device files.
- **Explicit Consent:** Controlled via Privacy Consent Modal on first launch and Settings Tab 3 (Privacy & Data). Denied consent strictly halts event creation and transmission.
- **Offline SQLite Queue:** `meme_capsule_analytics.db` with 1,000 max capacity (FIFO eviction) and 200 max batch size.
- **Debug-Only Analytics Inspector:** Gated behind `import.meta.env.DEV` in Settings Tab 3. Displays only queue count, timestamps, counters, and sanitized errors. Completely stripped in production release builds.

