"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`nav-bar ${scrolled ? "scrolled" : ""}`}>
      <Link href="/" className="nav-logo">LEXTRACK AI</Link>
      <nav className="flex items-center gap-6">
        <Link href="/discover" className={pathname === "/discover" ? "nav-link-active" : "nav-link"}>
          Discover
        </Link>
        <Link href="/dashboard" className={pathname === "/dashboard" ? "nav-link-active" : "nav-link"}>
          Dashboard
        </Link>
      </nav>
    </header>
  );
}
