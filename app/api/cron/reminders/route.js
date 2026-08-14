import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Resend } from 'resend';
import Match from '@/models/Match';
import User from '@/models/User';
import Pick from '@/models/Pick';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request) {
  // 1. Security Check: Protect your cron route so random people can't trigger it
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    await dbConnect();

    // 2. Find all matches starting in the next 24 hours
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const todaysMatches = await Match.find({
      kickoffTime: { $gte: now, $lte: twentyFourHoursFromNow }
    });

    if (todaysMatches.length === 0) {
      return NextResponse.json({ message: 'No matches today. No emails sent.' });
    }

    // 3. Fetch all active players
const users = await User.find({ receiveReminders: { $ne: false } }, 'email displayName _id');    let emailsSent = 0;

    for (const user of users) {
      let missingPicks = [];

      // Check if this specific user has made a pick for each of today's matches
      for (const match of todaysMatches) {
        const existingPick = await Pick.findOne({
          userId: user._id,
          matchId: match._id
        });

        if (!existingPick) {
          missingPicks.push(`${match.teamA} vs ${match.teamB}`);
        }
      }

      // 4. If they are missing any picks, send them an email digest!
      if (missingPicks.length > 0) {
        await resend.emails.send({
          from: 'Just Fontaine Challenge <reminders@tombramwell.com>', // You can upgrade this to your own custom domain later
          to: user.email,
          subject: 'Get your picks in ahead of kick-off!',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
              <h2 style="color: #1e3a8a;">Hey ${user.displayName}!</h2>
              <p>Don't miss out on points! You still need to lock in your picks for the following matches, which kick off within the next 24 hours:</p>
              <ul style="font-size: 16px; font-weight: bold; color: #dc2626; line-height: 1.6;">
                ${missingPicks.map(matchName => `<li>⚠️ ${matchName}</li>`).join('')}
              </ul>
              <p style="margin-top: 24px;">
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://just-fontaine-challenge.tombramwell.com/'}" 
                   style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">
                   Make Your Picks Now
                </a>
              </p>
            </div>
          `
        });
        emailsSent++;
      }
    }

    return NextResponse.json({ success: true, emailsSent });

} catch (error) {
    console.error("Cron Error:", error); // <-- The correct JavaScript command
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}