

## Plan: Add MTN MoMo Payment Gateway + Fix Carbon Score

### Problem 1: Carbon Score Not Working
The `CarbonScore.tsx` page sends `{ message: "...", language: "en" }` to the `ai-assistant` edge function, but that function expects `{ messages: [...], preferredLanguage: "en" }` (an array of chat messages in OpenAI format). The request silently fails because `messages` is undefined.

### Problem 2: MTN MoMo Payment Gateway
The uploaded files show an MTN Mobile Money Collection API integration (currently Node.js/CommonJS with the deprecated `request` library). This needs to be adapted as a Deno edge function and added as a payment option alongside Visa, PayPal, etc.

---

### Changes

#### 1. Fix Carbon Score (CarbonScore.tsx)
- Change the `supabase.functions.invoke('ai-assistant')` call to send the correct payload format:
  - `messages: [{ role: 'user', content: '...' }]` instead of `message: '...'`
  - `preferredLanguage: 'en'` instead of `language: 'en'`
- Also import from `@/integrations/supabase/client` instead of `@/lib/supabase` for consistency

#### 2. Create MTN MoMo Edge Function (`supabase/functions/momo-payment/index.ts`)
- Rewrite the uploaded MoMo SDK as a Deno edge function using `fetch` (no `request` library)
- Flow: get OAuth token → create requestToPay → poll transaction status → return result
- Use environment secrets: `MOMO_USER_ID`, `MOMO_API_KEY`, `MOMO_PRIMARY_KEY`, `MOMO_CALLBACK_HOST`, `MOMO_ENVIRONMENT` (sandbox/production)
- Accept: `amount`, `currency`, `phone_number`, `payer_message`, `payee_note`
- The function will use the MTN MoMo Collection API v1.0

#### 3. Add MoMo to Payment Options (PaymentLogos.tsx)
- Add an "MTN MoMo" payment logo button to the grid
- When clicked, show a dialog asking for the user's phone number (MSISDN)
- On confirm, call the `momo-payment` edge function directly (bypassing Dodo checkout since MoMo is a separate gateway)

#### 4. Update useUsageLimits.tsx
- Add a `openMoMoPayment` function (or extend `openUpgrade`) to handle the MoMo flow: call the edge function, poll for status, activate subscription on success

#### 5. Request Secrets
- Before proceeding, will need the user to provide: `MOMO_USER_ID`, `MOMO_API_KEY`, `MOMO_PRIMARY_KEY`, `MOMO_CALLBACK_HOST`
- Will ask if they want sandbox or production mode

### Technical Notes
- The MoMo API uses basic auth (userId:apiKey → base64) for token generation
- Token endpoint: `https://{env}.momodeveloper.mtn.com/collection/token/`
- RequestToPay endpoint: `https://{env}.momodeveloper.mtn.com/collection/v1_0/requesttopay`
- Transaction status: GET same endpoint with `/{referenceId}`
- `{env}` = `sandbox` for testing, `proxy` for production

