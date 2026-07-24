import { Link } from "@tanstack/react-router";

import { Button } from "@/components/common/ui/Button";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background-logged-in">
      <Navbar />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-[75vh] items-center justify-center px-6 pt-24"
      >
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-bold">Page not found</h1>
          <p className="mt-3 text-gray-200">
            The address may be outdated, or the page may have moved.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Return home</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
