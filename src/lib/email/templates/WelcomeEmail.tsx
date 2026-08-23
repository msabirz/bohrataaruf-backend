import * as React from 'react';
import { Text, Button } from '@react-email/components';
import {
  EmailLayout, headingStyle, bodyTextStyle, buttonStyle,
} from './Layout';

export function WelcomeEmail({ name, profileUrl }: { name: string; profileUrl: string }) {
  return (
    <EmailLayout previewText="Welcome to Bohra Taaruf">
      <Text style={headingStyle}>Welcome, {name}.</Text>
      <Text style={bodyTextStyle}>
        Your account is ready. Bohra Taaruf is free, private, and built on trust — no subscriptions,
        no paywalls, ever.
      </Text>
      <Text style={bodyTextStyle}>
        Complete your profile and submit ITS verification now, so you&apos;re ready the moment
        discovery opens.
      </Text>
      <Button href={profileUrl} style={buttonStyle}>Complete your profile</Button>
    </EmailLayout>
  );
}
