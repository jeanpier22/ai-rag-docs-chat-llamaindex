import { backendFetch } from "@/lib/backend";

export async function DELETE(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return backendFetch(request, `/documents/${encodeURIComponent(name)}`, { method: "DELETE" });
}
