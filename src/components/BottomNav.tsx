"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CirclePlus, ChartPie, Settings } from "lucide-react";

const MotionLink = motion(Link);

const navItems = [
  {
    href: "/add",
    icon: CirclePlus,
    label: "Add",
  },
  {
    href: "/dashboard",
    icon: ChartPie,
    label: "Report",
  },
  {
    href: "/settings",
    icon: Settings,
    label: "Setting",
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 pt-2 pb-3 md:hidden z-40">
      <div className="flex justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href === "/add" && (pathname === "/expenses" || pathname === "/income" || pathname.startsWith("/expenses/edit") || pathname.startsWith("/income/edit")));
          const Icon = item.icon;

          return (
            <MotionLink
              key={item.href}
              href={item.href}
              whileTap={{ scale: 0.95 }}
              className={`flex flex-col items-center p-2 min-w-[44px] min-h-[44px] justify-center ${isActive ? "text-black" : "text-gray-400"
                }`}
            >
              <Icon size={24} className={isActive ? "stroke-[2.5px]" : "stroke-[2px]"} />
              <span className={`text-xs mt-1 ${isActive ? "font-semibold text-black" : "font-normal text-gray-400"
                }`}>{item.label}</span>
            </MotionLink>
          );
        })}
      </div>
    </nav>
  );
}

