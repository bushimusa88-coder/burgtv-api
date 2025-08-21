import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    // Test database connection
    const { data, error } = await supabase
      .from('devices')
      .select('count(*)')
      .limit(1);

    const dbStatus = error ? 'disconnected' : 'connected';
    
    return NextResponse.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.ENVIRONMENT || 'development',
        database: dbStatus,
        uptime: process.uptime()
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Health check failed',
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'error'
      }
    }, { status: 500 });
  }
}