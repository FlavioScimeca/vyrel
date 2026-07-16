"use client";

import { Vortex } from "@/components/ui/vortex";

export default function Home() {
  return (
    <div className="grid h-screen w-screen place-items-center bg-black">
      <Vortex arms={5} className="h-[50dvh] w-full" count={6000} speed={1.4} />
    </div>
  );
}
