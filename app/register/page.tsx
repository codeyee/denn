"use client";

import { Suspense } from "react";
import RegisterForm from "@/app/_components/forms/RegisterForm";
import Navbar from "@/app/_components/layout/Navbar";
import Footer from "@/app/_components/layout/Footer";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background-logged-in">
      <Suspense fallback={null}>
        <Navbar />
      </Suspense>
      <div className="flex-1 flex items-center justify-center px-4 pt-20">
        <RegisterForm />
      </div>
      <Footer />
    </div>
  );
}
