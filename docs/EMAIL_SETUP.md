# Email Setup Guide

## Overview

Traza uses **Resend** for transactional emails. This guide covers setup, domain verification, and scaling email sending.

---

## Quick Start

### 1. Get Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Create API key: [resend.com/api-keys](https://resend.com/api-keys)
3. Add to `.env`:
   ```bash
   RESEND_API_KEY=re_your_api_key_here
   EMAIL_FROM=onboarding@resend.dev  # Free tier default
   ```

### 2. Test Email Setup

```bash
cd /Volumes/WORKHORSE\ GS/vibecoding/firmas
tsx scripts/check-email-quota.ts
```

**Expected output:**
```
✅ API Key is valid
✅ Test email sent successfully!
```

---

## Email Types Sent by Traza

| Email Type | Trigger | Recipients |
|---|---|---|
| **Signature Request** | Document sent for signing | Signers |
| **Document Completed** | All signatures collected | Document owner |
| **Reminder** | Manual reminder sent | Pending signers |
| **Expiration Notice** | Document expires | Document owner |
| **Signature Declined** | Signer declines | Document owner |
| **Org Invitation** | User invited to org | Invitee |
| **Delegation Notice** | Signer delegates | Document owner |

**Files:** `/apps/api/src/emails/`

---

## Domain Verification (REQUIRED for Production)

### Why Verify Your Domain?

- **Higher deliverability** (99% inbox rate)
- **Custom sender address** (`sign@yourdomain.com`)
- **Professional branding**
- **Avoid spam filters**

### Steps

1. **Add Domain in Resend**
   - Visit [resend.com/domains](https://resend.com/domains)
   - Click "Add Domain"
   - Enter: `yourdomain.com`

2. **Add DNS Records**

   Copy the records provided by Resend and add to your DNS provider (Cloudflare, Namecheap, etc.):

   ```txt
   # SPF Record (Required)
   Type: TXT
   Name: @
   Value: v=spf1 include:resend.com ~all

   # DKIM Record (Required)
   Type: TXT
   Name: resend._domainkey
   Value: v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4... (from Resend)

   # DMARC Record (Recommended)
   Type: TXT
   Name: _dmarc
   Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
   ```

3. **Wait for DNS Propagation** (10-30 minutes)

4. **Verify in Resend**
   - Click "Verify" button
   - Should show "Verified ✓"

5. **Update `.env`**
   ```bash
   EMAIL_FROM=sign@yourdomain.com
   ```

### Check DNS Propagation

```bash
# Check SPF
dig TXT yourdomain.com +short

# Check DKIM
dig TXT resend._domainkey.yourdomain.com +short

# Check DMARC
dig TXT _dmarc.yourdomain.com +short
```

---

## Scaling Email Sending

### Free Tier Limits

- **100 emails/day**
- **3,000 emails/month**
- Good for: Testing, small teams (1-5 users)

**What happens when you hit limits:**
- Emails are rejected by Resend API
- Error logged in console
- Users don't get notifications ⚠️

### Upgrade Options

#### Pro Plan - $20/month
- **50,000 emails/month** (~1,667/day)
- Good for: Small businesses, 10-100 documents/day
- **Best for most users** ✅

#### Business Plan - $100/month
- **500,000 emails/month** (~16,667/day)
- Good for: Medium businesses, 100-1000 documents/day

#### Enterprise - Custom Pricing
- **Unlimited emails**
- Dedicated IP addresses
- Priority support
- Good for: Large enterprises, 1000+ documents/day

### Calculate Your Needs

**Emails per document:**
- 1 signature request per signer
- 1 completion notice to owner
- ~2-3 emails per document average

**Example:** 100 documents/day with 2 signers each:
- 100 docs × 2 signers = 200 signature requests
- 100 completion notices
- **Total: ~300 emails/day**
- **Recommended: Pro plan** (1,667/day limit)

---

## Handling Email Failures Gracefully

### Current Implementation

The email service logs failures but doesn't retry:

```typescript
// In apps/api/src/services/email.service.ts
if (error) {
  console.error(`[email] Failed to send to ${to}:`, error);
  throw new Error(`Email delivery failed: ${error.message}`);
}
```

### Improvement: Add Email Queue (Optional)

For high-volume production use, implement email queuing:

#### Option 1: Simple Database Queue

```typescript
// Store failed emails in database
await prisma.emailQueue.create({
  data: {
    to,
    subject,
    html,
    attempts: 0,
    status: 'PENDING',
  },
});

// Cron job retries every 5 minutes
// apps/api/src/jobs/email-retry.ts
```

#### Option 2: Bull/BullMQ Queue (Recommended)

```bash
npm install bull redis
```

```typescript
import Bull from 'bull';

const emailQueue = new Bull('email', {
  redis: process.env.REDIS_URL,
});

// Add to queue instead of sending directly
emailQueue.add({ to, subject, html }, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
});

// Process queue
emailQueue.process(async (job) => {
  await sendEmail(job.data.to, job.data.subject, job.data.html);
});
```

**Benefits:**
- Automatic retries on failure
- Rate limiting built-in
- Better monitoring
- Don't lose emails on server restart

---

## Rate Limiting Best Practices

### Current Rate Limit

Resend free tier: **100 emails/day**

### Strategies to Stay Under Limit

1. **Batch Signature Requests**
   - Send daily digest instead of instant notifications
   - Combine multiple pending documents per signer

2. **Smart Reminders**
   - Don't auto-remind every day
   - Remind only 3 days before expiration
   - Max 1 reminder per week per signer

3. **Disable Low-Value Emails**
   - Skip completion emails for single-signer docs
   - Only send decline notices for multi-party docs

4. **Upgrade to Pro** ($20/mo)
   - Simplest solution
   - 50x more emails (50k/month)

---

## Monitoring Email Health

### Metrics to Track

1. **Delivery Rate**
   - Check in [Resend Dashboard](https://resend.com/overview)
   - Should be > 95%

2. **Bounce Rate**
   - Hard bounces: Invalid email addresses
   - Soft bounces: Temporary failures
   - Should be < 5%

3. **Spam Complaints**
   - Users marking as spam
   - Should be < 0.1%

4. **Open Rate** (if tracking enabled)
   - Signature requests: 70-90%
   - Reminders: 50-70%

### Enable Email Analytics

Add tracking pixel (optional):

```typescript
// In email templates
<img src="https://api.traza.com/track-open/${emailId}" width="1" height="1" />
```

---

## Troubleshooting

### "RESEND_API_KEY not set"

**Error:**
```
[email] RESEND_API_KEY not set — skipping email
```

**Fix:**
1. Check `/apps/api/.env` has `RESEND_API_KEY=re_...`
2. Restart API server: `npm run dev`

### "Email delivery failed: Rate limit exceeded"

**Error:**
```
Email delivery failed: You have exceeded your daily email limit
```

**Fix:**
1. Wait until next day (limit resets at midnight UTC)
2. Upgrade to Pro plan at [resend.com/settings/billing](https://resend.com/settings/billing)

### "Invalid sender email"

**Error:**
```
Email delivery failed: Invalid from address
```

**Fix:**
1. Verify domain in Resend
2. Update `EMAIL_FROM` in `.env` to verified domain
3. Use `onboarding@resend.dev` for testing (free tier)

### Emails Going to Spam

**Causes:**
- Domain not verified
- Missing SPF/DKIM records
- Poor sender reputation

**Fix:**
1. Verify domain (see above)
2. Add SPF/DKIM/DMARC records
3. Avoid spam trigger words in subject/content
4. Warm up new domain (send gradually increasing volume)

---

## Testing Emails

### Test with Resend Test Address

```bash
# In scripts/check-email-quota.ts
to: 'delivered@resend.dev'  # Always succeeds
```

### Test with Real Email

```bash
# Update script and run
tsx scripts/check-email-quota.ts
```

### Preview Emails Locally

```bash
cd apps/api
npm run email:preview
# Opens React Email preview at http://localhost:3001
```

---

## Production Checklist

Before launching:

- [ ] Resend API key added to production `.env`
- [ ] Domain verified in Resend
- [ ] SPF record added to DNS
- [ ] DKIM record added to DNS
- [ ] DMARC record added to DNS (optional but recommended)
- [ ] `EMAIL_FROM` set to verified domain
- [ ] Upgraded to Pro plan (if sending > 100 emails/day)
- [ ] Tested email delivery to real addresses
- [ ] Monitoring setup for bounce/spam rates
- [ ] Email queue implemented (if high volume)

---

## Cost Optimization

### Current Costs (Free Tier)

- **Resend:** $0/month (3k emails)
- **Total:** $0/month

### Recommended Production Setup

- **Resend Pro:** $20/month (50k emails)
- **Total:** $20/month

**Scales to:**
- ~1,666 documents/day (assuming 2 signers + 1 completion email)
- ~50,000 documents/month

### When to Upgrade to Business ($100/mo)

- Sending > 1,500 documents/day
- Need dedicated IP for better deliverability
- Enterprise customers requiring SLA

---

## Alternative Email Providers

If you outgrow Resend or need different features:

| Provider | Free Tier | Pricing | Notes |
|---|---|---|---|
| **Resend** | 3k/mo | $20/mo (50k) | Best for developers, React Email support |
| **SendGrid** | 100/day | $20/mo (50k) | More mature, better analytics |
| **Postmark** | None | $15/mo (10k) | Best deliverability, transactional only |
| **Amazon SES** | 62k/mo | $0.10/1k | Cheapest, requires AWS setup |
| **Mailgun** | 5k/mo | $35/mo (50k) | Good for high volume |

**Recommendation:** Stick with Resend unless you have specific needs.

---

## Support

- **Resend Docs:** [resend.com/docs](https://resend.com/docs)
- **Resend Support:** support@resend.com
- **Traza Email Code:** `/apps/api/src/services/email.service.ts`

---

**Last Updated:** 2026-03-05
