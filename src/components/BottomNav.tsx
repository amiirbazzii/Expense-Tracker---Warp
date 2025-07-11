"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, BarChart3, Settings, TrendingUp } from "lucide-react";

const navItems = [
  {
    href: "/expenses",
    icon: Plus,
    label: "Expenses",
  },
  {
    href: "/income",
    icon: TrendingUp,
    label: "Income",
  },
  {
    href: "/dashboard",
    icon: BarChart3,
    label: "Dashboard",
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
                className={`flex flex-col items-center p-2 min-w-[44px] min-h-[44px] justify-center ${
                  isActive ? "text-blue-600" : "text-gray-600"
                }`}
              >
                <Icon size={20} />
                <span className="text-xs mt-1">{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
