import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Verify this is coming from Vercel Cron
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Call our cleanup endpoint
    const cleanupResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await cleanupResponse.json();

    console.log('Automated cleanup completed:', result);

    return NextResponse.json({
      success: true,
      message: 'Automated cleanup completed',
      data: result
    });

  } catch (error) {
    console.error('Cron cleanup error:', error);
    return NextResponse.json({ 
      error: 'Cleanup failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}