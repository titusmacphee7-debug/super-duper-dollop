import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError } from "./errors";

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function fail(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/** Wrap a route body: map ApiError -> its status, ZodError -> 400, else 500. */
export async function handle(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError) return fail(e.status, e.message);
    if (e instanceof ZodError) return fail(400, e.errors.map((x) => x.message).join("; "));
    console.error("[api] unhandled error", e);
    return fail(500, "internal error");
  }
}
