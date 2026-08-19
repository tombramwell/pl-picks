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

    // --- RETRO BARCLAYS STYLING ---
    const htmlContent = `
      <div style="background-color: #E5E7EB; padding: 40px 20px; font-family: Arial, sans-serif;">
        
        <!-- Header -->
        <div style="background: linear-gradient(to bottom, #001489, #000B4D); padding: 30px; border-bottom: 4px solid #00AEEF; max-width: 500px; margin: 0 auto; text-align: center;">
           <h1 style="font-family: 'Arial Black', Arial, sans-serif; font-size: 32px; font-style: italic; text-transform: uppercase; margin: 0; color: white; letter-spacing: -1px;">
             Premiership <span style="color: #00AEEF;">Picks</span>
           </h1>
        </div>
        
        <!-- Body -->
        <div style="background-color: white; border: 2px solid #D1D5DB; max-width: 500px; margin: 0 auto; padding: 40px 20px; text-align: center; color: #111827;">
           
           <h2 style="font-family: 'Arial Black', Arial, sans-serif; text-transform: uppercase; font-size: 22px; color: #001489; margin-top: 0;">
             Manager Access Code
           </h2>
           
           <p style="font-weight: bold; color: #4B5563; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 30px;">
             Enter this code to access your dashboard:
           </p>
           
           <!-- Scoreboard Code Block -->
           <div style="font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #001489; background-color: #F3F4F6; border: 2px solid #00AEEF; padding: 20px 10px 20px 22px; display: inline-block; margin-bottom: 30px;">
             ${code}
           </div>
           
           <p style="color: #9CA3AF; font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">
             This code expires in 10 minutes.
           </p>
           
        </div>
      </div>
    `;

    // Send the code via Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Premiership Picks <auth@tombramwell.com>',
      to: normalizedEmail,
      subject: `${code} is your Premiership Picks code`,
      html: htmlContent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send OTP Error:', error);
    return NextResponse.json({ error: 'Failed to send code' }, { status: 500 });
  }
}