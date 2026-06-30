export const runtime = "edge";

export async function GET() {
  return new Response(
    JSON.stringify({
      success: true,
      notificationsDisabled: true,
      message: "Daily reminders are disabled",
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
