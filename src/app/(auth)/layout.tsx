import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4F0FF] via-[#FFF7EC] to-[#F4F0FF] flex items-center justify-center p-4">
      {children}
    </div>
  );
}
