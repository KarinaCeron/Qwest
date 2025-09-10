import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CoverLetterRequest {
  jobContent: string;
  userEmail: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const { jobContent, userEmail }: CoverLetterRequest = await req.json();

    if (!jobContent || !userEmail) {
      return new Response(
        JSON.stringify({ error: 'jobContent and userEmail are required' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call n8n webhook with GET method and vacant/email parameters
    const webhookUrl = 'https://karinaceron.app.n8n.cloud/webhook/aa37d714-c706-410e-9670-197cb1267e6e';

    // Avoid overly long URLs by truncating very large contents
    const maxLen = 4000;
    const contentForGet = jobContent.length > maxLen ? jobContent.slice(0, maxLen) : jobContent;

    const params = new URLSearchParams({
      vacant: contentForGet,
      email: userEmail
    });

    const getUrl = `${webhookUrl}?${params.toString()}`;
    const forwardRes = await fetch(getUrl, { method: 'GET', headers: { 'Accept': 'application/json' } });

    if (!forwardRes.ok) {
      const errText = await forwardRes.text();
      console.error('n8n error:', forwardRes.status, errText);
      // Return 200 with error payload so the client can display a friendly message
      return new Response(
        JSON.stringify({ error: 'Webhook failed', status: forwardRes.status, body: errText }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to parse JSON; if text, wrap into expected shape
    let responseData: any = null;
    const contentType = forwardRes.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      responseData = await forwardRes.json();
    } else {
      const text = await forwardRes.text();
      responseData = { "Cover letter": text };
    }

    if (typeof responseData === 'string') {
      responseData = { "Cover letter": responseData };
    }
    
    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('Edge function error:', e?.message || e);
    return new Response(
      JSON.stringify({ error: 'Internal error', message: e?.message || 'unknown' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});