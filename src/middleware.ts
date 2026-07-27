import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

const publicPrefixes = ["/login", "/api/auth", "/api/robot"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = publicPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!req.auth && !isPublic) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (req.auth && pathname === "/login") {
    const dest =
      req.auth.user.role === UserRole.STUDENT ? "/aluno" : "/cantina";
    return NextResponse.redirect(new URL(dest, req.nextUrl.origin));
  }

  if (req.auth && pathname.startsWith("/cantina")) {
    if (
      req.auth.user.role !== UserRole.ADMIN &&
      req.auth.user.role !== UserRole.OPERATOR
    ) {
      return NextResponse.redirect(new URL("/aluno", req.nextUrl.origin));
    }
  }

  if (req.auth && pathname.startsWith("/aluno")) {
    if (req.auth.user.role !== UserRole.STUDENT) {
      return NextResponse.redirect(new URL("/cantina", req.nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
