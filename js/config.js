// Application Configuration
// This file should be kept in sync with your .env file
// For client-side apps, we use a config.js file instead of directly reading .env

window.APP_CONFIG = {
  // Supabase Configuration
  SUPABASE_URL: "https://krrhgslhvdfyvxayefqh.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtycmhnc2xodmRmeXZ4YXllZnFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MDAyODYsImV4cCI6MjA3ODI3NjI4Nn0.jil94otneKXn3GTiDLdx1A6yi_5Ktg4DU1_iem5ULbc",
  
  // Application Configuration
  ELECTRICITY_RECONNECTION_FEE: 17.7,
  
  // Environment
  NODE_ENV: "development",
  
  // Application Settings
  DEFAULT_LANGUAGE: "en",
  DEFAULT_CURRENCY: "EUR",
  DEFAULT_PHONE_COUNTRY_CODE: "+383",
  
  // Date Range Limits
  MIN_YEAR: 2020,
  MAX_YEAR: 2030,
  
  // Apartment Photos
  MAX_PHOTOS_PER_APARTMENT: 10
};

