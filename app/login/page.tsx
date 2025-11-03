import LoginForm from "@/app/_components/forms/LoginForm";
import Navbar from "@/app/_components/layout/Navbar";
import Footer from "@/app/_components/layout/Footer";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background-logged-in">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-4 pt-20">
        <LoginForm />
      </div>
      <Footer />
    </div>
  );
}
