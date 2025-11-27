import { createClient } from "@supabase/supabase-js";

// Reemplaza estos valores con los de tu proyecto
const supabaseUrl = "https://fyawmbwsfiigmtyluxxs.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5YXdtYndzZmlpZ210eWx1eHhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MTkyNTgsImV4cCI6MjA3NzE5NTI1OH0.eGlzSh0g4PQWmh8ETyQqdSb5D8P2WvlJaSzr2LULyt0";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
