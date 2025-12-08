// Supabase Edge Function to create Plaid Link Token for Bank Connection (ACH)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID')!;
const PLAID_SECRET = Deno.env.get('PLAID_SECRET')!;
const PLAID_ENV = Deno.env.get('PLAID_ENV') || 'sandbox'; // sandbox, development, or production
const PLAID_REDIRECT_URI = Deno.env.get('PLAID_REDIRECT_URI')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlaidLinkTokenRequest {
  user: {
    client_user_id: string;
  };
  client_name: string;
  products: string[];
  country_codes: string[];
  language: string;
  redirect_uri?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Create Plaid Link token request
    const plaidRequest: PlaidLinkTokenRequest = {
      user: {
        client_user_id: user.id,
      },
      client_name: 'InkStash',
      products: ['auth'], // 'auth' product for ACH bank account verification
      country_codes: ['US'],
      language: 'en',
    };

    // Add redirect_uri if provided
    if (PLAID_REDIRECT_URI) {
      plaidRequest.redirect_uri = PLAID_REDIRECT_URI;
    }

    // Call Plaid API to create link token
    const plaidResponse = await fetch(`https://${PLAID_ENV}.plaid.com/link/token/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
        'PLAID-SECRET': PLAID_SECRET,
      },
      body: JSON.stringify(plaidRequest),
    });

    if (!plaidResponse.ok) {
      const errorData = await plaidResponse.text();
      console.error('Plaid API error:', errorData);
      throw new Error(`Plaid API error: ${errorData}`);
    }

    const plaidData = await plaidResponse.json();

    return new Response(
      JSON.stringify({
        link_token: plaidData.link_token,
        expiration: plaidData.expiration,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating Plaid bank link token:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to create Plaid bank link token',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
