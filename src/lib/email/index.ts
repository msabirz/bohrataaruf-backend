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
import { PreLaunchAcknowledgementEmail } from './templates/PreLaunchAcknowledgementEmail';

const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL ?? 'http://localhost:3000';

// MSG91_FROM_EMAIL lives on a sending-only subdomain with no MX records —
// confirmed by a live test that replies there bounce. support@bohrataaruf.com
// (the apex domain) is confirmed to actually receive mail, so every send
// asks the provider to route replies there instead of the From address.
// Applies to ALL email types, not just one — a reply to an OTP or welcome
// email should land somewhere real just as much as this one does.
const REPLY_TO_EMAIL = process.env.EMAIL_REPLY_TO || 'support@bohrataaruf.com';

async function dispatch(to: string, subject: string, element: React.ReactElement, opts?: { bypassKillSwitch?: boolean }): Promise<void> {
  // Master kill-switch — defaults to enabled (matches how this already
  // behaves in prod today) so a missing env var never silently disables
  // live email; only an explicit "false" turns sending off entirely.
  //
  // bypassKillSwitch is a deliberate, narrow exception: EMAIL_ENABLED exists
  // to stop AUTOMATED system email (welcome/OTP/match/etc.) in bulk, e.g. if
  // something's misbehaving. A volunteer manually clicking "send" on one
  // named user in the admin panel is a different kind of action — already
  // one-at-a-time and confirmed — and forcing them to flip a global env var
  // (and redeploy) before every single click isn't what that switch is for.
  // Only sendPreLaunchAcknowledgementEmail passes this; every other email
  // in this file still respects EMAIL_ENABLED normally.
  if (process.env.EMAIL_ENABLED === 'false' && !opts?.bypassKillSwitch) {
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
      await sendViaMsg91({ to: finalTo, subject: finalSubject, html, replyTo: REPLY_TO_EMAIL });
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

export async function sendPreLaunchAcknowledgementEmail(
  to: string,
  name: string,
  reupload?: { reason?: string },
  message?: string,
): Promise<void> {
  await dispatch(
    to,
    'An update on your Bohra Taaruf registration',
    React.createElement(PreLaunchAcknowledgementEmail, {
      name,
      message,
      needsReupload: !!reupload,
      rejectionReason: reupload?.reason,
      verificationUrl: `${PUBLIC_APP_URL}/verification`,
    }),
    { bypassKillSwitch: true },
  );
}
