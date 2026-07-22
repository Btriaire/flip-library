// Proxy to Jarvis' NEWPI digest endpoint (pre-generated, refreshed twice a day server-side).
const JARVIS_API = process.env.JARVIS_API_URL || "http://46.202.131.240:9999";

export async function GET() {
  try {
    const res = await fetch(`${JARVIS_API}/api/newpi/digest`, { cache: "no-store" });
    const data = await res.json();
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { success: false, error: (error as Error).message },
      { status: 502 }
    );
  }
}
