"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AuthSucceededScreen() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="font-heading text-2xl tracking-tight">
            Signed in
          </CardTitle>
          <CardDescription>
            You can close this tab and return to the Vyrel extension. Open the
            extension popup and press Check again to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            render={<Link href="/dashboard" />}
            size="lg"
          >
            Go to dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
