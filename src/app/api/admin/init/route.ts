import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

/**
 * POST /api/admin/init
 * Initialize the first admin account (only works if no admin exists)
 * This is for setting up the initial admin user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    // Check if any admin exists
    const existingAdmin = await db.admin.findFirst();

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Admin already exists. Use the login page instead.' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Create admin user
    const hashedPassword = hashPassword(password);
    const user = await db.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: 'admin',
        membershipType: 'premium',
        membershipStatus: 'active',
      },
    });

    // Create admin profile
    await db.admin.create({
      data: {
        userId: user.id,
        permissions: JSON.stringify(['*']), // All permissions
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Admin account created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Admin init error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create admin' },
      { status: 500 }
    );
  }
}
