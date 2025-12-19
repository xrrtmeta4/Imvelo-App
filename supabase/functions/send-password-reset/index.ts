import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, resetLink } = await req.json();
    
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const logoUrl = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/assets/email-logo.png`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Imvelo <onboarding@resend.dev>",
        to: [email],
        subject: "Reset Your Imvelo Password",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f6f9fc;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 40px 0;">
                    <table role="presentation" style="width: 100%; max-width: 480px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                      <tr>
                        <td style="padding: 40px 20px; text-align: center;">
                          <img src="${logoUrl}" alt="Imvelo" width="120" height="120" style="display: block; margin: 0 auto 24px;">
                          <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: bold; color: #1a1a1a;">Password Reset Request</h1>
                          <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #4a4a4a;">
                            We received a request to reset your Imvelo account password. Click the button below to create a new password:
                          </p>
                          <a href="${resetLink}" style="display: inline-block; padding: 14px 24px; background-color: #22c55e; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 8px;">
                            Reset Password
                          </a>
                          <p style="margin: 24px 0 0; font-size: 14px; line-height: 20px; color: #6b7280;">
                            If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 24px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                            © ${new Date().getFullYear()} Imvelo. Empowering Eswatini Farmers.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    console.log("Password reset email sent:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error in send-password-reset function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
