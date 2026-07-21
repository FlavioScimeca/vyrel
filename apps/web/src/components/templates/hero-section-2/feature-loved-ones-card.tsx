import { IconUser, IconUsers } from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";

export function FeatureLovedOnesCard() {
  return (
    <Card className="card variant-outlined relative col-span-full overflow-hidden lg:col-span-3">
      <CardContent className="grid h-full pt-6 sm:grid-cols-2">
        <div className="relative z-10 flex flex-col justify-between space-y-12 lg:space-y-6">
          <div className="relative flex aspect-square size-12 rounded-full border before:absolute before:-inset-2 before:rounded-full before:border dark:border-white/10 dark:before:border-white/5">
            <IconUsers className="m-auto size-6" strokeWidth={1} />
          </div>
          <div className="space-y-2">
            <h2 className="font-medium text-lg transition">
              Keep your loved ones safe
            </h2>
            <p className="text-foreground">
              Voluptate. magnam magni doloribus dolores voluptates a sapiente
              inventore nisi.
            </p>
          </div>
        </div>
        <div className="relative mt-6 before:absolute before:inset-0 before:mx-auto before:w-px before:bg-(--color-border) sm:-my-6 sm:-mr-6">
          <div className="relative flex h-full flex-col justify-center space-y-6 py-6">
            <div className="relative flex w-[calc(50%+0.875rem)] items-center justify-end gap-2">
              <span className="block h-fit rounded border px-2 py-1 text-xs shadow-sm">
                Likeur
              </span>
              <div className="size-7 ring-4 ring-background">
                <IconUser />
              </div>
            </div>
            <div className="relative ml-[calc(50%-1rem)] flex items-center gap-2">
              <div className="size-8 ring-4 ring-background">
                <IconUser />
              </div>
              <span className="block h-fit rounded border px-2 py-1 text-xs shadow-sm">
                M. Irung
              </span>
            </div>
            <div className="relative flex w-[calc(50%+0.875rem)] items-center justify-end gap-2">
              <span className="block h-fit rounded border px-2 py-1 text-xs shadow-sm">
                B. Ng
              </span>
              <div className="size-7 ring-4 ring-background">
                <IconUser />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
