"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CirclePlus, ChartPie, Settings, CircleArrowUp, MessageCircle } from "lucide-react";

const navItems = [
  {
    href: "/expenses",
    icon: CirclePlus,
    label: "Expenses",
  },
  {
    href: "/income",
    icon: CircleArrowUp,
    label: "Income",
  },
  {
    href: "/dashboard",
    icon: ChartPie,
    label: "Dashboard",
  },
  {
    href: "/chat",
    icon: MessageCircle,
    label: "Chat",
  },
  {
    href: "/settings",
    icon: Settings,
    label: "Settings",
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 md:hidden">
      <div className="flex justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileTap={{ scale: 0.95 }}
                className={`flex flex-col items-center p-2 min-w-[44px] min-h-[44px] justify-center ${isActive ? "text-black" : "text-gray-400"
                  }`}
              >
                <Icon size={24} />
                <span className={`text-xs mt-1 ${isActive ? "font-medium" : "font-normal"
                  }`}>{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
