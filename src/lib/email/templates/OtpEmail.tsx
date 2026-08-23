import * as React from 'react';
import { Text, Section } from '@react-email/components';
import { EmailLayout, headingStyle, bodyTextStyle } from './Layout';

export function OtpEmail({ code }: { code: string }) {
  return (
    <EmailLayout previewText="Your Bohra Taaruf password reset code">
      <Text style={headingStyle}>Reset your password</Text>
      <Text style={bodyTextStyle}>
        Use this code to reset your password. It expires in 10 minutes.
      </Text>
      <Section
        style={{
          backgroundColor: '#EADFCB',
          borderRadius: '12px',
          padding: '18px',
          textAlign: 'center' as const,
          margin: '20px 0',
        }}
      >
        <Text
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '32px',
            fontWeight: 500,
            letterSpacing: '6px',
            color: '#211F1A',
            margin: 0,
          }}
        >
          {code}
        </Text>
      </Section>
      <Text style={{ ...bodyTextStyle, fontSize: '12px', color: '#6B6558' }}>
        Didn&apos;t request this? You can safely ignore this email — your password won&apos;t be
        changed without this code.
      </Text>
    </EmailLayout>
  );
}
