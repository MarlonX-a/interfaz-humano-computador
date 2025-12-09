// Edge Function: Create Meshy.ai Image-to-3D task
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const MESHY_API_URL = "https://api.meshy.ai/openapi/v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { imageBase64, apiKey } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "imageBase64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "apiKey is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Creating Meshy.ai Image-to-3D task...");
    console.log("API Key format check: starts with 'msy' =", apiKey.startsWith('msy'));

    // Create the task with base64 data URI
    const createResponse = await fetch(`${MESHY_API_URL}/image-to-3d`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: imageBase64, // Meshy accepts base64 data URI directly
        ai_model: "meshy-4",
        should_remesh: true,
        should_texture: true,
        target_polycount: 30000,
      }),
    });

    const responseText = await createResponse.text();
    console.log("Meshy create response status:", createResponse.status);
    console.log("Meshy response:", responseText.substring(0, 500));

    if (!createResponse.ok) {
      console.error("Meshy create error:", responseText);
      return new Response(
        JSON.stringify({ 
          error: `Meshy API error (${createResponse.status}): ${responseText}`,
          hint: createResponse.status === 401 ? "Verifica que tu API Key de Meshy sea válida. Debe empezar con 'msy-'" : undefined
        }),
        { status: createResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = JSON.parse(responseText);
    console.log("Task created, ID:", data.result);

    return new Response(
      JSON.stringify({ taskId: data.result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
