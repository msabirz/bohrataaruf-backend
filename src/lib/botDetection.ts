/**
 * Bot / link-preview crawler detection, shared by every public link page
 * (/biodata/[token] and /s/[token]). Chat apps (WhatsApp, Telegram...) fetch a
 * link the moment it is pasted to build the preview card — those fetches must
 * never count as a view or consume a one-time link.
 */
const BOT_UA_PATTERNS = [
  /whatsapp/i,
  /telegrambot/i,
  /twitterbot/i,
  /facebookexternalhit/i,
  /linkedinbot/i,
  /discordbot/i,
  /slackbot/i,
  /googlebot/i,
  /bingbot/i,
  /applebot/i,
  /ia_archiver/i,
  /preview/i,
];

export function isBot(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return BOT_UA_PATTERNS.some((p) => p.test(ua));
}
