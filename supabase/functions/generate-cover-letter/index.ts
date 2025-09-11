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

    // Try to parse JSON; be resilient and normalize to { "Cover letter": string }
    const rawContentType = forwardRes.headers.get('content-type') || '';
    const rawBody = await forwardRes.text();

    // Log basic debug info (content-type and short preview)
    console.log('n8n content-type:', rawContentType);
    console.log('n8n body preview:', rawBody?.slice(0, 400));

    let parsed: any = null;
    try {
      if (rawContentType.includes('application/json')) {
        parsed = JSON.parse(rawBody);
      }
    } catch (err) {
      console.warn('Failed to parse n8n JSON:', (err as Error)?.message);
    }

    const extractCoverLetter = (val: any): string | null => {
      if (val == null) return null;
      if (typeof val === 'string') return val;
      if (Array.isArray(val)) {
        for (const item of val) {
          const r = extractCoverLetter(item);
          if (r) return r;
        }
        return null;
      }
      if (typeof val === 'object') {
        // Direct known keys variations
        for (const key of Object.keys(val)) {
          const lower = key.toLowerCase();
          if (lower === 'cover letter' || lower === 'cover_letter' || lower === 'coverletter') {
            const r = extractCoverLetter(val[key]);
            if (r) return r;
          }
        }
        // Common wrappers
        for (const key of ['data', 'result', 'payload', 'response', 'body']) {
          if (key in val) {
            const r = extractCoverLetter((val as any)[key]);
            if (r) return r;
          }
        }
        // Text-like fallbacks
        for (const key of ['text', 'message', 'content', 'output']) {
          const v = (val as any)[key];
          if (typeof v === 'string' && v.trim()) return v;
        }
      }
      return null;
    };

    let coverLetter = extractCoverLetter(parsed);
    if (!coverLetter) {
      coverLetter = rawBody?.trim() || null;
    }

    if (!coverLetter) {
      console.error('Could not extract cover letter from n8n response');
      return new Response(
        JSON.stringify({
          error: 'No cover letter found in response',
          debug: { contentType: rawContentType, bodyPreview: rawBody?.slice(0, 500) }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ "Cover letter": coverLetter }),
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