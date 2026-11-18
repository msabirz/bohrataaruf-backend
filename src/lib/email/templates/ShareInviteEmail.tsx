import * as React from 'react';
import { Text, Button, Img, Row, Column, Section, Link } from '@react-email/components';
import { EmailLayout, bodyTextStyle, buttonStyle } from './Layout';
import { buildDefaultShareInviteMessage } from '../defaultMessages';
import { SAFETY_NOTES, STEPS } from '../../share/campaignContent';

// "Your Profile. Your Taaruf." campaign email, sent by an admin one user at a
// time. Layout: one header (logo + name on the left, headline centred), a short
// editable intro, the three steps, two side-by-side buttons, a picture of the old
// way vs the new way, the safety notes, and Instagram + website links.
//
// Email-safe on purpose: solid colours, table-based Row/Column, and a PNG logo and
// picture (many email apps block SVG and ignore CSS patterns and gradients).
const SITE = 'https://bohrataaruf.com';
const INSTAGRAM = 'https://www.instagram.com/bohrataaruf';
const serif = 'Georgia, serif';

const pill: React.CSSProperties = {
  display: 'inline-block', border: '1px solid #C9A96E', borderRadius: '999px', padding: '8px 18px',
  fontFamily: serif, fontSize: '13px', fontWeight: 600, color: '#6E4520', textDecoration: 'none', margin: '4px',
};

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

      {/* Old way vs new way: a picture */}
      <Section style={{ marginTop: '32px', textAlign: 'center' as const }}>
        <Text style={{ fontFamily: serif, fontSize: '18px', color: '#211F1A', margin: '0 0 12px', textAlign: 'center' as const }}>The old way, and the new way</Text>
        <Img
          src={`${SITE}/email/old-vs-new.png`}
          alt="The old way: a PDF forwarded to people you do not know, with no control. The new way: one private card that goes only to the person you chose."
          width="340"
          style={{ margin: '0 auto', display: 'block', width: '340px', maxWidth: '100%', height: 'auto' }}
        />
        <Text style={{ ...bodyTextStyle, color: '#B4442F', fontSize: '13px', textAlign: 'center' as const, margin: '10px 0 0' }}>
          The biggest risk of a PDF in chats: you cannot control who sees it, or where it is forwarded.
        </Text>
      </Section>

      {/* Safety notes */}
      <Section style={{ marginTop: '26px', backgroundColor: '#FBF1D3', borderRadius: '12px', padding: '16px 18px' }}>
        <Text style={{ fontFamily: serif, fontSize: '16px', color: '#3F2A16', margin: '0 0 8px' }}>Before you share, please remember</Text>
        {SAFETY_NOTES.slice(0, 6).map((n, i) => (
          <Text key={n} style={{ ...bodyTextStyle, fontSize: '13px', color: '#5B4308', margin: '0 0 6px' }}>{i + 1}. {n}</Text>
        ))}
      </Section>

      {/* Instagram + website */}
      <Section style={{ marginTop: '26px', textAlign: 'center' as const, borderTop: '1px solid #E5E0D8', paddingTop: '18px' }}>
        <Text style={{ ...bodyTextStyle, textAlign: 'center' as const, color: '#3F2A16' }}>Bohra Taaruf is awaiting Raza Mubarak. Stay in touch:</Text>
        <Link href={INSTAGRAM} style={pill}>Instagram @bohrataaruf</Link>
        <Link href={SITE} style={pill}>bohrataaruf.com</Link>
      </Section>
    </EmailLayout>
  );
}
