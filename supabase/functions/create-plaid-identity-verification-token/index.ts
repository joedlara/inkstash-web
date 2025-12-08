// Supabase Edge Function to create Plaid Link Token for Identity Verification
// Following the flow from Plaid documentation
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID')!;
const PLAID_SECRET = Deno.env.get('PLAID_SECRET')!;
const PLAID_ENV = Deno.env.get('PLAID_ENV') || 'sandbox';
const ID_VER_TEMPLATE = Deno.env.get('PLAID_IDENTITY_VERIFICATION_TEMPLATE_ID')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    console.log('Creating IDV for user:', user.id);

    // Create user object (include email for fraud checks as per Plaid recommendation)
    const userObject: any = { client_user_id: user.id };
    if (user.email) {
      userObject.email_address = user.email;
    }

    // Create Link Token with identity_verification product
    const tokenResponse = await fetch(`https://${PLAID_ENV}.plaid.com/link/token/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
        'PLAID-SECRET': PLAID_SECRET,
      },
      body: JSON.stringify({
        user: userObject,
        products: ['identity_verification'],
        identity_verification: {
          template_id: ID_VER_TEMPLATE,
        },
        client_name: 'InkStash',
        language: 'en',
        country_codes: ['US'],
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Plaid error:', errorData);
      throw new Error(`Plaid error: ${errorData}`);
    }

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
    console.error('Error:', error);
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
