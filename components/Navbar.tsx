"use client";

import Link from "next/link";
import React, { ReactNode } from "react";
import NavLink from "../components/NavLink";
import { usePathname } from "next/navigation";

interface NavbarProps {
  children?: ReactNode;
}

export default function Navbar({ children }: NavbarProps) {
  const pathname = usePathname();
  const isActive = pathname === "/";
  return (
    <aside className="w-52 min-h-screen p-6 shadow-2xl fixed top-0 left-0 z-10">
      <Link
        href="/"
        className={`block text-[40px] font-extrabold mb-8 transition-colors duration-300
          ${isActive ? "text-orange-500" : "text-black hover:text-orange-500"}`}
      >
        PLOCLO
      </Link>
      <nav className="mt-10">
        <ul className="">
          <NavLink href="/editProgram">Edit Program</NavLink>
          <NavLink href="/editCourse">Edit Course</NavLink>
          <NavLink href="/viewChart">View Chart</NavLink>
          <NavLink href="/aboutData">About</NavLink>
          <NavLink href="/manageAccount">Manage Account</NavLink>
        </ul>
      </nav>
      {children}
    </aside>
  );
}
