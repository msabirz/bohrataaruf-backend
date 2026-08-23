import * as React from 'react';
import { Text, Button } from '@react-email/components';
import {
  EmailLayout, headingStyle, bodyTextStyle, buttonStyle,
} from './Layout';

// Privacy-first, matching the app's alias-until-mutual-match model — no
// name, photo, or identifying detail ever goes in this email, only a
// notification that something happened. Details stay behind login.
export function ReceivedInterestEmail({ interestsUrl }: { interestsUrl: string }) {
  return (
    <EmailLayout previewText="Someone is interested in you on Bohra Taaruf">
      <Text style={headingStyle}>Someone&apos;s interested in you</Text>
      <Text style={bodyTextStyle}>
        A fellow member has expressed interest in your profile. Open the app to see who and respond.
      </Text>
      <Button href={interestsUrl} style={buttonStyle}>View interest</Button>
    </EmailLayout>
  );
}
