/**
 * Transactional email helper.
 *
 * All calls are fire-and-forget — callers use:
 *   sendWelcomeEmail(...).catch(err => console.warn('[email] send failed:', err));
 *
 * This module NEVER throws to its caller. Email failures must never cause
 * the underlying business action (signup, password reset, a match) to fail
 * or roll back — same contract as src/lib/pushNotifications.ts.
 *
 * Provider is selected via EMAIL_TRANSACTIONAL_PROVIDER (currently only
 * "msg91" is implemented) so switching providers later is a config change,
 * not a code change — every call site here stays untouched.
 */
import * as React from 'react';
import { render } from '@react-email/render';
import { sendViaMsg91 } from './msg91';
import { WelcomeEmail } from './templates/WelcomeEmail';
import { OtpEmail } from './templates/OtpEmail';
import { PasswordChangedEmail } from './templates/PasswordChangedEmail';
import { VerificationResultEmail } from './templates/VerificationResultEmail';
import { ReceivedInterestEmail } from './templates/ReceivedInterestEmail';
import { MatchEmail } from './templates/MatchEmail';

const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL ?? 'http://localhost:3000';

async function dispatch(to: string, subject: string, element: React.ReactElement): Promise<void> {
  // Master kill-switch — defaults to enabled (matches how this already
  // behaves in prod today) so a missing env var never silently disables
  // live email; only an explicit "false" turns sending off entirely.
  if (process.env.EMAIL_ENABLED === 'false') {
    console.log('[email] EMAIL_ENABLED=false — skipping send:', subject, '→', to);
    return;
  }

  const provider = process.env.EMAIL_TRANSACTIONAL_PROVIDER ?? 'msg91';
  const html = await render(element);

  // Local/dev testing override — redirects every send to one fixed inbox
  // regardless of the real recipient, so testing doesn't require a pile of
  // real test email addresses. Gated on NODE_ENV as a hard safety net: even
  // if EMAIL_TEST_OVERRIDE_TO were ever accidentally left set in a
  // production environment's config, this still no-ops there and real
  // users still get their real emails.
  const overrideTo = process.env.NODE_ENV !== 'production' ? process.env.EMAIL_TEST_OVERRIDE_TO : undefined;
  const finalTo = overrideTo || to;
  const finalSubject = overrideTo ? `[TEST → ${to}] ${subject}` : subject;

  switch (provider) {
    case 'msg91':
      await sendViaMsg91({ to: finalTo, subject: finalSubject, html });
      break;
    default:
      throw new Error(`Unknown EMAIL_TRANSACTIONAL_PROVIDER: "${provider}"`);
  }
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  // Subject omits the brand name — the shared MSG91 template already
  // prefixes every subject with "Bohra Taaruf: ".
  await dispatch(to, 'Welcome — let’s get your profile ready', React.createElement(WelcomeEmail, {
    name,
    profileUrl: `${PUBLIC_APP_URL}/profile`,
  }));
}

export async function sendPasswordResetOtpEmail(to: string, code: string): Promise<void> {
  await dispatch(to, 'Your password reset code', React.createElement(OtpEmail, { code }));
}

export async function sendPasswordChangedEmail(to: string): Promise<void> {
  await dispatch(to, 'Your password was changed', React.createElement(PasswordChangedEmail, {}));
}

export async function sendVerificationResultEmail(
  to: string,
  outcome: 'approved' | 'rejected',
  reason?: string,
): Promise<void> {
  await dispatch(
    to,
    outcome === 'approved' ? 'You’re verified' : 'Your ITS verification needs another look',
    React.createElement(VerificationResultEmail, { outcome, reason, profileUrl: `${PUBLIC_APP_URL}/profile` }),
  );
}

export async function sendReceivedInterestEmail(to: string): Promise<void> {
  await dispatch(to, 'Someone is interested in you', React.createElement(ReceivedInterestEmail, {
    interestsUrl: `${PUBLIC_APP_URL}/interests`,
  }));
}

export async function sendMatchEmail(to: string): Promise<void> {
  await dispatch(to, 'You have a new match', React.createElement(MatchEmail, {
    matchesUrl: `${PUBLIC_APP_URL}/matches`,
  }));
}
