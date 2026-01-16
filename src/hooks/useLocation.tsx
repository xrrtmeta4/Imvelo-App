import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  state?: string;
  country_name: string;
  country_code: string;
  timezone?: string;
  source: 'ip' | 'gps' | 'fallback';
}

const DEFAULT_LOCATION: LocationData = {
  latitude: -26.3054,
  longitude: 31.1367,
  city: 'Mbabane',
  state: 'Hhohho',
  country_name: 'Eswatini',
  country_code: 'SZ',
  timezone: 'Africa/Mbabane',
  source: 'fallback'
};

// Try to get location from browser's Geolocation API
const getBrowserGeolocation = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes cache
    });
  });
};

// Reverse geocode coordinates to get city/country info
const reverseGeocode = async (lat: number, lon: number): Promise<Partial<LocationData>> => {
  try {
    // Using Open-Meteo's geocoding API (free, no key required)
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=&latitude=${lat}&longitude=${lon}&count=1&language=en&format=json`
    );
    
    // Open-Meteo geocoding doesn't do reverse lookup, so we'll use a simple approach
    // Just return the coordinates with generic location info
    return {
      latitude: lat,
      longitude: lon,
      source: 'gps'
    };
  } catch (error) {
    console.warn('Reverse geocoding failed:', error);
    return {
      latitude: lat,
      longitude: lon,
      source: 'gps'
    };
  }
};

export const useLocation = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLocation = useCallback(async (): Promise<LocationData> => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Try IP-based geolocation via edge function
      console.log('Attempting IP-based geolocation...');
      const { data: ipData, error: ipError } = await supabase.functions.invoke('get-location');

      if (!ipError && ipData && ipData.source !== 'fallback') {
        console.log('IP geolocation successful:', ipData.city, ipData.country_name);
        const locationData: LocationData = {
          latitude: ipData.latitude,
          longitude: ipData.longitude,
          city: ipData.city || 'Unknown',
          state: ipData.state,
          country_name: ipData.country_name || 'Unknown',
          country_code: ipData.country_code || 'XX',
          timezone: ipData.timezone,
          source: 'ip'
        };
        setLocation(locationData);
        setLoading(false);
        return locationData;
      }

      console.log('IP geolocation returned fallback, trying browser GPS...');

      // Step 2: Try browser geolocation (GPS) as fallback
      try {
        const position = await getBrowserGeolocation();
        const { latitude, longitude } = position.coords;
        
        console.log('Browser GPS successful:', latitude, longitude);
        
        // Get additional location info via reverse geocoding
        const geoInfo = await reverseGeocode(latitude, longitude);
        
        const locationData: LocationData = {
          latitude,
          longitude,
          city: 'Your Location',
          state: undefined,
          country_name: 'Detected via GPS',
          country_code: 'GPS',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          source: 'gps',
          ...geoInfo
        };
        
        setLocation(locationData);
        setLoading(false);
        return locationData;
      } catch (gpsError) {
        console.warn('Browser GPS failed:', gpsError);
        // GPS failed, use the IP fallback data or default
      }

      // Step 3: Use fallback location
      console.log('Using fallback location (Mbabane, Eswatini)');
      const fallbackData: LocationData = ipData?.latitude 
        ? {
            latitude: ipData.latitude,
            longitude: ipData.longitude,
            city: ipData.city || DEFAULT_LOCATION.city,
            state: ipData.state || DEFAULT_LOCATION.state,
            country_name: ipData.country_name || DEFAULT_LOCATION.country_name,
            country_code: ipData.country_code || DEFAULT_LOCATION.country_code,
            timezone: ipData.timezone || DEFAULT_LOCATION.timezone,
            source: 'fallback'
          }
        : DEFAULT_LOCATION;

      setLocation(fallbackData);
      setLoading(false);
      return fallbackData;

    } catch (err) {
      console.error('Location detection failed:', err);
      setError('Failed to detect location');
      setLocation(DEFAULT_LOCATION);
      setLoading(false);
      return DEFAULT_LOCATION;
    }
  }, []);

  return { location, loading, error, getLocation };
};
