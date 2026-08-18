import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import OTP from '@/models/OTP';
import { Resend } from 'resend';

export async function POST(req) {
  try {
    const { email } = await req.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    await dbConnect();

    // Generate a random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Save code to MongoDB (clearing any existing codes for this email)
    await OTP.deleteMany({ email: normalizedEmail });
    await OTP.create({ email: normalizedEmail, code });

    // Send the code via Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: normalizedEmail,
      subject: `${code} is your Premiership Picks code`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; text-align: center;">
          <h2>Premiership Picks</h2>
          <p>Your verification code is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #4F46E5; margin: 20px 0;">
            ${code}
          </div>
          <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send OTP Error:', error);
    return NextResponse.json({ error: 'Failed to send code' }, { status: 500 });
  }
}