import type { Metadata } from "next";
import { LoginContent } from "./LoginContent";

export const metadata: Metadata = {
  title: "Masuk · NaviAble",
  alternates: { canonical: "/login" },
  description: "Masuk untuk menambahkan lokasi, melaporkan perubahan, atau menulis review di NaviAble.",
};

export default function LoginPage() {
  return <LoginContent />;
}
