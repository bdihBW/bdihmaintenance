// BDIH Maintenance Intelligence Platform: connection settings.
// enabled: true  -> shared Supabase database (real sign-in, data shared across devices)
// enabled: false -> local demo mode (demo users, data stays in this browser)
// The anon key is public by design; access is controlled by Row Level Security in supabase/schema.sql.
// NEVER put the service_role key in this file.
window.BDIH_CONFIG = {
  enabled: true,
  supabaseUrl: 'https://icdlymlfjubdqjxdffcx.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljZGx5bWxmanViZHFqeGRmZmN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MDUzODUsImV4cCI6MjEwNjA4MTM4NX0.ABPJVtU7GMxo4ks4j21tkzNKopsPbfkZwSKlqvU9JII'
};
