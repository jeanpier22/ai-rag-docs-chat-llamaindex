import { backendFetch } from "@/lib/backend";

export const maxDuration = 60;

export async function POST(request: Request) {
  return backendFetch(request, "/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: await request.text(),
  });
}
