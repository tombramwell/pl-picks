import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Resend } from 'resend';
import Match from '@/models/Match';
import Pick from '@/models/Pick';
import Entrant from '@/models/Entrant'; 

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request) {
  // 1. Security Check
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    await dbConnect();
    const now = new Date();

    // 2. Determine the NEXT active Gameweek
    const nextMatch = await Match.findOne({ kickoffTime: { $gt: now } }).sort({ kickoffTime: 1 });
    if (!nextMatch) {
      return NextResponse.json({ message: 'No future matches found. Season over?' });
    }

    const targetGw = nextMatch.gameweek;
    
    // Fetch all matches for this upcoming Gameweek
    const gwMatches = await Match.find({ gameweek: targetGw }).lean();
    const matchIds = gwMatches.map(m => m._id.toString());

    // 3. Get all active managers
    const users = await Entrant.find().lean();
    let emailsSent = 0;

    for (const user of users) {
      // Fetch all picks this user has made for the target Gameweek matches
      const userPicks = await Pick.find({
        userId: user.email,
        matchId: { $in: matchIds }
      }).lean();

      // Extract just the match IDs they have successfully picked
      const pickedMatchIds = userPicks.map(p => p.matchId.toString());

      // 4. Find the exact matches they are missing
      const missingMatches = gwMatches.filter(
        match => !pickedMatchIds.includes(match._id.toString())
      );

      // 5. If they have missing matches, generate the list and send the email
      if (missingMatches.length > 0) {
        
        // Generate the retro HTML list items for the missing matches
        const missingMatchesHtml = missingMatches.map(m => `
          <li style="background-color: #F3F4F6; border-left: 4px solid #00AEEF; padding: 12px 15px; margin-bottom: 8px; font-family: 'Arial Black', Arial, sans-serif; font-size: 14px; text-transform: uppercase; color: #111827; list-style: none;">
            ${m.teamA} <span style="color: #6B7280; font-size: 12px; margin: 0 5px;">vs</span> ${m.teamB}
          </li>
        `).join('');
        
        // --- RETRO BARCLAYS STYLING ---
        const htmlContent = `
          <div style="background-color: #E5E7EB; padding: 20px; font-family: Arial, sans-serif;">
            
            <!-- Header -->
            <div style="background: linear-gradient(to bottom, #001489, #000B4D); padding: 30px; border-bottom: 4px solid #00AEEF; max-width: 600px; margin: 0 auto;">
               <h1 style="font-family: 'Arial Black', Arial, sans-serif; font-size: 32px; font-style: italic; text-transform: uppercase; margin: 0; color: white; letter-spacing: -1px;">
                 Premiership <span style="color: #00AEEF;">Picks</span>
               </h1>
            </div>
            
            <!-- Body -->
            <div style="background-color: white; border: 2px solid #D1D5DB; max-width: 600px; margin: 0 auto; padding: 30px; color: #111827;">
               <h2 style="font-family: 'Arial Black', Arial, sans-serif; text-transform: uppercase; font-size: 22px; color: #001489; margin-top: 0; border-bottom: 2px solid #00AEEF; padding-bottom: 10px;">
                 GW${targetGw} Action Required!
               </h2>
               
               <p style="font-weight: bold; line-height: 1.6; font-size: 16px;">
                 You have <span style="color: #DC2626;">${missingMatches.length}</span> missing scorers for this weekend's fixtures.
               </p>
               <p style="color: #4B5563; line-height: 1.6; font-size: 14px;">
                 A missing pick scores zero points. You need to lock in a player for the following games before they kick off:
               </p>
               
               <!-- Missing Matches List -->
               <ul style="padding: 0; margin: 20px 0;">
                 ${missingMatchesHtml}
               </ul>
               
               <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://plpicks.tombramwell.com/'}" 
                  style="display: block; width: 100%; text-align: center; background-color: #001489; color: white; padding: 15px 0; margin-top: 30px; text-decoration: none; font-family: 'Arial Black', Arial, sans-serif; font-size: 16px; text-transform: uppercase; letter-spacing: 2px; border-bottom: 4px solid #000B4D;">
                  Make Your Picks Now
               </a>
            </div>
            
          </div>
        `;

        await resend.emails.send({
          from: 'Premiership Picks <premiershippicks@tombramwell.com>', 
          to: user.email,
          subject: `You have ${missingMatches.length} missing picks for GW${targetGw}!`,
          html: htmlContent
        });
        
        emailsSent++;
      }
    }

    return NextResponse.json({ success: true, emailsSent, gameweek: targetGw });

  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}