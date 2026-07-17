import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { AnimatedGroup } from "@/components/motion-primitives/animated-group";
import { TextEffect } from "@/components/motion-primitives/text-effect";
import { Button } from "@/components/ui/button";
import { HeroHeader } from "./header";

const ctaHref = "#link" as Route;

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: "blur(12px)",
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        type: "spring" as const,
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
};

export function HeroSection() {
  return (
    <>
      <HeroHeader />
      <main className="overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 isolate hidden contain-strict lg:block"
        >
          <div className="absolute top-0 left-0 h-320 w-140 -translate-y-87.5 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]" />
          <div className="absolute top-0 left-0 h-320 w-60 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="absolute top-0 left-0 h-320 w-60 -translate-y-87.5 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
        </div>
        <section>
          <div className="relative pt-24">
            <div className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--color-background)_75%)]" />
            <div className="mx-auto max-w-5xl px-6">
              <div className="sm:mx-auto lg:mt-0 lg:mr-auto">
                <TextEffect
                  as="h1"
                  className="mt-8 max-w-2xl text-balance font-medium text-5xl md:text-6xl lg:mt-16"
                  preset="fade-in-blur"
                  speedSegment={0.3}
                >
                  Build and Ship 10x faster with NS
                </TextEffect>
                <TextEffect
                  as="p"
                  className="mt-8 max-w-2xl text-pretty text-lg"
                  delay={0.5}
                  per="line"
                  preset="fade-in-blur"
                  speedSegment={0.3}
                >
                  Tailwindcss highly customizable components for building modern
                  websites and applications that look and feel the way you mean
                  it.
                </TextEffect>

                <AnimatedGroup
                  className="mt-12 flex items-center gap-2"
                  variants={{
                    container: {
                      visible: {
                        transition: {
                          staggerChildren: 0.05,
                          delayChildren: 0.75,
                        },
                      },
                    },
                    ...transitionVariants,
                  }}
                >
                  <div
                    className="rounded-[calc(var(--radius-xl)+0.125rem)] border bg-foreground/10 p-0.5"
                    key={1}
                  >
                    <Button
                      className="rounded-xl px-5 text-base"
                      render={
                        <Link href={ctaHref}>
                          <span className="text-nowrap">Start Building</span>
                        </Link>
                      }
                      size="lg"
                    />
                  </div>
                  <Button
                    className="h-10.5 rounded-xl px-5 text-base"
                    key={2}
                    render={
                      <Link href={ctaHref}>
                        <span className="text-nowrap">Request a demo</span>
                      </Link>
                    }
                    size="lg"
                    variant="ghost"
                  />
                </AnimatedGroup>
              </div>
            </div>
            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      staggerChildren: 0.05,
                      delayChildren: 0.75,
                    },
                  },
                },
                ...transitionVariants,
              }}
            >
              <div className="mask-b-from-55% relative mt-8 -mr-56 overflow-hidden px-2 sm:mt-12 sm:mr-0 md:mt-20">
                <div className="relative inset-shadow-2xs mx-auto max-w-5xl overflow-hidden rounded-2xl border bg-background p-4 shadow-lg shadow-zinc-950/15 ring-1 ring-background dark:inset-shadow-white/20">
                  <Image
                    alt="app screen"
                    className="relative hidden aspect-15/8 rounded-2xl bg-background dark:block"
                    height="1440"
                    src="/mail2.png"
                    width="2700"
                  />
                  <Image
                    alt="app screen"
                    className="relative z-2 aspect-15/8 rounded-2xl border border-border/25 dark:hidden"
                    height="1440"
                    src="/mail2-light.png"
                    width="2700"
                  />
                </div>
              </div>
            </AnimatedGroup>
          </div>
        </section>
      </main>
    </>
  );
}
