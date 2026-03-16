/**
 * Email notifications via Supabase Edge Function (Resend)
 * Requires: supabase functions deploy send-notification
 * Set secret: supabase secrets set RESEND_API_KEY=re_xxxxx
 *
 * Notification types:
 * - payment-proof-submitted (id: payment_request id) -> emails landlord
 * - payment-proof-accepted (id: payment_request id) -> emails tenant
 * - payment-proof-declined (id: payment_request id) -> emails tenant
 * - request-accepted (id: apartment_request id) -> emails tenant
 * - request-rejected (id: apartment_request id) -> emails tenant
 */

async function sendNotification(supabaseClient, { type, id }) {
  if (!type || !id) {
    console.warn("sendNotification: missing type or id");
    return { success: false, error: "Missing type or id" };
  }

  try {
    const { data, error } = await supabaseClient.functions.invoke("send-notification", {
      body: { type, id },
    });

    if (error) {
      console.error("sendNotification error:", error);
      return { success: false, error: error.message };
    }

    if (data?.error) {
      console.error("sendNotification function error:", data.error);
      return { success: false, error: data.error };
    }

    return { success: true };
  } catch (err) {
    console.error("sendNotification exception:", err);
    return { success: false, error: String(err) };
  }
}
