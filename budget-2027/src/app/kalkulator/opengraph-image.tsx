import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og/card";

export const alt = "Калкулатор: колко ще получаваш през 2027 г.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return ogCard({ eyebrow: "Калкулатор", title: "Колко ще получаваш през 2027 г.?" });
}
