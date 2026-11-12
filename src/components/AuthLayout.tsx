import type { ReactNode } from "react";
import signinArt from "@/assets/auth-signin.jpg";
import signupArt from "@/assets/auth-signup.jpg";

export function AuthLayout({ title, sub, children, variant = "signin" }: { title: string; sub: string; children: ReactNode; variant?: "signin" | "signup" }) {
  const isSignup = variant === "signup";
  const art = isSignup ? signupArt : signinArt;
  return (
    <div className="auth-stage mx-auto w-full max-w-5xl">
      <div
        key={variant}
        className={`auth-flip ${isSignup ? "auth-flip-right" : "auth-flip-left"} grid overflow-hidden rounded-3xl border border-border bg-card shadow-xl md:grid-cols-2`}
      >
        <aside className={`relative aspect-[4/5] max-h-[420px] overflow-hidden bg-primary/10 md:aspect-auto md:max-h-none md:min-h-[600px] ${isSignup ? "md:order-2" : "md:order-1"}`}>
          <img src={art} alt="Apex SMM World" width={1024} height={1280} className="absolute inset-0 h-full w-full object-cover object-center" />
        </aside>
        <section className={`p-5 sm:p-8 md:p-10 ${isSignup ? "md:order-1" : "md:order-2"}`}>
          <h1 className="text-2xl font-extrabold md:text-3xl">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">{sub}</p>
          {children}
        </section>
      </div>
    </div>
  );
}
