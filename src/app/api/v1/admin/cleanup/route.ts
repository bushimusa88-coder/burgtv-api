import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateM3uUrl } from '@/lib/validation';
import { corsMiddleware, withErrorHandling, logRequest } from '@/lib/middleware';
import { ApiResponse } from '@/types/api';

async function cleanupHandler(req: NextRequest): Promise<NextResponse> {
  logRequest(req);
  
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: corsMiddleware(req)
    });
  }

  try {
    const cleanupResults = {
      deadUrls: 0,
      inactiveDevices: 0,
      oldLogs: 0
    };

    // 1. Clean up devices with dead M3U URLs (not responding for 7+ days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: devices } = await supabaseAdmin
      .from('devices')
      .select('id, mac_address, m3u_url, updated_at')
      .lt('updated_at', sevenDaysAgo);

    if (devices) {
      for (const device of devices) {
        const m3uCheck = await validateM3uUrl(device.m3u_url);
        if (!m3uCheck.isValid) {
          // Delete device with dead URL
          await supabaseAdmin
            .from('devices')
            .delete()
            .eq('id', device.id);
          
          // Log the cleanup
          await supabaseAdmin
            .from('device_logs')
            .insert([{
              device_id: device.id,
              action: 'auto_cleanup_dead_url',
              details: { reason: 'M3U URL not responding', error: m3uCheck.error },
              ip_address: 'system',
              user_agent: 'auto-cleanup',
              created_at: new Date().toISOString()
            }]);
          
          cleanupResults.deadUrls++;
        }
      }
    }

    // 2. Clean up inactive devices (not accessed for 90+ days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: inactiveDevices } = await supabaseAdmin
      .from('devices')
      .delete()
      .or(`last_active.lt.${ninetyDaysAgo},last_active.is.null`)
      .lt('created_at', ninetyDaysAgo)
      .select('id');

    if (inactiveDevices) {
      cleanupResults.inactiveDevices = inactiveDevices.length;
      
      // Log cleanup for inactive devices
      for (const device of inactiveDevices) {
        await supabaseAdmin
          .from('device_logs')
          .insert([{
            device_id: device.id,
            action: 'auto_cleanup_inactive',
            details: { reason: 'Device inactive for 90+ days' },
            ip_address: 'system',
            user_agent: 'auto-cleanup',
            created_at: new Date().toISOString()
          }]);
      }
    }

    // 3. Clean up old logs (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: oldLogs } = await supabaseAdmin
      .from('device_logs')
      .delete()
      .lt('created_at', thirtyDaysAgo)
      .select('id');

    if (oldLogs) {
      cleanupResults.oldLogs = oldLogs.length;
    }

    return NextResponse.json({
      success: true,
      data: cleanupResults,
      message: 'Cleanup completed successfully'
    } as ApiResponse, {
      headers: corsMiddleware(req)
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({
      success: false,
      error: 'Cleanup failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse, { 
      status: 500,
      headers: corsMiddleware(req)
    });
  }
}

export const POST = withErrorHandling(cleanupHandler);
export const OPTIONS = cleanupHandler;