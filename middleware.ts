import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/internal/login", "/auth", "/onboard", "/api/webhooks", "/api/cron"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // /staff and /owner share the same internal login page and role checks -
  // handle them first so the generic "no session -> /login" catch-all below
  // never sees these paths.
  if (pathname.startsWith("/staff")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/internal/login";
      return NextResponse.redirect(url);
    }
    const { data: teamRow } = await supabase.from("team_members").select("id").eq("id", user.id).maybeSingle();
    if (!teamRow) {
      const url = request.nextUrl.clone();
      url.pathname = "/internal/login";
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (pathname.startsWith("/owner")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/internal/login";
      return NextResponse.redirect(url);
    }
    const { data: ownerRow } = await supabase.from("owners").select("id").eq("id", user.id).maybeSingle();
    if (!ownerRow) {
      const url = request.nextUrl.clone();
      url.pathname = "/internal/login";
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (!user && !isPublic) {
    const host = request.headers.get("host") ?? "";
    const internalDomain = process.env.NEXT_PUBLIC_INTERNAL_PORTAL_DOMAIN;
    const url = request.nextUrl.clone();
    url.pathname = internalDomain && host.startsWith(internalDomain) ? "/internal/login" : "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
