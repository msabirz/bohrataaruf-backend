import * as React from 'react';
import { Text, Button } from '@react-email/components';
import { EmailLayout, headingStyle, bodyTextStyle, buttonStyle } from './Layout';

// Sent by an admin, one user at a time, to invite someone to the "Share your
// biodata" feature. The button opens her share settings inside her normal
// logged-in account (no code or OTP): a logged-out visitor is sent to login
// first and returned to /share afterwards.
export function ShareInviteEmail({ name, shareUrl }: { name: string; shareUrl: string }) {
  return (
    <EmailLayout previewText="Share your biodata, your way">
      <Text style={headingStyle}>Share your biodata, your way</Text>
      <Text style={bodyTextStyle}>Assalamu Alaikum {name},</Text>
      <Text style={bodyTextStyle}>
        You can now choose exactly what to share about yourself, make a private link for each person, and see how many times each link was opened.
      </Text>
      {/* One block per step: a single block with line breaks collapses to one line in most email clients. */}
      <Text style={{ ...bodyTextStyle, margin: '0 0 2px' }}>1. Select the details you are happy to share.</Text>
      <Text style={{ ...bodyTextStyle, margin: '0 0 2px' }}>2. Create a link and send it on WhatsApp.</Text>
      <Text style={bodyTextStyle}>3. Watch your analytics.</Text>
      <Button href={shareUrl} style={buttonStyle}>
        Open my share settings
      </Button>
      <Text style={{ ...bodyTextStyle, marginTop: '24px', fontSize: '13px', color: '#6B6558' }}>
        Log in as usual and you will land on your share settings. Your phone number, email and ITS number are never shown on a shared page.
      </Text>
      <Text style={{ ...bodyTextStyle, fontSize: '13px', color: '#6B6558' }}>
        Bohra Taaruf is awaiting Raza Mubarak. Follow @bohrataaruf on Instagram for updates.
      </Text>
    </EmailLayout>
  );
}
