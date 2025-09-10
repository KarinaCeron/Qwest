import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CoverLetterRequest {
  jobContent: string;
  company: string;
  role: string;
  userEmail: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { jobContent, company, role, userEmail }: CoverLetterRequest = await req.json();

    console.log('Received cover letter request:', {
      userEmail,
      company,
      role,
      jobContentLength: jobContent?.length || 0
    });

    // Validate required fields
    if (!jobContent || !userEmail) {
      return new Response(
        JSON.stringify({ error: 'jobContent and userEmail are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Call the n8n webhook
    const webhookResponse = await fetch('https://karinaceron.app.n8n.cloud/webhook/aa37d714-c706-410e-9670-197cb1267e6e', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobContent,
        company: company || '',
        role: role || '',
        userEmail,
        timestamp: new Date().toISOString(),
        source: 'job-application-tracker'
      }),
    });

    console.log('n8n webhook response status:', webhookResponse.status);

    if (!webhookResponse.ok) {
      console.error('n8n webhook failed:', webhookResponse.status, webhookResponse.statusText);
      throw new Error(`Webhook failed with status: ${webhookResponse.status}`);
    }

    // Try to get response data from n8n
    let webhookData;
    try {
      webhookData = await webhookResponse.json();
    } catch (e) {
      // If response is not JSON, just get text
      webhookData = { message: await webhookResponse.text() };
    }

    console.log('Cover letter generation successful');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cover letter generation initiated successfully',
        data: webhookData
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-cover-letter function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate cover letter', 
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});