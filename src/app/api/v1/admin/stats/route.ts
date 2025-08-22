import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { corsMiddleware, withErrorHandling, logRequest } from '@/lib/middleware';
import { ApiResponse } from '@/types/api';

async function getStatsHandler(req: NextRequest): Promise<NextResponse> {
  logRequest(req);
  
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: corsMiddleware(req)
    });
  }

  try {
    const currentTime = new Date().toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    // Total devices
    const { count: totalDevices } = await supabaseAdmin
      .from('devices')
      .select('*', { count: 'exact', head: true });

    // Active devices (accessed in last 30 days)
    const { count: activeDevices } = await supabaseAdmin
      .from('devices')
      .select('*', { count: 'exact', head: true })
      .gte('last_active', thirtyDaysAgo);

    // Inactive devices (not accessed in 90+ days)
    const { count: inactiveDevices } = await supabaseAdmin
      .from('devices')
      .select('*', { count: 'exact', head: true })
      .or(`last_active.lt.${ninetyDaysAgo},last_active.is.null`);

    // Devices by type
    const { data: devicesByType } = await supabaseAdmin
      .from('devices')
      .select('device_type')
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        data?.forEach(device => {
          counts[device.device_type] = (counts[device.device_type] || 0) + 1;
        });
        return { data: counts };
      });

    // Recent registrations (last 7 days)
    const { count: recentRegistrations } = await supabaseAdmin
      .from('devices')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo);

    // Total logs
    const { count: totalLogs } = await supabaseAdmin
      .from('device_logs')
      .select('*', { count: 'exact', head: true });

    const stats = {
      devices: {
        total: totalDevices || 0,
        active: activeDevices || 0,
        inactive: inactiveDevices || 0,
        recentRegistrations: recentRegistrations || 0,
        byType: devicesByType || {}
      },
      logs: {
        total: totalLogs || 0
      },
      generatedAt: currentTime
    };

    return NextResponse.json({
      success: true,
      data: stats
    } as ApiResponse, {
      headers: corsMiddleware(req)
    });

  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse, { 
      status: 500,
      headers: corsMiddleware(req)
    });
  }
}

export const GET = withErrorHandling(getStatsHandler);
export const OPTIONS = getStatsHandler;