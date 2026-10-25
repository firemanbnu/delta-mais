"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CalendarRange, Flame, Settings, Truck, UserRound } from "lucide-react";

const ITENS = [
  { href: "/", rotulo: "Painel", icone: Flame },
  { href: "/escala", rotulo: "Escalas", icone: CalendarRange },
  { href: "/pessoas", rotulo: "Quadro", icone: UserRound },
  { href: "/ausencias", rotulo: "Férias e atestados", icone: CalendarDays },
  { href: "/postos", rotulo: "Vagas", icone: Truck },
  { href: "/configuracoes", rotulo: "Configurações", icone: Settings },
] as const;

export function Navegacao() {
  const pathname = usePathname();

  return (
    <header className="sem-impressao sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:gap-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Flame className="size-5 text-orange-500" aria-hidden />
          <span>
            Escala de Serviço
            <span className="ml-2 hidden text-xs font-normal text-muted-foreground sm:inline">
              plantão noturno 12x36
            </span>
          </span>
        </Link>

        {/* No celular o menu fica numa linha só e rola para o lado. */}
        <nav
          aria-label="Principal"
          className="-mx-4 flex items-center gap-1 overflow-x-auto px-4 text-sm [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
        >
          {ITENS.map(({ href, rotulo, icone: Icone }) => {
            const ativo = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={ativo ? "page" : undefined}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 transition-colors ${
                  ativo
                    ? "bg-secondary font-medium text-secondary-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                <Icone className="size-4" aria-hidden />
                {rotulo}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
