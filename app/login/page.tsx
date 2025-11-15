"use client";

import { Suspense } from "react";
import LoginForm from "@/app/_components/forms/LoginForm";
import { Navbar } from "@/app/_components/layout/Navbar";
import { Footer } from "@/app/_components/layout/Footer";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background-logged-in">
      <Suspense fallback={null}>
        <Navbar />
      </Suspense>
      <div className="flex-1 flex items-center justify-center p-4 pt-20">
        <LoginForm />
      </div>
      <Footer />

      {/* Bottom gradient */}
      <div className="pointer-events-none fixed left-0 right-0 bottom-0 h-16 bg-bottom-gradient z-10" />
    </div>
  );
}
