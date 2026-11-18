import * as React from 'react';
import { Text, Button, Img, Row, Column, Section } from '@react-email/components';
import { EmailLayout, bodyTextStyle, buttonStyle } from './Layout';
import { buildDefaultShareInviteMessage } from '../defaultMessages';
import { STEPS } from '../../share/campaignContent';

// "Your Profile. Your Taaruf." campaign email, sent by an admin one user at a time.
// Deliberately slim so it is less likely to be filed under Gmail's Promotions tab:
// one header (logo + name left, headline centred), a short editable intro, the three
// steps, two side-by-side buttons (the only two links), two short safety lines, an
// invitation to reply, and Instagram + website as plain text. The old-way-vs-new-way
// picture and the long safety list live on the public My Taaruf Card page instead.
//
// Email-safe: solid colours, table-based Row/Column, and a PNG logo (many email apps
// block SVG and ignore CSS patterns and gradients).
const SITE = 'https://bohrataaruf.com';
const serif = 'Georgia, serif';

export function ShareInviteEmail({
  name, message, pageUrl, shareUrl,
}: {
  name: string;
  message?: string;
  pageUrl: string;
  shareUrl: string;
}) {
  const bodyText = message?.trim() || buildDefaultShareInviteMessage();
  // Blank-line-separated paragraphs render as separate <Text> blocks, because one
  // block with embedded newlines collapses to a single line in most email apps.
  const paragraphs = bodyText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const header = (
    <Section style={{ backgroundColor: '#3F2A16', padding: '24px 20px' }}>
      <Row>
        <Column style={{ width: '100px', verticalAlign: 'middle' }}>
          <Img src={`${SITE}/email/logo.png`} alt="Bohra Taaruf" width="44" height="58" />
          <Text style={{ color: '#FFFFFC', fontFamily: serif, fontSize: '14px', margin: '6px 0 0' }}>Bohra Taaruf</Text>
        </Column>
        <Column style={{ verticalAlign: 'middle', textAlign: 'center' as const }}>
          <Text style={{ color: '#FFFFFC', fontFamily: serif, fontSize: '26px', lineHeight: 1.15, margin: 0, textAlign: 'center' as const }}>
            Your Profile.<br />Your Taaruf.
          </Text>
        </Column>
      </Row>
    </Section>
  );

  return (
    <EmailLayout previewText="Your Profile. Your Taaruf." header={header} maxWidth={600}>
      <Text style={{ ...bodyTextStyle, fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#8C6A3F', fontWeight: 700, margin: '0 0 14px' }}>
        Bohra Taaruf brings you something new
      </Text>
      <Text style={bodyTextStyle}>Assalamu Alaikum {name},</Text>
      {paragraphs.map((p, i) => (
        <Text key={i} style={{ ...bodyTextStyle, fontSize: '15px', margin: '0 0 12px' }}>{p}</Text>
      ))}

      {/* Steps, above the buttons */}
      <Section style={{ marginTop: '18px' }}>
        {STEPS.map((s, i) => (
          <Text key={s.title} style={{ ...bodyTextStyle, margin: '0 0 10px' }}>
            <strong>{i + 1}. {s.title}.</strong> {s.text}
          </Text>
        ))}
      </Section>

      {/* Two buttons, side by side, centred */}
      <Section style={{ marginTop: '10px' }}>
        <Row>
          <Column align="right" style={{ width: '50%', paddingRight: '6px' }}>
            <Button href={pageUrl} style={{ ...buttonStyle, marginTop: 0, padding: '11px 16px', fontSize: '13px', whiteSpace: 'nowrap' as const, textAlign: 'center' as const }}>See how it works</Button>
          </Column>
          <Column align="left" style={{ width: '50%', paddingLeft: '6px' }}>
            <Button href={shareUrl} style={{ ...buttonStyle, marginTop: 0, backgroundColor: '#FFFFFC', color: '#8C6A3F', border: '1.5px solid #8C6A3F', padding: '9.5px 20px', fontSize: '13px', whiteSpace: 'nowrap' as const, textAlign: 'center' as const }}>Share now</Button>
          </Column>
        </Row>
      </Section>

      <Text style={{ ...bodyTextStyle, fontSize: '12px', color: '#6B6558', textAlign: 'center' as const, margin: '12px 0 0' }}>
        &quot;Share now&quot; asks you to log in first, then opens your share settings.
      </Text>

      {/* Two short safety lines (the full list is on the web page) */}
      <Section style={{ marginTop: '26px', backgroundColor: '#FBF1D3', borderRadius: '12px', padding: '14px 18px' }}>
        <Text style={{ ...bodyTextStyle, fontSize: '13px', color: '#5B4308', margin: '0 0 6px' }}>
          Always trust links that start with bohrataaruf.com.
        </Text>
        <Text style={{ ...bodyTextStyle, fontSize: '13px', color: '#5B4308', margin: 0 }}>
          Bohra Taaruf is always free and never charges money for any feature.
        </Text>
      </Section>

      <Text style={{ ...bodyTextStyle, margin: '22px 0 0' }}>
        Have a question? Just reply to this email and we will help.
      </Text>

      {/* Plain text, not links: fewer links keeps the email out of the Promotions tab */}
      <Section style={{ marginTop: '22px', borderTop: '1px solid #E5E0D8', paddingTop: '16px' }}>
        <Text style={{ ...bodyTextStyle, fontSize: '13px', color: '#6B6558', margin: 0 }}>
          Bohra Taaruf is awaiting Raza Mubarak. Follow us on Instagram: @bohrataaruf
        </Text>
      </Section>
    </EmailLayout>
  );
}
