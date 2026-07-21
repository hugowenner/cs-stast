import { NextResponse } from "next/server";
import type { ZodType } from "zod";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function parseJsonBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, "Corpo da requisição não é um JSON válido");
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new HttpError(
      400,
      result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
    );
  }
  return result.data;
}

export function parseQuery<T>(searchParams: URLSearchParams, schema: ZodType<T>): T {
  const result = schema.safeParse(Object.fromEntries(searchParams));
  if (!result.success) {
    throw new HttpError(
      400,
      result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
    );
  }
  return result.data;
}

export function handleRouteError(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "Erro interno" }, { status: 500 });
}
