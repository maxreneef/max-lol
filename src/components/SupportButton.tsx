"use client";

import Link from "next/link";

const KOFI = process.env.NEXT_PUBLIC_KOFI_USERNAME ?? "maxreneef";

export function SupportButton() {
  const href = KOFI ? `https://ko-fi.com/${KOFI}` : "/suporte";
  const external = !!KOFI;

  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="support-float-btn"
      title="Apoiar o Max LoL"
    >
      ☕
    </Link>
  );
}
