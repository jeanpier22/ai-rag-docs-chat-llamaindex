export type DocumentInfo = {
  name: string;
  pages: number;
  chars: number;
  preview: string;
};

export type Source = {
  file: string | null;
  page: string | null;
  score: number | null;
  text: string;
};

export type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  error?: boolean;
};

// Lee el mensaje de error que devuelve FastAPI ({"detail": "..."})
export async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body.detail === "string") return body.detail;
  } catch {}
  return `Error ${res.status}`;
}
