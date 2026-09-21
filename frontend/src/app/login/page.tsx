import type { Metadata } from "next";
import { Inter, Roboto } from "next/font/google";
import { LoginContent } from "./LoginContent";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-login-heading" });
const roboto = Roboto({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Masuk · NaviAble",
  alternates: { canonical: '/login' },
  description: "Masuk untuk menambahkan lokasi, melaporkan perubahan, atau menulis review di NaviAble.",
};

export default function LoginPage() {
  return <LoginContent robotoClass={roboto.className} interVar={inter.variable} />;
}
