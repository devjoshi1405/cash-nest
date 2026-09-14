import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { Database } from "./database.types";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  // If Supabase credentials are placeholder / not set, allow request to proceed without crashing
  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("your-project")) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: Avoid using getSession() as it is not guaranteed to be authentic on the server.
  // Using getUser() validates the token against Supabase Auth servers.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isPublicAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  const isProtectedRoute =
    pathname.startsWith("/home") ||
    pathname.startsWith("/shop") ||
    pathname.startsWith("/settings") ||
    pathname === "/";

  // Redirect unauthenticated users from protected routes to /login
  if (!user && isProtectedRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    if (pathname !== "/" && pathname !== "/home/dashboard") {
      redirectUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users from login/signup to dashboard (or requested next page)
  if (user && isPublicAuthRoute) {
    const nextParam = request.nextUrl.searchParams.get("next");
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.search = "";
    redirectUrl.pathname =
      nextParam && nextParam.startsWith("/") && !nextParam.startsWith("/login")
        ? nextParam
        : "/home/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
