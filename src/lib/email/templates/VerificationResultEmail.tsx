import * as React from 'react';
import { Text, Button } from '@react-email/components';
import {
  EmailLayout, headingStyle, bodyTextStyle, buttonStyle,
} from './Layout';

export function VerificationResultEmail({
  outcome, profileUrl, reason,
}: {
  outcome: 'approved' | 'rejected';
  profileUrl: string;
  reason?: string;
}) {
  const isApproved = outcome === 'approved';
  return (
    <EmailLayout previewText={isApproved ? 'Your ITS verification was approved' : 'Your ITS verification needs another look'}>
      <Text style={headingStyle}>
        {isApproved ? 'You’re verified' : 'Verification needs another look'}
      </Text>
      {isApproved ? (
        <Text style={bodyTextStyle}>
          Your ITS card has been reviewed and approved. Your verified badge is now live on your profile.
        </Text>
      ) : (
        <>
          <Text style={bodyTextStyle}>
            We weren&apos;t able to verify your ITS card this time.
            {reason ? ` ${reason}` : ' Please re-upload a clear photo of your ITS card.'}
          </Text>
        </>
      )}
      <Button href={profileUrl} style={buttonStyle}>
        {isApproved ? 'View your profile' : 'Re-upload ITS card'}
      </Button>
    </EmailLayout>
  );
}
