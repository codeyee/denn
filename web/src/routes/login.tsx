import { createFileRoute } from "@tanstack/react-router";

import { LoginForm } from "@/components/forms/LoginForm";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const Route = createFileRoute("/login")({
  component: LoginRoute,
});

function LoginRoute() {
  return (
    <div className="min-h-screen flex flex-col bg-background-logged-in">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-4 pt-20">
        <LoginForm />
      </div>
      <Footer />

      <div className="pointer-events-none fixed left-0 right-0 bottom-0 h-16 bg-bottom-gradient z-10" />
    </div>
  );
}
