# Security Documentation

## Overview

This document outlines the security measures implemented in the Traza e-signature platform and provides guidelines for maintaining security.

## Recent Security Fixes (2026-03-05)

### Critical Fixes Implemented

1. **Signer Delegation Security** ✅
   - Added email format validation
   - Prevent delegation to same email
   - Notify document owner when delegation occurs
   - Improved audit logging for delegations
   - **File:** `apps/api/src/services/signature.service.ts:613-688`

2. **Access Code Bypass Prevention** ✅
   - Removed automatic bypass when access code is empty
   - Implemented constant-time comparison to prevent timing attacks
   - Added validation that code is actually required
   - **File:** `apps/api/src/services/signature.service.ts:690-711`

3. **Field Value Validation** ✅
   - Validate field IDs belong to the document being signed
   - Validate fields belong to the correct signer
   - Prevent cross-document field injection attacks
   - **File:** `apps/api/src/services/signature.service.ts:274-305`

4. **API Key Rate Limiting** ✅
   - Implemented in-memory rate limiter (10 attempts per 15 minutes)
   - Automatic cleanup of old entries
   - Clear attempts on successful validation
   - **File:** `apps/api/src/services/auth.service.ts:232-301`

5. **Refresh Token Reuse Detection** ✅
   - Detects when previously used tokens are reused (sign of theft)
   - Revokes ALL user tokens on detected reuse
   - Logs security events for monitoring
   - **File:** `apps/api/src/services/auth.service.ts:134-170`

6. **Content Security Policy Improvements** ✅
   - Restricted image sources from wildcard `https:` to specific domains
   - Added upgrade-insecure-requests in production
   - Supports blob: and data: URIs for signature images
   - **File:** `apps/api/src/app.ts:36-58`

7. **Environment Variable Security** ✅
   - Updated `.env.example` with security notes
   - Added instructions for generating strong secrets
   - Documented minimum requirements for production
   - **File:** `apps/api/.env.example`

## Security Best Practices

### Environment Variables

**CRITICAL: Never commit `.env` files to version control!**

The `.gitignore` file is configured to exclude:
- `.env`
- `.env.local`
- `.env.production`

#### Production Secrets Requirements

1. **JWT Secrets** (3 required)
   - `JWT_SECRET`: Access token signing (min 32 chars)
   - `JWT_REFRESH_SECRET`: Refresh token signing (min 32 chars)
   - `SIGNING_TOKEN_SECRET`: Document signing links (min 32 chars)
   - Must be DIFFERENT for each type
   - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

2. **Database Credentials**
   - Use strong, unique passwords (16+ chars)
   - Restrict network access to database
   - Enable SSL/TLS for connections
   - Regular password rotation (every 90 days)

3. **S3/Storage Credentials**
   - **NEVER use default credentials** (`minioadmin/minioadmin`)
   - Generate strong access keys (20+ chars)
   - Rotate regularly
   - Use IAM roles when possible (AWS)

4. **Blockchain Private Key**
   - Store in secret manager (AWS Secrets Manager, HashiCorp Vault)
   - DO NOT store in `.env` in production
   - Use environment injection from secret manager
   - Restrict access to secret manager

### Authentication & Authorization

#### Password Security
- Bcrypt with 12 rounds (industry standard)
- Account lockout after 5 failed attempts (15 min)
- **File:** `apps/api/src/config/auth.ts`

#### Token Security
- Access tokens: 15 minute expiry
- Refresh tokens: 7 day expiry
- Automatic rotation on refresh
- Token reuse detection (revokes all tokens)

#### API Keys
- SHA-256 hashed before storage
- Rate limited (10 attempts per 15 min)
- Format: `traza_sk_` + 64 random characters

### Rate Limiting

Current limits:
- **General API**: 100 requests/min per IP
- **Auth endpoints**: 5 requests/min per IP
- **File uploads**: 5 requests/min per IP
- **Access codes**: 10 attempts per 15 min
- **API key validation**: 10 attempts per 15 min

**Files:**
- `apps/api/src/middleware/rateLimit.middleware.ts`
- `apps/api/src/services/auth.service.ts`

### Input Validation

1. **File Uploads**
   - Magic byte validation (prevents MIME spoofing)
   - 25MB size limit
   - Allowed types: PDF, DOCX, TXT
   - **File:** `apps/api/src/utils/fileValidation.ts`

2. **Email Validation**
   - RFC-compliant regex
   - Normalized to lowercase
   - No injection characters allowed

3. **XSS Prevention**
   - Input sanitization middleware
   - Strips HTML tags
   - Removes `javascript:` URLs
   - **File:** `apps/api/src/middleware/sanitize.middleware.ts`

### Document & Signing Security

#### Access Control
- Document ownership verification on all operations
- Signature status validation (prevents re-signing)
- Sequential signing enforcement
- Token expiration checks

#### Field Security
- Field IDs validated against document
- Signer email validated against field assignment
- Prevents cross-document field injection

#### Delegation Security
- Email validation required
- Cannot delegate to same email
- Document owner notified of delegations
- Full audit trail

#### Access Codes
- Optional two-factor authentication for signers
- Constant-time comparison (timing attack prevention)
- Required if set (no bypass)

### Blockchain Anchoring

- Uses Polygon (Amoy testnet in dev, mainnet in prod)
- SHA-256 document hashes
- Immutable proof of signature
- **File:** `apps/api/src/services/blockchain.service.ts`

### Monitoring & Logging

#### Audit Logs
All critical events are logged:
- Document created, sent, signed, declined, voided
- Signature delegations
- Access code verifications
- Blockchain anchoring

#### Security Events
Logged but not yet monitored (TODO):
- Token reuse detection
- API key brute force attempts
- Account lockouts
- Failed access code attempts

**Recommendation:** Integrate with SIEM or security monitoring service.

## Security Checklist for Production Deployment

### Pre-Deployment

- [ ] Rotate ALL secrets from development
- [ ] Generate strong JWT secrets (32+ chars each)
- [ ] Change S3 credentials from `minioadmin`
- [ ] Set strong database password
- [ ] Store blockchain private key in secret manager
- [ ] Configure HTTPS/TLS certificates
- [ ] Enable HSTS headers
- [ ] Review CORS allowed origins
- [ ] Set `NODE_ENV=production`
- [ ] Disable debug logging (`LOG_LEVEL=info`)

### Post-Deployment

- [ ] Verify `.env` is NOT in git history
- [ ] Test rate limiting on all endpoints
- [ ] Verify HTTPS redirects work
- [ ] Test CSP headers don't block legitimate resources
- [ ] Verify token reuse detection works
- [ ] Test account lockout mechanism
- [ ] Verify blockchain transactions work
- [ ] Set up monitoring alerts for:
  - Token reuse events
  - Account lockouts
  - Failed API key attempts
  - High rate limit hits

### Regular Maintenance

- [ ] Rotate secrets every 90 days
- [ ] Review audit logs weekly
- [ ] Monitor for security vulnerabilities in dependencies (`npm audit`)
- [ ] Update dependencies monthly
- [ ] Review rate limit thresholds quarterly
- [ ] Penetration testing annually

## Vulnerability Reporting

If you discover a security vulnerability, please email: [security@traza.dev](mailto:security@traza.dev)

**DO NOT** create public GitHub issues for security vulnerabilities.

We will respond within 48 hours and provide updates as we investigate.

## Security Headers Reference

Current headers (see `apps/api/src/app.ts`):

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: [S3_ENDPOINT] *.amazonaws.com;
  connect-src 'self' [APP_URL];
  font-src 'self';
  object-src 'none';
  frame-src 'none';
  upgrade-insecure-requests (production only)

Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

## Known Limitations & Future Improvements

### Current Limitations

1. **API Key Rate Limiting**: Uses in-memory storage (resets on server restart)
   - **Future:** Use Redis for persistent rate limiting

2. **No Email Verification on Delegation**: Delegates don't confirm email ownership
   - **Future:** Implement email verification flow

3. **No 2FA for User Accounts**: Only access codes for signatures
   - **Future:** Add TOTP/SMS 2FA for account login

4. **Local Storage Fallback**: Development uses filesystem storage
   - **Future:** Enforce S3-only in production

5. **No Automated Secret Rotation**: Manual rotation required
   - **Future:** Integrate with AWS Secrets Manager auto-rotation

### Planned Security Enhancements

- [ ] Implement automated penetration testing (DAST)
- [ ] Add static analysis security testing (SAST)
- [ ] Implement dependency scanning in CI/CD
- [ ] Add Web Application Firewall (WAF)
- [ ] Implement DDoS protection
- [ ] Add intrusion detection system (IDS)
- [ ] Implement SOC 2 compliance controls
- [ ] Add biometric signature options
- [ ] Implement advanced user behavior analytics

## Compliance

### Current Status

- **GDPR**: Partial (audit logs, data deletion)
- **eIDAS**: Partial (blockchain anchoring, electronic signatures)
- **SOC 2**: Not compliant (requires security monitoring, access controls)
- **PCI DSS**: N/A (no payment card data storage)

### Working Towards

- Full GDPR compliance (data portability, right to erasure)
- eIDAS Advanced Electronic Signature (AES) certification
- SOC 2 Type II certification

---

**Last Updated:** 2026-03-05
**Version:** 1.0
**Author:** Traza Security Team
