import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Player from '@/models/Player';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    await dbConnect();
    
    // Find all players who are currently marked inactive
    // and force them back to active
    const result = await Player.updateMany(
      { isInactive: true },
      { $set: { isInactive: false } }
    );

    return NextResponse.json({ 
      success: true, 
      message: `Successfully reactivated ${result.modifiedCount} players!`,
      note: "You can now safely delete this file."
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}