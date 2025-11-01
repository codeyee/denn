import LoginForm from "@/app/_components/forms/LoginForm";
import TopMenu from "@/app/_components/TopMenu";

export default function LoginPage() {
  return (
    <>
      <TopMenu />
      <div className="min-h-screen flex items-center justify-center p-4 pt-20">
        <LoginForm />
      </div>
    </>
  );
}
