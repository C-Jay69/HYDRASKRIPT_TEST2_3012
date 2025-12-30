import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromAuthHeader } from '@/lib/auth';

/**
 * GET /api/orders
 * Get user's orders
 */
export async function GET(request: NextRequest) {
  try {
    const userPayload = getUserFromAuthHeader(request.headers.get('authorization'));

    if (!userPayload) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const orders = await db.order.findMany({
      where: { userId: userPayload.id },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            book: {
              select: {
                id: true,
                title: true,
                category: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      orders,
    });
  } catch (error: any) {
    console.error('Get orders error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to get orders' },
      { status: 500 }
    );
  }
}
