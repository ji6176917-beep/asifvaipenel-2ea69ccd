import type { ReactNode } from "react";
import signinArt from "@/assets/auth-signin.jpg";
import signupArt from "@/assets/auth-signup.jpg";

export function AuthLayout({ title, sub, children, variant = "signin" }: { title: string; sub: string; children: ReactNode; variant?: "signin" | "signup" }) {
  const art = variant === "signup" ? signupArt : signinArt;
  return (
    <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-border bg-card shadow-xl md:grid-cols-2">
      <aside className="relative aspect-[16/9] overflow-hidden bg-primary/10 md:aspect-auto md:min-h-[600px]">
        <img src={art} alt="Apex SMM World" width={1024} height={1280} className="absolute inset-0 h-full w-full object-cover object-top" />
      </aside>
      <section className="p-5 sm:p-8 md:p-10">
        <h1 className="text-2xl font-extrabold md:text-3xl">{title}</h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">{sub}</p>
        {children}
      </section>
    </div>
  );
}
