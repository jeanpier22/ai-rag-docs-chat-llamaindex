// Cliente del backend FastAPI. Solo se usa en el servidor (rutas /api/*),
// así la API_KEY nunca llega al navegador.

const BACKEND_URL = process.env.BACKEND_URL;
const API_KEY = process.env.API_KEY;

// IP real del visitante. Vercel la entrega en x-forwarded-for (la primera de la lista).
function visitorIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() || request.headers.get("x-real-ip");
}

export async function backendFetch(request: Request, path: string, init: RequestInit = {}): Promise<Response> {
  if (!BACKEND_URL || !API_KEY) {
    return Response.json(
      { detail: "Faltan las variables BACKEND_URL o API_KEY en el frontend." },
      { status: 500 },
    );
  }

  const headers = new Headers(init.headers);
  headers.set("X-API-Key", API_KEY);
  // El backend limita las peticiones por visitante (rate limiting) usando esta IP
  const ip = visitorIp(request);
  if (ip) headers.set("X-Client-IP", ip);
  // Evita la página de aviso que ngrok muestra en su plan gratuito
  headers.set("ngrok-skip-browser-warning", "true");

  try {
    const res = await fetch(new URL(path, BACKEND_URL), { ...init, headers, cache: "no-store" });
    return new Response(await res.text(), {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
    });
  } catch {
    return Response.json(
      { detail: "No se pudo conectar con el backend. Revisa que FastAPI y ngrok estén encendidos en tu PC." },
      { status: 502 },
    );
  }
}
