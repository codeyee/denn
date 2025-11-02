import LoginForm from "@/app/_components/forms/LoginForm";
import TopMenu from "@/app/_components/TopMenu";
import Footer from "@/app/_components/Footer";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <TopMenu />
      <div className="flex-1 flex items-center justify-center p-4 pt-20">
        <LoginForm />
      </div>
      <Footer />
    </div>
  );
}
