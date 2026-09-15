import * as React from 'react';
import { Text, Section } from '@react-email/components';
import {
  EmailLayout, headingStyle, bodyTextStyle,
} from './Layout';

export function ProgramPassEmail({
  name, programTitle, programCity, dateRange, venueName, passCode,
}: {
  name: string;
  programTitle: string;
  programCity: string;
  dateRange: string;
  venueName: string | null;
  passCode: string;
}) {
  return (
    <EmailLayout previewText={`Your entry pass for ${programTitle}`}>
      <Text style={headingStyle}>You&apos;re confirmed, {name.split(' ')[0]}</Text>
      <Text style={bodyTextStyle}>
        Your spot at <strong>{programTitle}</strong> in {venueName ? `${venueName}, ` : ''}{programCity} on {dateRange} is confirmed.
      </Text>
      <Section style={{
        backgroundColor: '#EADFCB', borderRadius: '12px', padding: '20px 24px', margin: '20px 0', textAlign: 'center' as const,
      }}
      >
        <Text style={{ fontFamily: 'Georgia, serif', fontSize: '11px', color: '#8C6A3F', margin: '0 0 6px', textTransform: 'uppercase' as const, letterSpacing: '1px' }}>
          Your entry pass
        </Text>
        <Text style={{ fontFamily: 'monospace', fontSize: '26px', fontWeight: 700, color: '#211F1A', margin: 0, letterSpacing: '2px' }}>
          {passCode}
        </Text>
      </Section>
      <Text style={bodyTextStyle}>
        Show this code at check-in on the day. Keep this email handy — you won&apos;t need to print anything.
      </Text>
    </EmailLayout>
  );
}
