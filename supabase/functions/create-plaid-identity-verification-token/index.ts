// Supabase Edge Function to create Plaid Link Token for Identity Verification
// In sandbox mode, uses 'auth' product since 'identity_verification' requires production access
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID')!;
const PLAID_SECRET = Deno.env.get('PLAID_SECRET')!;
const PLAID_ENV = Deno.env.get('PLAID_ENV') || 'sandbox';
const PLAID_REDIRECT_URI = Deno.env.get('PLAID_REDIRECT_URI');

interface PlaidLinkTokenRequest {
  user: {
    client_user_id: string;
    email_address?: string;
  };
  client_name: string;
  products: string[];
  country_codes: string[];
  language: string;
  redirect_uri?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log('🚀 Edge Function loaded - create-plaid-identity-verification-token');

serve(async (req) => {
  console.log('📥 Request received:', req.method, req.url);

  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request - returning CORS headers');
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('🔍 Step 1: Processing POST request');
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
    console.log('✅ Step 2: Supabase client created');

    // Get the user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      console.error('❌ User not authenticated');
      throw new Error('User not authenticated');
    }

    console.log('✅ Step 3: User authenticated:', user.id);

    // Create user object (include email for fraud checks as per Plaid recommendation)
    const userObject: any = { client_user_id: user.id };
    if (user.email) {
      userObject.email_address = user.email;
    }
    console.log('📝 User object for Plaid:', userObject);

    console.log('🔗 Step 4: Calling Plaid API to create link token');
    console.log('📍 Plaid Environment:', PLAID_ENV);

    // Create Plaid Link token request
    // NOTE: Using 'auth' product for sandbox compatibility
    // In production, you would use 'identity_verification' product
    const plaidRequest: PlaidLinkTokenRequest = {
      user: userObject,
      client_name: 'InkStash',
      products: ['auth'], // Using 'auth' product for sandbox compatibility
      country_codes: ['US'],
      language: 'en',
    };

    // Add redirect_uri if provided
    if (PLAID_REDIRECT_URI) {
      plaidRequest.redirect_uri = PLAID_REDIRECT_URI;
    }

    console.log('📤 Plaid request body:', JSON.stringify(plaidRequest, null, 2));

    const tokenResponse = await fetch(`https://${PLAID_ENV}.plaid.com/link/token/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
        'PLAID-SECRET': PLAID_SECRET,
      },
      body: JSON.stringify(plaidRequest),
    });

    console.log('📨 Plaid response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('❌ Plaid error response:', errorData);
      throw new Error(`Plaid error: ${errorData}`);
    }

    console.log('✅ Successfully created Plaid link token');

    const data = await tokenResponse.json();

    return new Response(
      JSON.stringify({
        link_token: data.link_token,
        expiration: data.expiration,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to create token',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
