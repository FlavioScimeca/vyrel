"use client";

import {
  buttonVariants,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@vyrel/shared/ui";
import type { Route } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function AuthEmailVerifiedScreen() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="font-heading text-2xl tracking-tight">
            Email confirmed
          </CardTitle>
          <CardDescription>
            Your email address is verified. You can continue using vyrel.
          </CardDescription>
        </CardHeader>
        <CardContent />
        <CardFooter className="flex flex-col gap-2">
          <Link
            className={cn(buttonVariants({ size: "lg" }), "w-full")}
            href={"/dashboard" as Route}
          >
            Go to dashboard
          </Link>
          <Link
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "w-full"
            )}
            href={"/onboarding" as Route}
          >
            Set up organization
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
