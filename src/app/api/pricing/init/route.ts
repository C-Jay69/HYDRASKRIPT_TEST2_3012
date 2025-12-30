import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromAuthHeader, isAdmin } from '@/lib/auth';

/**
 * POST /api/pricing/init
 * Initialize pricing plans (only for admin)
 */
export async function POST(request: NextRequest) {
  try {
    const userPayload = getUserFromAuthHeader(request.headers.get('authorization'));

    if (!userPayload || !isAdmin(userPayload)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Check if pricing plans already exist
    const existingPlans = await db.pricingPlan.findMany();

    if (existingPlans.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Pricing plans already exist',
        plans: existingPlans,
      });
    }

    // Create default pricing plans
    const plans = [
      {
        name: 'free',
        price: 0,
        currency: 'USD',
        interval: 'monthly',
        maxBooks: 1,
        maxPagesPerBook: 50,
        imageGeneration: true,
        premiumTemplates: false,
        supportLevel: 'basic',
        isActive: true,
      },
      {
        name: 'basic',
        price: 9.99,
        currency: 'USD',
        interval: 'monthly',
        maxBooks: 5,
        maxPagesPerBook: 100,
        imageGeneration: true,
        premiumTemplates: true,
        supportLevel: 'priority',
        isActive: true,
      },
      {
        name: 'premium',
        price: 19.99,
        currency: 'USD',
        interval: 'monthly',
        maxBooks: 999,
        maxPagesPerBook: 250,
        imageGeneration: true,
        premiumTemplates: true,
        supportLevel: 'dedicated',
        isActive: true,
      },
    ];

    const createdPlans = await Promise.all(
      plans.map(plan => db.pricingPlan.create({ data: plan }))
    );

    return NextResponse.json({
      success: true,
      message: 'Pricing plans created successfully',
      plans: createdPlans,
    });
  } catch (error: any) {
    console.error('Pricing init error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to initialize pricing' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pricing/init
 * Get pricing plans
 */
export async function GET(request: NextRequest) {
  try {
    const plans = await db.pricingPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });

    return NextResponse.json({
      success: true,
      plans,
    });
  } catch (error: any) {
    console.error('Get pricing error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to get pricing plans' },
      { status: 500 }
    );
  }
}
