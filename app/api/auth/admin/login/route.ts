import { type NextRequest } from "next/server";
import { z } from "zod";
import { setAdminSession } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body tidak valid" },
      { status: 400 },
    );
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validasi gagal", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  // Debug — hapus setelah login berhasil
  console.log("[LOGIN] ADMIN_EMAIL from env:", JSON.stringify(adminEmail));
  console.log(
    "[LOGIN] ADMIN_PASSWORD from env:",
    JSON.stringify(adminPassword),
  );
  console.log("[LOGIN] input email:", JSON.stringify(email));
  console.log("[LOGIN] input password:", JSON.stringify(password));

  if (!adminEmail || !adminPassword) {
    console.error("[ADMIN LOGIN] env vars not configured");
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const emailMatch = email.toLowerCase() === adminEmail.toLowerCase();
  const passwordMatch = password === adminPassword;

  console.log(
    "[LOGIN] emailMatch:",
    emailMatch,
    "passwordMatch:",
    passwordMatch,
  );

  if (!emailMatch || !passwordMatch) {
    return Response.json(
      { error: "Email atau password salah", code: "INVALID_CREDENTIALS" },
      { status: 401 },
    );
  }

  await setAdminSession(adminEmail);
  return Response.json({ message: "Login berhasil", role: "admin" });
}
