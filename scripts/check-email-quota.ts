#!/usr/bin/env tsx
/**
 * Check Resend email quota and usage
 *
 * Usage: tsx scripts/check-email-quota.ts
 */

import { Resend } from 'resend';
import 'dotenv/config';

async function checkQuota() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error('❌ RESEND_API_KEY not set in .env');
    process.exit(1);
  }

  const resend = new Resend(apiKey);

  try {
    // Check API key info (includes quota)
    const response = await resend.apiKeys.list();

    console.log('📧 Resend Email Configuration\n');
    console.log(`API Key: ${apiKey.substring(0, 10)}...`);
    console.log(`Email From: ${process.env.EMAIL_FROM || 'Not set'}\n`);

    if (response.data && response.data.length > 0) {
      console.log('✅ API Key is valid\n');
      console.log('To check your quota and usage:');
      console.log('1. Visit: https://resend.com/overview');
      console.log('2. View current month usage and limits\n');
    }

    // Test email sending (optional - comment out if you don't want to send)
    console.log('Testing email send...');
    const testResult = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: 'delivered@resend.dev', // Resend test address
      subject: 'Traza Email Test',
      html: '<p>This is a test email from Traza e-signature platform.</p>',
    });

    if (testResult.error) {
      console.error('❌ Test email failed:', testResult.error);
    } else {
      console.log('✅ Test email sent successfully!');
      console.log(`Email ID: ${testResult.data?.id}`);
    }

  } catch (error) {
    console.error('❌ Error checking quota:', error);
    process.exit(1);
  }
}

checkQuota();
