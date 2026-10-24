import { backendFetch } from "@/lib/backend";

export async function DELETE(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return backendFetch(`/documents/${encodeURIComponent(name)}`, { method: "DELETE" });
}
