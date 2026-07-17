import {
  IconBrandGithub,
  IconBrandLinkedin,
  IconBrandTwitter,
} from "@tabler/icons-react";
import type { Route } from "next";
import Link from "next/link";
import { VyrelLogo } from "@/components/logo";

const links = [
  { label: "Features", href: "#" },
  { label: "Pricing", href: "#" },
  { label: "About", href: "#" },
  { label: "Blog", href: "#" },
  { label: "Contact", href: "#" },
];

const social = [
  { icon: IconBrandTwitter, href: "#", label: "Twitter" },
  { icon: IconBrandGithub, href: "#", label: "GitHub" },
  { icon: IconBrandLinkedin, href: "#", label: "LinkedIn" },
];

export function HeroFooter() {
  return (
    <footer className="@container border-t bg-background py-12">
      <div className="mx-auto max-w-2xl px-6">
        <div className="flex flex-col items-center text-center">
          <Link className="flex items-center gap-2" href="/">
            <VyrelLogo className="h-10 w-10" />
          </Link>
          <nav className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2">
            {links.map((link) => (
              <Link
                className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                href={link.href as Route}
                key={link.label}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-8 flex gap-4">
            {social.map((item) => (
              <Link
                aria-label={item.label}
                className="size-8 rounded-full text-muted-foreground transition-colors hover:text-foreground"
                href={item.href as Route}
                key={item.label}
              >
                <item.icon className="size-4" />
              </Link>
            ))}
          </div>
          <p className="mt-8 text-muted-foreground text-sm">
            &copy; {2026} Veil.
          </p>
        </div>
      </div>
    </footer>
  );
}
