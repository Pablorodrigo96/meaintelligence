import { supabase } from "@/integrations/supabase/client";

export async function logApiUsage(userId: string, service: string, action?: string) {
  try {
    await supabase.from("api_usage_logs" as any).insert({
      user_id: userId,
      service,
      action: action || null,
    });
  } catch (e) {
    console.warn("Failed to log API usage:", e);
  }
}
