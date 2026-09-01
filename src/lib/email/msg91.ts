/**
 * Low-level MSG91 Email API client. Nothing else in this codebase should
 * call MSG91 directly — go through src/lib/email/index.ts, which is the
 * provider-agnostic layer everything else depends on.
 */

const MSG91_EMAIL_ENDPOINT = 'https://api.msg91.com/api/v5/email/send';

export class Msg91SendError extends Error {
  constructor(message: string, public readonly status?: number, public readonly body?: unknown) {
    super(message);
    this.name = 'Msg91SendError';
  }
}

export async function sendViaMsg91(params: {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<void> {
  const apiKey = process.env.MSG91_API_KEY;
  const domain = process.env.MSG91_EMAIL_DOMAIN;
  const fromEmail = process.env.MSG91_FROM_EMAIL;
  const templateId = process.env.MSG91_TEMPLATE_ID;

  if (!apiKey || !domain || !fromEmail || !templateId) {
    throw new Msg91SendError('MSG91 is not configured — missing MSG91_API_KEY, MSG91_EMAIL_DOMAIN, MSG91_FROM_EMAIL, or MSG91_TEMPLATE_ID');
  }

  // Every email type shares this one approved template — it's just a
  // {{SUBJECT}} / {{CONTENT}} pass-through shell (the template's own
  // subject line is "Bohra Taaruf: {{SUBJECT}}", so params.subject should
  // NOT repeat the brand name). The real design/copy for each email type
  // lives in the React Email component that was rendered to `params.html`
  // before this function was called — see src/lib/email/index.ts.
  //
  // reply_to routes replies to support@bohrataaruf.com instead of the
  // sending-only mail.bohrataaruf.com subdomain (confirmed to have no MX
  // records — a reply there bounces, while support@bohrataaruf.com is
  // confirmed to receive mail). MSG91 requires this as an ARRAY of
  // {email, name} objects, same shape as `to` — a single {email, name}
  // object (matching `from`'s shape) is rejected with a 422. Confirmed
  // directly against the live API, not assumed from docs.
  const body: Record<string, unknown> = {
    template_id: templateId,
    recipients: [
      {
        to: [{ email: params.to, name: params.toName || params.to }],
        variables: {
          SUBJECT: params.subject,
          CONTENT: params.html,
        },
      },
    ],
    from: { email: fromEmail, name: 'Bohra Taaruf' },
    domain,
  };
  if (params.replyTo) {
    body.reply_to = [{ email: params.replyTo, name: 'Bohra Taaruf Support' }];
  }

  const res = await fetch(MSG91_EMAIL_ENDPOINT, {
    method: 'POST',
    headers: {
      authkey: apiKey,
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const bodyText = await res.text();
  let bodyJson: unknown;
  try { bodyJson = JSON.parse(bodyText); } catch { bodyJson = bodyText; }

  if (!res.ok) {
    throw new Msg91SendError(`MSG91 send failed (${res.status})`, res.status, bodyJson);
  }
}
