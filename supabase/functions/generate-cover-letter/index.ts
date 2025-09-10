import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CoverLetterRequest {
  jobContent: string;
  company?: string;
  role?: string;
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
    const { jobContent, company = '', role = '', userEmail }: CoverLetterRequest = await req.json();

    if (!jobContent || !userEmail) {
      return new Response(
        JSON.stringify({ error: 'jobContent and userEmail are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Forward to n8n webhook
    const webhookUrl = 'https://karinaceron.app.n8n.cloud/webhook/aa37d714-c706-410e-9670-197cb1267e6e';

    const forwardRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobContent,
        company,
        role,
        userEmail,
        timestamp: new Date().toISOString(),
        via: 'supabase-edge-proxy'
      })
    });

    const text = await forwardRes.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch {}

    if (!forwardRes.ok) {
      console.error('n8n error:', forwardRes.status, text);
      return new Response(
        JSON.stringify({ error: 'Webhook failed', status: forwardRes.status, body: json ?? text }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, body: json ?? text }),
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