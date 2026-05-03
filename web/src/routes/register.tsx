import { createFileRoute } from "@tanstack/react-router";

import { RegisterForm } from "@/components/forms/RegisterForm";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const Route = createFileRoute("/register")({
  component: RegisterRoute,
});

function RegisterRoute() {
  return (
    <div className="min-h-screen flex flex-col bg-background-logged-in">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 pt-20">
        <RegisterForm />
      </div>
      <Footer />

      <div className="pointer-events-none fixed left-0 right-0 bottom-0 h-16 bg-bottom-gradient z-10" />
    </div>
  );
}
