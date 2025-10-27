import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/_components/ui/card";
import TopMenu from "@/app/_components/TopMenu";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <TopMenu />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Hello World</CardTitle>
          <CardDescription>
            Welcome to your shadcn/ui application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-lg">
            This is a simple Hello World example using the Card component from
            shadcn/ui.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
