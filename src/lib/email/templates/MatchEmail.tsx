import * as React from 'react';
import { Text, Button } from '@react-email/components';
import {
  EmailLayout, headingStyle, bodyTextStyle, buttonStyle,
} from './Layout';

// Same privacy stance as ReceivedInterestEmail — no identifying detail in
// the email itself, even though this is the mutual-match moment. Everything
// real happens after they open the app and log in.
export function MatchEmail({ matchesUrl }: { matchesUrl: string }) {
  return (
    <EmailLayout previewText="You have a new match on Bohra Taaruf">
      <Text style={headingStyle}>You have a match</Text>
      <Text style={bodyTextStyle}>
        You and a fellow member have expressed mutual interest. Open the app to see your match.
      </Text>
      <Button href={matchesUrl} style={buttonStyle}>View your match</Button>
    </EmailLayout>
  );
}
