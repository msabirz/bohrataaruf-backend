import * as React from 'react';
import { Text } from '@react-email/components';
import { EmailLayout, headingStyle, bodyTextStyle } from './Layout';

export function PasswordChangedEmail() {
  return (
    <EmailLayout previewText="Your Bohra Taaruf password was changed">
      <Text style={headingStyle}>Your password was changed</Text>
      <Text style={bodyTextStyle}>
        This is a confirmation that your Bohra Taaruf password was successfully reset just now.
      </Text>
      <Text style={{ ...bodyTextStyle, fontSize: '12px', color: '#A8493A' }}>
        If this wasn&apos;t you, please contact support immediately.
      </Text>
    </EmailLayout>
  );
}
