import * as React from 'react';
import { Text, Button } from '@react-email/components';
import {
  EmailLayout, headingStyle, bodyTextStyle, buttonStyle,
} from './Layout';

export function ProgramSelectionEmail({
  name, programTitle, programCity, dateRange, feeAmount, programUrl,
}: {
  name: string;
  programTitle: string;
  programCity: string;
  dateRange: string;
  feeAmount: number | null;
  programUrl: string;
}) {
  return (
    <EmailLayout previewText={`You've been selected for ${programTitle}`}>
      <Text style={headingStyle}>You&apos;re in, {name.split(' ')[0]}</Text>
      <Text style={bodyTextStyle}>
        You&apos;ve been selected to attend <strong>{programTitle}</strong> in {programCity} on {dateRange}.
      </Text>
      {feeAmount ? (
        <Text style={bodyTextStyle}>
          A fee of ₹{feeAmount} applies now that you&apos;ve been selected — details on how to pay will follow separately.
        </Text>
      ) : null}
      <Text style={bodyTextStyle}>
        Reply to this email if you have any questions before the day.
      </Text>
      <Button href={programUrl} style={buttonStyle}>
        View program details
      </Button>
    </EmailLayout>
  );
}
