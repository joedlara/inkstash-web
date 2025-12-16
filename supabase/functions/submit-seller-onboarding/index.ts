// Submit seller onboarding and mark user as verified seller
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SellerVerificationPayload {
  email: string;
  name: string;
}

function generateSellerVerificationEmail(payload: SellerVerificationPayload): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to InkStash Creator Community</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">

  <!-- Header -->
  <div style="background: linear-gradient(135deg, #0078FF 0%, #005ACC 100%); padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700;">🎉 Welcome to InkStash!</h1>
    <p style="color: white; margin: 15px 0 0 0; font-size: 18px; opacity: 0.95;">You're now a verified creator</p>
  </div>

  <!-- Main Content -->
  <div style="background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

    <!-- Greeting -->
    <div style="margin-bottom: 30px;">
      <p style="font-size: 18px; margin: 0 0 20px 0; color: #333;">Hi ${payload.name || 'there'},</p>
      <p style="font-size: 16px; margin: 0 0 15px 0; line-height: 1.8; color: #555;">
        Thank you for submitting your application to become a verified seller on InkStash! We're thrilled to have you join our community of creators.
      </p>
      <p style="font-size: 16px; margin: 0 0 15px 0; line-height: 1.8; color: #555;">
        We appreciate your interest in sharing your collectibles and connecting with collectors through live streaming. Your application has been received and you're all set to get started!
      </p>
    </div>

    <!-- What's Next Section -->
    <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #0078FF;">
      <h2 style="color: #0078FF; margin: 0 0 15px 0; font-size: 20px; font-weight: 600;">What's Next?</h2>
      <p style="font-size: 15px; margin: 0 0 12px 0; color: #555; line-height: 1.7;">
        You'll receive updates soon on how to start streaming and posting collectibles for sale. In the meantime, you can:
      </p>
      <ul style="margin: 15px 0; padding-left: 20px; color: #555;">
        <li style="margin-bottom: 10px; line-height: 1.6;">Set up your creator profile</li>
        <li style="margin-bottom: 10px; line-height: 1.6;">Add your first collectibles to inventory</li>
        <li style="margin-bottom: 10px; line-height: 1.6;">Explore the Creator Dashboard</li>
        <li style="margin-bottom: 10px; line-height: 1.6;">Plan your first livestream</li>
      </ul>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 35px 0;">
      <a href="https://inkstash.com/creator-dashboard" style="display: inline-block; background: #0078FF; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(0, 120, 255, 0.3);">
        Go to Creator Dashboard
      </a>
    </div>

    <!-- Support Info -->
    <div style="background: #fff8e1; padding: 20px; border-radius: 8px; margin-top: 30px;">
      <p style="margin: 0 0 10px 0; font-size: 15px; color: #666;">
        <strong style="color: #f57c00;">💡 Need Help?</strong>
      </p>
      <p style="margin: 0; font-size: 14px; color: #666; line-height: 1.6;">
        Check out our Creator Handbook or reach out to our support team at <a href="mailto:support@inkstash.com" style="color: #0078FF; text-decoration: none;">support@inkstash.com</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e0e0e0; text-align: center; color: #777; font-size: 14px;">
      <p style="margin: 0 0 10px 0;">
        We're excited to see what you'll create and share with the InkStash community!
      </p>
      <p style="margin: 20px 0 0 0; font-size: 13px;">
        &copy; ${new Date().getFullYear()} InkStash. All rights reserved.
      </p>
    </div>
  </div>

</body>
</html>
  `;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with user auth context to verify user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create admin client with service role to bypass RLS for updating users table
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Parse request body
    const body = await req.json();
    const { agreedToTerms, plaidBankToken, plaidIdentityToken, status } = body;

    console.log('Processing onboarding submission for user:', user.id);
    console.log('Request data:', { agreedToTerms, hasBankToken: !!plaidBankToken, hasIdentityToken: !!plaidIdentityToken, status });

    // Update seller_onboarding table with final submission (uses user context for RLS)
    const { data: onboardingData, error: onboardingError } = await supabaseClient
      .from('seller_onboarding')
      .upsert({
        user_id: user.id,
        agreed_to_terms: agreedToTerms,
        status: 'verified', // Always set to verified when submitting
        current_step: 3, // Mark as completed final step
        bank_connected: !!plaidBankToken,
        identity_verified: !!plaidIdentityToken,
      }, {
        onConflict: 'user_id',
      })
      .select();

    if (onboardingError) {
      console.error('Error updating seller_onboarding:', onboardingError);
      throw onboardingError;
    }
    console.log('✓ seller_onboarding updated successfully:', onboardingData);

    // Update users table to mark as verified seller (uses admin/service role to bypass RLS)
    console.log('Updating users table for user:', user.id);
    const { data: userData, error: userUpdateError } = await supabaseAdmin
      .from('users')
      .update({
        seller_verified: true,
        seller_verified_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('id, seller_verified, seller_verified_at');

    if (userUpdateError) {
      console.error('Error updating users table:', userUpdateError);
      throw userUpdateError;
    }
    console.log('✓ users table updated successfully:', userData);

    // Send verification confirmation email
    try {
      const RESEND_API_KEY = Deno.env.get('VITE_RESEND_API_KEY') || '';
      const emailPayload = {
        email: user.email || '',
        name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Creator',
      };

      console.log('Sending verification confirmation email to:', emailPayload.email);

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Acme <onboarding@resend.dev>',
          to: [emailPayload.email],
          subject: 'Welcome to the InkStash Creator Community!',
          html: generateSellerVerificationEmail(emailPayload),
        }),
      });

      if (emailResponse.ok) {
        console.log('✓ Verification email sent successfully');
      } else {
        console.error('Failed to send verification email:', await emailResponse.text());
      }
    } catch (emailError) {
      // Don't fail the request if email fails
      console.error('Error sending verification email:', emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Seller onboarding completed successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error submitting seller onboarding:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
