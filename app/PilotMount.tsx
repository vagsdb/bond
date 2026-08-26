"use client";

import { usePathname } from "next/navigation";
import PilotBridge from "./PilotBridge";

export default function PilotMount() {
  const pathname = usePathname();
  const isPublicBondHome = pathname === "/" || pathname === "/bond" || pathname === "/bond/";
  return isPublicBondHome ? <PilotBridge /> : null;
}
