import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromAuthHeader } from '@/lib/auth';

interface CheckoutRequest {
  planName: string;
  interval?: string;
}

/**
 * POST /api/checkout
 * Create a checkout session for a pricing plan
 */
export async function POST(request: NextRequest) {
  try {
    const userPayload = getUserFromAuthHeader(request.headers.get('authorization'));

    if (!userPayload) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body: CheckoutRequest = await request.json();
    const { planName, interval = 'monthly' } = body;

    if (!planName) {
      return NextResponse.json(
        { error: 'Plan name is required' },
        { status: 400 }
      );
    }

    // Get pricing plan
    const plan = await db.pricingPlan.findFirst({
      where: {
        name: planName,
        interval,
        isActive: true,
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    // Create order
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const order = await db.order.create({
      data: {
        userId: userPayload.id,
        orderNumber,
        status: 'pending',
        subtotal: plan.price,
        tax: plan.price * 0.1, // 10% tax
        total: plan.price * 1.1,
        currency: plan.currency,
        paymentMethod: 'mock_payment',
        paymentId: `mock_${Date.now()}`,
        paymentStatus: 'paid', // Auto-success for demo
      },
    });

    // Update user membership
    await db.user.update({
      where: { id: userPayload.id },
      data: {
        membershipType: planName,
        membershipStatus: 'active',
      },
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
        currency: order.currency,
        status: order.status,
      },
      plan,
      message: 'Mock payment successful. User upgraded to ' + planName,
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error?.message || 'Checkout failed' },
      { status: 500 }
    );
  }
}
