import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Match from '@/models/Match';
import Player from '@/models/Player';

export async function GET() {
  await dbConnect();

  try {
    // 1. Clear existing test data (Warning: only do this in development!)
    await User.deleteMany({});
    await Match.deleteMany({});
    await Player.deleteMany({});

    // 2. Create a test family member
    const testUser = await User.create({
      username: 'UncleBob',
      password: 'password123', // We'll add encryption when we do the Auth step
      isAdmin: false
    });

    // 3. Create two test matches (One in the future, one in the past to test locking)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await Match.insertMany([
      { teamA: 'Brazil', teamB: 'France', kickoffTime: tomorrow, isFinished: false },
      { teamA: 'England', teamB: 'USA', kickoffTime: yesterday, isFinished: true } // This should appear locked
    ]);

    // 4. Create a mini roster of players for these teams
    await Player.insertMany([
      { name: 'Vinícius Júnior', team: 'Brazil', position: 'Forward' },
      { name: 'Kylian Mbappé', team: 'France', position: 'Forward' },
      { name: 'Antoine Griezmann', team: 'France', position: 'Midfielder' },
      { name: 'Harry Kane', team: 'England', position: 'Forward' },
      { name: 'Jude Bellingham', team: 'England', position: 'Midfielder' },
      { name: 'Christian Pulisic', team: 'USA', position: 'Forward' }
    ]);

    return NextResponse.json({ 
      success: true, 
      message: 'Database seeded successfully!', 
      testUserId: testUser._id 
    });

  } catch (error) {
    console.error('Seeding error:', error);
    return NextResponse.json({ error: 'Failed to seed database' }, { status: 500 });
  }
}