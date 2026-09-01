import * as React from 'react';
import {
  Html, Head, Body, Container, Section, Text, Hr, Img,
} from '@react-email/components';

/**
 * Shared wrapper for every transactional email — logo header, consistent
 * bronze/gold styling matching the site, and a closing footer line. Inline
 * styles throughout, not Tailwind classes — email clients strip <style>
 * tags and don't reliably support utility classes, so inline is the only
 * approach that renders consistently across Gmail/Outlook/Apple Mail/etc.
 */

const COLORS = {
  background: '#F8F5F0',
  primary: '#8C6A3F',
  accent: '#C9A96E',
  accentLight: '#EADFCB',
  text: '#222222',
  border: '#E5E0D8',
  surface: '#FFFFFC',
  muted: '#6B6558',
};

export function EmailLayout({ previewText, children }: { previewText: string; children: React.ReactNode }) {
  return (
    <Html>
      <Head>
        <title>{previewText}</title>
      </Head>
      <Body style={{ backgroundColor: COLORS.background, margin: 0, padding: '32px 16px', fontFamily: 'Georgia, serif' }}>
        <Container style={{ maxWidth: '480px', margin: '0 auto', backgroundColor: COLORS.surface, borderRadius: '16px', border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
          <Section style={{ backgroundColor: '#211F1A', padding: '36px 32px', textAlign: 'center' as const }}>
            <Img
              src="https://bohrataaruf.com/logo-light.svg"
              alt="Bohra Taaruf"
              width="72"
              height="94"
              style={{ margin: '0 auto 12px' }}
            />
            <Text style={{ color: COLORS.surface, fontSize: '22px', fontWeight: 500, margin: 0, fontFamily: 'Georgia, serif' }}>
              Bohra Taaruf
            </Text>
          </Section>

          <Section style={{ padding: '32px' }}>
            {children}
          </Section>

          <Hr style={{ borderColor: COLORS.border, margin: 0 }} />

          <Section style={{ padding: '20px 32px' }}>
            <Text style={{ fontSize: '12px', color: COLORS.muted, margin: 0, fontFamily: 'Georgia, serif', lineHeight: 1.6 }}>
              This email was sent by the Bohra Taaruf team. Free, private, and built on trust for the Dawoodi Bohra community.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const buttonStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#8C6A3F',
  color: '#FFFFFC',
  fontSize: '14px',
  fontWeight: 500,
  textDecoration: 'none',
  padding: '12px 28px',
  borderRadius: '999px',
  marginTop: '20px',
};

export const headingStyle: React.CSSProperties = {
  fontFamily: 'Georgia, serif',
  fontSize: '22px',
  fontWeight: 500,
  color: '#211F1A',
  margin: '0 0 12px',
};

export const bodyTextStyle: React.CSSProperties = {
  fontFamily: 'Georgia, serif',
  fontSize: '14px',
  color: '#222222',
  lineHeight: 1.6,
  margin: '0 0 8px',
};
