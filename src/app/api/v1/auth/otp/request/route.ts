import { NextResponse } from 'next/server';
import { RequestOtpSchema } from '@/lib/api/validators';
import { generateAndSendOtp } from '@/lib/api/otp';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = RequestOtpSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }
    
    const { phone, countryCode } = parsed.data;
    const fullPhone = `${countryCode}${phone}`;

    try {
      const responseBody = await generateAndSendOtp(fullPhone, 'login');
      return NextResponse.json(responseBody);
    } catch (err: any) {
      if (err.message === 'Please wait 60 seconds before requesting another OTP') {
        return NextResponse.json({ error: err.message }, { status: 429 });
      }
      throw err;
    }
  } catch (error) {
    console.error('Request OTP error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
