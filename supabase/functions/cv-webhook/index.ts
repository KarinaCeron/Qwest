import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const N8N_WEBHOOK_URL =
  "https://karinaceron.app.n8n.cloud/webhook/6cdb236e-63a2-4320-b0e3-4961a410ef2b";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { filePath } = await req.json();
    if (!filePath) {
      return new Response(JSON.stringify({ error: "filePath required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download file using service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("cvs")
      .download(filePath);

    if (downloadError || !fileData) {
      return new Response(JSON.stringify({ error: "Failed to download file" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send file to n8n webhook
    const formData = new FormData();
    const fileName = filePath.split("/").pop() || "cv.pdf";
    formData.append("file", fileData, fileName);
    formData.append("user_id", user.id);
    formData.append("user_email", user.email || "");

    const webhookResponse = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      body: formData,
    });

    const webhookResult = await webhookResponse.text();
    console.log("Webhook response:", webhookResponse.status, webhookResult);

    // After n8n inserts into cv_rag, assign user_id to rows that don't have one
    if (webhookResponse.ok) {
      // Update rows without user_id, setting both user_id column and metadata
      const { data: rowsToUpdate } = await supabaseAdmin
        .from("cv_rag")
        .select("id, metadata")
        .is("user_id", null);

      if (rowsToUpdate && rowsToUpdate.length > 0) {
        for (const row of rowsToUpdate) {
          const existingMetadata = (row.metadata as Record<string, unknown>) || {};
          const updatedMetadata = { ...existingMetadata, user_id: user.id };

          await supabaseAdmin
            .from("cv_rag")
            .update({ user_id: user.id, metadata: updatedMetadata })
            .eq("id", row.id);
        }
      }

      const updateError = null;

      if (updateError) {
        console.error("Error updating cv_rag user_id:", updateError);
      } else {
        console.log("Updated cv_rag rows with user_id:", user.id);
      }
    }

    return new Response(
      JSON.stringify({ success: true, webhookStatus: webhookResponse.status }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
