import RegisterForm from "@/app/_components/Register";
import TopMenu from "@/app/_components/TopMenu";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <TopMenu />
      <div className="flex-1 flex items-center justify-center px-4 pt-20">
        <RegisterForm />
      </div>
    </div>
  );
}
