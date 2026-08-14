import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    await dbConnect();
    
    // 1. Extract receiveReminders from the body
    const { email, displayName, password, receiveReminders } = await request.json();

    if (!email || !displayName || !password) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: 'This email is already registered.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. Pass it directly to User.create()
    const newUser = await User.create({
      email,
      displayName,
      password: hashedPassword,
      receiveReminders: receiveReminders ?? true, // If somehow missing, default to true
    });

    return NextResponse.json({ message: 'User registered successfully!' }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}