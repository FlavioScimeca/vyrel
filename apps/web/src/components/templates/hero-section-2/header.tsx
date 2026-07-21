"use client";
import { IconMenu, IconX } from "@tabler/icons-react";
import { useMotionValueEvent, useScroll } from "motion/react";
import type { Route } from "next";
import Link from "next/link";
import React from "react";
import { VyrelLogo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const menuItems = [
  { name: "Features", href: "#link" as Route },
  { name: "Solution", href: "#link" as Route },
  { name: "Pricing", href: "#link" as Route },
  { name: "About", href: "#link" as Route },
];

export const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  const { scrollYProgress } = useScroll();

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setScrolled(latest > 0.05);
  });

  const toggleMenu = () => {
    setMenuState((open) => !open);
  };

  return (
    <header>
      <nav
        className={cn(
          "fixed z-20 w-full border-b transition-colors duration-150",
          scrolled && "bg-background/50 backdrop-blur-3xl"
        )}
        data-state={menuState && "active"}
      >
        <div className="mx-auto max-w-5xl px-6 transition-all duration-300">
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full items-center justify-between gap-12 lg:w-auto">
              <Link
                aria-label="home"
                className="flex items-center space-x-2"
                href="/"
              >
                <VyrelLogo className="h-10 w-10" />
              </Link>

              <button
                aria-label={menuState === true ? "Close Menu" : "Open Menu"}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
                onClick={toggleMenu}
                type="button"
              >
                <IconMenu className="m-auto size-6 in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 duration-200" />
                <IconX className="absolute inset-0 m-auto size-6 -rotate-180 in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 scale-0 in-data-[state=active]:opacity-100 opacity-0 duration-200" />
              </button>

              <div className="hidden lg:block">
                <ul className="flex gap-8 text-sm">
                  {menuItems.map((item) => (
                    <li key={item.name}>
                      <Link
                        className="block text-muted-foreground duration-150 hover:text-accent-foreground"
                        href={item.href}
                      >
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mb-6 in-data-[state=active]:block hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border bg-background p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:in-data-[state=active]:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
              <div className="lg:hidden">
                <ul className="space-y-6 text-base">
                  {menuItems.map((item) => (
                    <li key={item.name}>
                      <Link
                        className="block text-muted-foreground duration-150 hover:text-accent-foreground"
                        href={item.href}
                      >
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                <Button
                  render={
                    <Link href={"/auth"}>
                      <span>Login</span>
                    </Link>
                  }
                  size="sm"
                  variant="outline"
                />
                <Button
                  render={
                    <Link href={"/auth?mode=signup"}>
                      <span>Sign Up</span>
                    </Link>
                  }
                  size="sm"
                  variant="outline"
                />
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};
