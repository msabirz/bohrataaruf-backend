import * as React from 'react';
import { Text, Button } from '@react-email/components';
import {
  EmailLayout, headingStyle, bodyTextStyle, buttonStyle,
} from './Layout';
import { buildDefaultPrelaunchMessage } from '../defaultMessages';

// Sent by an admin, one at a time, to acknowledge an early signup while the
// platform is still awaiting Raza Mubarak before a global launch.
//
// The ENTIRE body — including the re-upload ask, when this user's ITS
// verification is currently rejected — is one block of editable text
// (built by buildDefaultPrelaunchMessage in ../defaultMessages, the same
// function the admin panel uses to pre-fill its textarea). Only the
// greeting and the "Re-upload ITS card" button + its real link stay
// structural/fixed — everything the recipient actually reads as prose is
// editable per-send from the admin panel.
export function PreLaunchAcknowledgementEmail({
  name, message, needsReupload, rejectionReason, verificationUrl,
}: {
  name: string;
  message?: string;
  needsReupload: boolean;
  rejectionReason?: string;
  verificationUrl: string;
}) {
  const bodyText = message?.trim() || buildDefaultPrelaunchMessage(needsReupload, rejectionReason);
  // Blank-line-separated paragraphs render as separate <Text> blocks — a
  // single block with embedded newlines collapses whitespace in most email
  // clients, so a plain \n wouldn't show as a paragraph break.
  const paragraphs = bodyText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <EmailLayout previewText="An update on your Bohra Taaruf registration">
      <Text style={headingStyle}>Thank you for registering</Text>
      <Text style={bodyTextStyle}>
        Assalamu Alaikum {name},
      </Text>
      {paragraphs.map((p, i) => (
        <Text key={i} style={bodyTextStyle}>{p}</Text>
      ))}
      {needsReupload && (
        <Button href={verificationUrl} style={buttonStyle}>
          Re-upload ITS card
        </Button>
      )}
    </EmailLayout>
  );
}
