import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CoverLetterRequest {
  jobContent: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const { jobContent }: CoverLetterRequest = await req.json();

    if (!jobContent) {
      return new Response(
        JSON.stringify({ error: 'jobContent is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call n8n webhook with GET method and prompt parameter
    const webhookUrl = 'https://karinaceron.app.n8n.cloud/webhook/aa37d714-c706-410e-9670-197cb1267e6e';
    const params = new URLSearchParams({
      prompt: jobContent
    });

    const getUrl = `${webhookUrl}?${params.toString()}`;
    const forwardRes = await fetch(getUrl, { method: 'GET' });

    if (!forwardRes.ok) {
      console.error('n8n error:', forwardRes.status, await forwardRes.text());
      return new Response(
        JSON.stringify({ error: 'Webhook failed', status: forwardRes.status }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responseData = await forwardRes.json();
    
    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('Edge function error:', e?.message || e);
    return new Response(
      JSON.stringify({ error: 'Internal error', message: e?.message || 'unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});