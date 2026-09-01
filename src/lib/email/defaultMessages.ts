// Plain string constants/builders shared between an email template
// (server-side, rendered via @react-email/components) and the admin client
// UI that lets a volunteer edit the message before sending. Deliberately no
// react-email/JSX dependency so it's safe to import from a 'use client'
// component without pulling server-only rendering code into the browser
// bundle.
//
// The reupload ask is folded into this same block of text (rather than a
// separately-hardcoded paragraph in the template) so the admin's textarea
// shows — and can edit — the ENTIRE body the recipient will read, not just
// part of it. Only the structural pieces (greeting, "Re-upload ITS card"
// button + its real link) stay outside the editable text.
export function buildDefaultPrelaunchMessage(needsReupload: boolean, rejectionReason?: string): string {
  const base = `Thank you for signing up with Bohra Taaruf. We wanted to let you know that we are currently in the process of seeking Raza Mubarak before launching the website and app globally. Your registration and profile are safely saved, and we will notify you as soon as we are ready to launch. If you have any questions or need help in the meantime, just reply to this email, or write to us directly at support@bohrataaruf.com — we're happy to assist. We appreciate your patience and trust.`;

  if (!needsReupload) return base;

  const reuploadAsk = `Separately, the photo of your ITS card wasn't clear enough for us to verify${rejectionReason ? ` (${rejectionReason})` : ''}. Could you please re-upload a clearer photo when you get a moment? This lets us complete your verification ahead of launch.`;

  return `${base}\n\n${reuploadAsk}`;
}
