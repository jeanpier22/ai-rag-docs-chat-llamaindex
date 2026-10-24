import { backendFetch } from "@/lib/backend";

// Indexar un documento puede tardar (embeddings + arranque en frío de Cloud Run)
export const maxDuration = 60;

export async function GET() {
  return backendFetch("/documents");
}

export async function POST(request: Request) {
  const form = await request.formData();
  return backendFetch("/documents", { method: "POST", body: form });
}

export async function DELETE() {
  return backendFetch("/documents", { method: "DELETE" });
}
