/**
 * Copy shared by the public My Taaruf Card page, its FAQ structured data, and the
 * campaign email, so the wording is defined once.
 */
export const CARD_PATH = '/my-taaruf-card';
export const INSTAGRAM_URL = 'https://www.instagram.com/bohrataaruf';

export const STEPS = [
  { title: 'Select details to share', text: 'Choose your name, your photo, and the details you are happy to show. Add your own, like your father\'s business.' },
  { title: 'Create a link and send it', text: 'Name a link for the person, choose how long it works, then send it on WhatsApp. One view only is the safest.' },
  { title: 'Watch your analytics', text: 'See how many times each link was opened, and from which phone. We never tell you who opened it.' },
];

export const OLD_VS_NEW: { old: string; now: string }[] = [
  { old: 'Everything in the file goes out, often with a phone number', now: 'Only the details you choose. Phone, email and ITS number are never shown' },
  { old: 'Your photo stays in chats and phones for ever', now: 'Photo blurred unless you choose to show it. The chat card is always blurred' },
  { old: 'Once sent, you cannot take it back, and it gets forwarded', now: 'One view only, an expiry, stop any link, or switch everything off' },
  { old: 'No idea if anyone opened it', now: 'See how many times it was opened, and from which phone' },
  { old: 'Old copies keep circulating after you change your details', now: 'Change your details once, and every active link shows the latest' },
];

export const SAFETY_NOTES: string[] = [
  'Always trust links that start with bohrataaruf.com. If a message asks you to open any other address, do not.',
  'This is always free. Bohra Taaruf never charges money for any feature. Be alert, be safe.',
  'Do not write your phone number or email in your bio or details. Anyone with the link can read them.',
  'Send each link to one person you know, and name it so you remember who has it.',
  'Prefer "One view only", and open it in your browser, not inside WhatsApp.',
  'Keep your photo blurred unless you really trust the person. It is blurred by default.',
  'Stop a link when you are done, or switch sharing off.',
  'Do not forward a link someone sent to you.',
];

export const FAQS: { q: string; a: string }[] = [
  { q: 'Who can see my biodata?', a: 'Only people you send a link to, and only the details you chose.' },
  { q: 'Will I know who opened my link?', a: 'No. You see how many times it was opened and from which kind of phone, never who.' },
  { q: 'What does "one view only" mean?', a: 'The link works once. Open it in your browser, not inside WhatsApp, because it cannot be opened again.' },
  { q: 'Can I stop sharing?', a: 'Any time. Stop one link, or switch off sharing and every link stops straight away.' },
  { q: 'Is my phone number or email shown?', a: 'Never. Your phone number, email and ITS number cannot be shared, whatever you choose.' },
  { q: 'Will my photo be visible?', a: 'Blurred by default. You can choose to show it, and we ask for your password first. The small card in a chat is always blurred.' },
  { q: 'Can I add details that are not on my profile?', a: 'Yes, like your father\'s name or business, your native place, or your family background. Please keep contact numbers and emails out of them.' },
  { q: 'Does it cost anything?', a: 'No. It is always free, and Bohra Taaruf never charges money for any feature. If anyone asks you to pay, be alert and do not.' },
  { q: 'How do I know a link is really from Bohra Taaruf?', a: 'Real links always start with bohrataaruf.com. Do not trust any other address.' },
  { q: 'Do people I share with need an account?', a: 'No. They can open your link without one, and can join Bohra Taaruf if they wish.' },
];
