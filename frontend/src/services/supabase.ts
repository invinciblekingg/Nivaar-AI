import { createClient } from '@supabase/supabase-js';

// Resolve environment variables with safe defaults from configuration
const rawUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Clean Supabase endpoint URL
function resolveSupabaseUrl(url: string, key: string): string {
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    return url.replace(/\/+$/, '');
  }
  // Try decoding project ref from anon JWT if key is provided
  if (key && key.includes('.')) {
    try {
      const parts = key.split('.');
      if (parts.length >= 2) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.ref) {
          return `https://${payload.ref}.supabase.co`;
        }
      }
    } catch {
      // ignore
    }
  }
  return 'https://riwhpkqyhinysukujzfe.supabase.co';
}

const SUPABASE_URL = resolveSupabaseUrl(rawUrl, rawKey);
const SUPABASE_ANON_KEY = rawKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpd2hwa3F5aGlueXN1a3VqemZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NjE3NDEsImV4cCI6MjEwODMzNzc0MX0.8kqFwFNWi7r5jw0lBeOXM1NcEypsgEH9N53fJ9UfKXU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Subscribes to real-time changes on machines table.
 * Automatically notifies callback whenever machine health, status, or sensor analytics update.
 */
export function subscribeToMachines(callback: (payload: any) => void) {
  const channel = supabase
    .channel('realtime:machines')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'machines' },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribes to real-time changes on alerts table.
 */
export function subscribeToAlerts(callback: (payload: any) => void) {
  const channel = supabase
    .channel('realtime:alerts')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'alerts' },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribes to real-time changes on incidents table.
 */
export function subscribeToIncidents(callback: (payload: any) => void) {
  const channel = supabase
    .channel('realtime:incidents')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'incidents' },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribes to real-time changes on maintenance tasks.
 */
export function subscribeToMaintenanceTasks(callback: (payload: any) => void) {
  const channel = supabase
    .channel('realtime:maintenance_tasks')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'maintenance_tasks' },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribes to real-time changes on Symbiosis circular marketplace listings.
 */
export function subscribeToSymbiosisMaterials(callback: (payload: any) => void) {
  const channel = supabase
    .channel('realtime:symbiosis_materials')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'symbiosis_materials' },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribes to real-time changes on generated_reports table.
 */
export function subscribeToGeneratedReports(callback: (payload: any) => void) {
  const channel = supabase
    .channel('realtime:generated_reports')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'generated_reports' },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribes to real-time changes on image_inspections table.
 */
export function subscribeToImageInspections(callback: (payload: any) => void) {
  const channel = supabase
    .channel('realtime:image_inspections')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'image_inspections' },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

