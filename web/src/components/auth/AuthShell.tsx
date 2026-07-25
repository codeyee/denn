import type { ReactNode } from "react";

import { AuthBackdrop } from "./AuthBackdrop";

type AuthShellProps = {
  children: ReactNode;
  mode: "login" | "register";
};

export function AuthShell({ children, mode }: AuthShellProps) {
  return (
    <div className="relative h-svh overflow-hidden bg-[#12040f] text-white">
      <AuthBackdrop />
      <main
        id="main-content"
        tabIndex={-1}
        className="relative z-30 flex h-svh items-center justify-center overflow-hidden p-3 sm:p-5"
      >
        <section
          aria-label={mode === "login" ? "Sign in" : "Create account"}
          className={`w-full max-w-md rounded-2xl border border-white/15 bg-[#120c12]/94 backdrop-blur-xl lg:max-w-lg ${
            mode === "register"
              ? "p-5 sm:p-7 lg:p-9"
              : "p-6 sm:p-8 lg:p-10"
          }`}
        >
          {children}
        </section>
      </main>
    </div>
  );
}
