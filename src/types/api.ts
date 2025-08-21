// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Device Types
export interface Device {
  id: string;
  mac_address: string;
  device_type: DeviceType;
  device_name?: string;
  m3u_url: string;
  epg_url?: string;
  created_at: string;
  updated_at: string;
  status: DeviceStatus;
  last_active?: string;
}

export type DeviceType = 'firetv' | 'samsung' | 'lg' | 'appletv' | 'android' | 'ios';

export type DeviceStatus = 'active' | 'inactive' | 'pending' | 'suspended';

// Registration Request
export interface RegisterDeviceRequest {
  device_type: DeviceType;
  mac_address: string;
  device_name?: string;
  m3u_url: string;
  epg_url?: string;
  captcha_token: string;
}

// Update Device Request
export interface UpdateDeviceRequest {
  device_name?: string;
  m3u_url?: string;
  epg_url?: string;
}

// Device Registration Response
export interface DeviceRegistrationResponse {
  device: Device;
  access_token: string;
  expires_at: string;
}

// M3U Playlist Types
export interface M3UValidationResult {
  isValid: boolean;
  channelCount?: number;
  format?: string;
  error?: string;
}

// Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}