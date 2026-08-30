import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Pick from '@/models/Pick';
import Unsubscriber from '@/models/Unsubscriber';

export async function GET(request) {
  // 1. Security Check
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    await dbConnect();
    
    // We look for matches kicking off in the next 20 minutes that haven't had a reminder sent
    const now = new Date();
    const twentyMinsFromNow = new Date(now.getTime() + 20 * 60 * 1000);

    const imminentMatches = await Match.find({
      kickoffTime: { $gt: now, $lte: twentyMinsFromNow },
      pushReminderSent: { $ne: true } // Safety flag
    });

    if (imminentMatches.length === 0) {
      return NextResponse.json({ message: 'No imminent matches requiring reminders.' });
    }

    // 2. Get the master lists of managers and blacklisted users
    const allEmails = await Pick.distinct('userId');
    const blacklistedDocs = await Unsubscriber.find().lean();
    const blacklistedEmails = blacklistedDocs.map(d => d.email);

    let notificationsSent = 0;

    // 3. Process each imminent match
    for (const match of imminentMatches) {
      // Find out who HAS picked for this match
      const picksForMatch = await Pick.find({ matchId: match._id }).lean();
      const usersWhoPicked = picksForMatch.map(p => p.userId);

      // Find out who is MISSING and NOT blacklisted
      const targetEmails = allEmails.filter(email => 
        !usersWhoPicked.includes(email) && !blacklistedEmails.includes(email)
      );

      if (targetEmails.length > 0) {
        // 4. Hit the OneSignal API to send the Push Notification
        const response = await fetch('https://onesignal.com/api/v1/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${process.env.ONESIGNAL_REST_API_KEY}`
          },
          body: JSON.stringify({
            app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
            // Because we used OneSignal.login(email), their email is their 'external_id' alias!
            include_aliases: {
              external_id: targetEmails 
            },
            target_channel: "push",
            headings: { en: "🚨 Deadline Approaching!" },
            contents: { en: `${match.teamA} v ${match.teamB} kicks off in 15 mins! Lock in your pick.` },
            url: process.env.NEXT_PUBLIC_SITE_URL // Tapping the push opens your app
          })
        });

        if (response.ok) {
          notificationsSent += targetEmails.length;
          // 5. Update the safety flag so we never send this match warning again
          match.pushReminderSent = true;
          await match.save();
        } else {
          console.error('OneSignal Error:', await response.text());
        }
      } else {
        // Everyone picked! Just mark it as sent so we don't process it again.
        match.pushReminderSent = true;
        await match.save();
      }
    }

    return NextResponse.json({ success: true, notificationsSent });
  } catch (error) {
    console.error('Push reminder error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}