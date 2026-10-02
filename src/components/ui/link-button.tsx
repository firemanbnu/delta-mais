import Link from "next/link";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";

type PropsBotaoLink = Omit<ComponentProps<typeof Button>, "render"> & { href: string };

/** Button do Base UI renderizado como link do Next (substitui o antigo `asChild`). */
export function BotaoLink({ href, children, ...props }: PropsBotaoLink) {
  return (
    <Button {...props} render={<Link href={href} />}>
      {children}
    </Button>
  );
}
