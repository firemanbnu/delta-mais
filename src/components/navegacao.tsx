"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookCheck,
  CalendarDays,
  CalendarRange,
  FileCheck2,
  Flame,
  House,
  LayoutDashboard,
  Settings,
  Truck,
  UserRound,
  UsersRound,
} from "lucide-react";

const ITENS_ESCALAS = [
  { href: "/plantao", rotulo: "Painel", icone: LayoutDashboard },
  { href: "/escala", rotulo: "Escalas", icone: CalendarRange },
  { href: "/pessoas", rotulo: "Quadro", icone: UserRound },
  { href: "/ausencias", rotulo: "Férias e atestados", icone: CalendarDays },
  { href: "/postos", rotulo: "Vagas", icone: Truck },
  { href: "/configuracoes", rotulo: "Configurações", icone: Settings },
] as const;

const ITENS_GESTAO = [
  { href: "/gestao", rotulo: "Gestão", icone: LayoutDashboard },
  { href: "/gestao/documentos", rotulo: "Documentos", icone: FileCheck2 },
  { href: "/gestao/catalogo", rotulo: "Catálogo", icone: BookCheck },
  { href: "/gestao/efetivo", rotulo: "Efetivo", icone: UsersRound },
] as const;

/** Item ativo: a rota exata ou uma subrota dela, sem confundir "/gestao" com as filhas. */
function itemAtivo(pathname: string, href: string, itens: readonly { href: string }[]): boolean {
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  // Se outro item for mais específico para essa rota, ele é o ativo.
  return !itens.some((i) => i.href !== href && i.href.startsWith(href) && pathname.startsWith(i.href));
}

export function Navegacao() {
  const pathname = usePathname();
  const naGestao = pathname.startsWith("/gestao");
  const naEntrada = pathname === "/";
  const itens = naGestao ? ITENS_GESTAO : ITENS_ESCALAS;

  return (
    <header className="sem-impressao sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:gap-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Flame className="size-5 text-orange-500" aria-hidden />
          <span>
            Delta Mais
            <span className="ml-2 hidden text-xs font-normal text-muted-foreground sm:inline">
              {naGestao ? "gestão do efetivo" : "plantão noturno 12x36"}
            </span>
          </span>
        </Link>

        {naEntrada ? null : (
          /* No celular o menu fica numa linha só e rola para o lado. */
          <nav
            aria-label="Principal"
            className="-mx-4 flex items-center gap-1 overflow-x-auto px-4 text-sm [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
          >
            <Link
              href="/"
              className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
            >
              <House className="size-4" aria-hidden />
              Início
            </Link>
            {itens.map(({ href, rotulo, icone: Icone }) => {
              const ativo = itemAtivo(pathname, href, itens);
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
        )}
      </div>
    </header>
  );
}
