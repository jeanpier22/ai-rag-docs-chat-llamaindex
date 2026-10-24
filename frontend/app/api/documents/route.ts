import { backendFetch } from "@/lib/backend";

// Indexar un documento puede tardar (embeddings + arranque en frío de Cloud Run)
export const maxDuration = 60;

export async function GET(request: Request) {
  return backendFetch(request, "/documents");
}

export async function POST(request: Request) {
  const form = await request.formData();
  return backendFetch(request, "/documents", { method: "POST", body: form });
}

export async function DELETE(request: Request) {
  return backendFetch(request, "/documents", { method: "DELETE" });
}
