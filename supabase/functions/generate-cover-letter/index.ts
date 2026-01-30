import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CoverLetterRequest {
  jobContent: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    // Authenticate the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error('JWT validation failed:', claimsError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email as string;

    if (!userEmail) {
      console.error('No email found in JWT claims for user:', userId);
      return new Response(
        JSON.stringify({ error: 'User email not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', userId, userEmail);

    const { jobContent }: CoverLetterRequest = await req.json();

    if (!jobContent) {
      return new Response(
        JSON.stringify({ error: 'jobContent is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      return new Response(
        JSON.stringify({ error: 'Failed to generate cover letter. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to parse JSON; be resilient and normalize to { "Cover letter": string }
    const rawContentType = forwardRes.headers.get('content-type') || '';
    const rawBody = await forwardRes.text();

    console.log('n8n content-type:', rawContentType);
    console.log('n8n body preview:', rawBody?.slice(0, 400));

    let parsed: unknown = null;
    try {
      if (rawContentType.includes('application/json')) {
        parsed = JSON.parse(rawBody);
      }
    } catch (err) {
      console.warn('Failed to parse n8n JSON:', (err as Error)?.message);
    }

    const extractCoverLetter = (val: unknown): string | null => {
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
        const obj = val as Record<string, unknown>;
        // Direct known keys variations
        for (const key of Object.keys(obj)) {
          const lower = key.toLowerCase();
          if (lower === 'cover letter' || lower === 'cover_letter' || lower === 'coverletter') {
            const r = extractCoverLetter(obj[key]);
            if (r) return r;
          }
        }
        // Common wrappers
        for (const key of ['data', 'result', 'payload', 'response', 'body']) {
          if (key in obj) {
            const r = extractCoverLetter(obj[key]);
            if (r) return r;
          }
        }
        // Text-like fallbacks
        for (const key of ['text', 'message', 'content', 'output']) {
          const v = obj[key];
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
        JSON.stringify({ error: 'No cover letter found in response. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ "Cover letter": coverLetter }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'unknown';
    console.error('Edge function error:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'An error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
