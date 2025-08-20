import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { deviceUpdateSchema, formatMacAddress, isValidMacAddress } from '@/lib/validation';
import { corsMiddleware, rateLimitMiddleware, withErrorHandling, logRequest } from '@/lib/middleware';
import { ApiResponse, Device } from '@/types/api';

async function getDeviceHandler(
  req: NextRequest,
  { params }: { params: { mac: string } }
): Promise<NextResponse> {
  logRequest(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: corsMiddleware(req)
    });
  }

  // Rate limiting
  const rateLimitResponse = await rateLimitMiddleware(req);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const macAddress = decodeURIComponent(params.mac);

  // Validate MAC address format
  if (!isValidMacAddress(macAddress)) {
    return NextResponse.json({
      success: false,
      error: 'Invalid MAC address format'
    } as ApiResponse, { 
      status: 400,
      headers: corsMiddleware(req)
    });
  }

  const formattedMac = formatMacAddress(macAddress);

  try {
    // Get device by MAC address
    const { data: device, error } = await supabaseAdmin
      .from('devices')
      .select('*')
      .eq('mac_address', formattedMac)
      .single();

    if (error || !device) {
      return NextResponse.json({
        success: false,
        error: 'Device not found',
        message: 'No device found with this MAC address'
      } as ApiResponse, { 
        status: 404,
        headers: corsMiddleware(req)
      });
    }

    // Update last_active timestamp
    await supabaseAdmin
      .from('devices')
      .update({ last_active: new Date().toISOString() })
      .eq('id', device.id);

    const deviceResponse: Device = {
      id: device.id,
      mac_address: device.mac_address,
      device_type: device.device_type,
      device_name: device.device_name,
      m3u_url: device.m3u_url,
      epg_url: device.epg_url,
      created_at: device.created_at,
      updated_at: device.updated_at,
      status: device.status,
      last_active: device.last_active
    };

    return NextResponse.json({
      success: true,
      data: deviceResponse
    } as ApiResponse<Device>, {
      headers: corsMiddleware(req)
    });

  } catch (error) {
    console.error('Get device error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse, { 
      status: 500,
      headers: corsMiddleware(req)
    });
  }
}

async function updateDeviceHandler(
  req: NextRequest,
  { params }: { params: { mac: string } }
): Promise<NextResponse> {
  logRequest(req);

  // Rate limiting
  const rateLimitResponse = await rateLimitMiddleware(req);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const macAddress = decodeURIComponent(params.mac);

  // Validate MAC address format
  if (!isValidMacAddress(macAddress)) {
    return NextResponse.json({
      success: false,
      error: 'Invalid MAC address format'
    } as ApiResponse, { 
      status: 400,
      headers: corsMiddleware(req)
    });
  }

  const formattedMac = formatMacAddress(macAddress);

  // Parse request body
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({
      success: false,
      error: 'Invalid JSON body'
    } as ApiResponse, { 
      status: 400,
      headers: corsMiddleware(req)
    });
  }

  // Validate input
  const validation = deviceUpdateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({
      success: false,
      error: 'Validation failed',
      message: validation.error.errors.map(e => e.message).join(', ')
    } as ApiResponse, { 
      status: 400,
      headers: corsMiddleware(req)
    });
  }

  try {
    // Check if device exists
    const { data: existingDevice, error: fetchError } = await supabaseAdmin
      .from('devices')
      .select('id, mac_address')
      .eq('mac_address', formattedMac)
      .single();

    if (fetchError || !existingDevice) {
      return NextResponse.json({
        success: false,
        error: 'Device not found'
      } as ApiResponse, { 
        status: 404,
        headers: corsMiddleware(req)
      });
    }

    // Update device
    const updateData = {
      ...validation.data,
      updated_at: new Date().toISOString()
    };

    const { data: updatedDevice, error: updateError } = await supabaseAdmin
      .from('devices')
      .update(updateData)
      .eq('mac_address', formattedMac)
      .select()
      .single();

    if (updateError) {
      console.error('Device update error:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Update failed'
      } as ApiResponse, { 
        status: 500,
        headers: corsMiddleware(req)
      });
    }

    // Log the update
    await supabaseAdmin
      .from('device_logs')
      .insert([{
        device_id: existingDevice.id,
        action: 'device_updated',
        details: updateData,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent'),
        created_at: new Date().toISOString()
      }]);

    const deviceResponse: Device = {
      id: updatedDevice.id,
      mac_address: updatedDevice.mac_address,
      device_type: updatedDevice.device_type,
      device_name: updatedDevice.device_name,
      m3u_url: updatedDevice.m3u_url,
      epg_url: updatedDevice.epg_url,
      created_at: updatedDevice.created_at,
      updated_at: updatedDevice.updated_at,
      status: updatedDevice.status,
      last_active: updatedDevice.last_active
    };

    return NextResponse.json({
      success: true,
      data: deviceResponse,
      message: 'Device updated successfully'
    } as ApiResponse<Device>, {
      headers: corsMiddleware(req)
    });

  } catch (error) {
    console.error('Update device error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse, { 
      status: 500,
      headers: corsMiddleware(req)
    });
  }
}

async function deleteDeviceHandler(
  req: NextRequest,
  { params }: { params: { mac: string } }
): Promise<NextResponse> {
  logRequest(req);

  // Rate limiting
  const rateLimitResponse = await rateLimitMiddleware(req);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const macAddress = decodeURIComponent(params.mac);

  // Validate MAC address format
  if (!isValidMacAddress(macAddress)) {
    return NextResponse.json({
      success: false,
      error: 'Invalid MAC address format'
    } as ApiResponse, { 
      status: 400,
      headers: corsMiddleware(req)
    });
  }

  const formattedMac = formatMacAddress(macAddress);

  try {
    // Check if device exists
    const { data: existingDevice, error: fetchError } = await supabaseAdmin
      .from('devices')
      .select('id')
      .eq('mac_address', formattedMac)
      .single();

    if (fetchError || !existingDevice) {
      return NextResponse.json({
        success: false,
        error: 'Device not found'
      } as ApiResponse, { 
        status: 404,
        headers: corsMiddleware(req)
      });
    }

    // Delete device
    const { error: deleteError } = await supabaseAdmin
      .from('devices')
      .delete()
      .eq('mac_address', formattedMac);

    if (deleteError) {
      console.error('Device deletion error:', deleteError);
      return NextResponse.json({
        success: false,
        error: 'Deletion failed'
      } as ApiResponse, { 
        status: 500,
        headers: corsMiddleware(req)
      });
    }

    // Log the deletion
    await supabaseAdmin
      .from('device_logs')
      .insert([{
        device_id: existingDevice.id,
        action: 'device_deleted',
        details: { mac_address: formattedMac },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent'),
        created_at: new Date().toISOString()
      }]);

    return NextResponse.json({
      success: true,
      message: 'Device deleted successfully'
    } as ApiResponse, {
      headers: corsMiddleware(req)
    });

  } catch (error) {
    console.error('Delete device error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse, { 
      status: 500,
      headers: corsMiddleware(req)
    });
  }
}

export const GET = withErrorHandling(getDeviceHandler);
export const PUT = withErrorHandling(updateDeviceHandler);
export const DELETE = withErrorHandling(deleteDeviceHandler);
export const OPTIONS = getDeviceHandler;