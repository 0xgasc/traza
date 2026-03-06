#!/usr/bin/env tsx
/**
 * Test document sending to diagnose 500 error
 *
 * Usage: tsx scripts/test-send.ts <documentId> <token>
 */

const API_URL = process.env.API_URL || 'http://localhost:4000';
const PRODUCTION_URL = 'https://traza-api-production.up.railway.app';

async function testSend(documentId: string, token: string, useProduction = false) {
  const baseUrl = useProduction ? PRODUCTION_URL : API_URL;

  console.log(`Testing send to: ${baseUrl}`);
  console.log(`Document ID: ${documentId}\n`);

  const payload = {
    signers: [
      {
        email: 'test1@example.com',
        name: 'Test Signer 1',
        order: 1
      },
      {
        email: 'test2@example.com',
        name: 'Test Signer 2',
        order: 2
      }
    ],
    message: 'Test message',
    expiresInDays: 7,
    emailLocale: 'en'
  };

  console.log('Payload:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\n---\n');

  try {
    const response = await fetch(`${baseUrl}/api/v1/documents/${documentId}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    console.log(`Response Status: ${response.status} ${response.statusText}`);

    const text = await response.text();

    if (response.ok) {
      console.log('\n✅ SUCCESS!\n');
      console.log(JSON.parse(text));
    } else {
      console.log('\n❌ ERROR!\n');
      try {
        const error = JSON.parse(text);
        console.log('Error details:');
        console.log(JSON.stringify(error, null, 2));
      } catch {
        console.log('Raw error response:');
        console.log(text);
      }
    }

  } catch (error: any) {
    console.error('\n💥 EXCEPTION!\n');
    console.error(error.message);
    console.error(error.stack);
  }
}

// Parse args
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: tsx scripts/test-send.ts <documentId> <token> [--production]');
  console.error('\nExample:');
  console.error('  tsx scripts/test-send.ts abc123 eyJhbGci...');
  console.error('  tsx scripts/test-send.ts abc123 eyJhbGci... --production');
  process.exit(1);
}

const documentId = args[0];
const token = args[1];
const useProduction = args.includes('--production');

testSend(documentId, token, useProduction);
