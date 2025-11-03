"use client";

import { ProtectedRoute } from "@/app/_components/ProtectedRoute";
import { useAuth } from "@/app/_hooks/useAuth";
import { Button } from "@/app/_components/ui/button";
import { Card } from "@/app/_components/ui/card";
import Navbar from "@/app/_components/layout/Navbar";
import Footer from "@/app/_components/layout/Footer";

export default function ProfilePage() {
  const { user, logout } = useAuth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 p-8 pt-24">
          <Card className="max-w-2xl mx-auto p-8">
            <h1 className="text-3xl font-bold mb-6">Profile</h1>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Username</p>
                <p className="text-lg font-semibold">{user?.username}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                <p className="text-lg font-semibold">{user?.email}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">User ID</p>
                <p className="text-lg font-mono">{user?.id}</p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button 
                onClick={logout}
                variant="destructive"
                className="cursor-pointer"
              >
                Logout
              </Button>
            </div>
          </Card>
        </div>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
