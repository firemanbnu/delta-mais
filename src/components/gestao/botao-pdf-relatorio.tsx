"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Loader2, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { A4, cortesDePagina, montarPdf, type PaginaJpeg } from "@/lib/pdf-imagens";

/** Largura da folha A4 a 96 dpi (em pé e deitada). */
const LARGURA_RETRATO = 794;
const LARGURA_PAISAGEM = 1123;
const MARGEM = 38;
/** Nitidez da página no PDF (2 = dobro da tela). */
const AMPLIACAO = 2;

function esperar() {
  return new Promise((r) => setTimeout(r, 80));
}

function baixar(arquivo: File) {
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");
  link.href = url;
  link.download = arquivo.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function canvasParaJpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
  if (!blob) throw new Error("A página saiu vazia.");
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Gera um PDF A4 do relatório (o elemento `alvoId`), com quebras de página
 * entre linhas, e abre o menu de compartilhar do aparelho (WhatsApp). São dois
 * toques, como no botão de imagem: gerar e depois enviar.
 */
export function BotaoPdfRelatorio({
  alvoId,
  nomeArquivo,
  titulo,
  paisagem = false,
}: {
  alvoId: string;
  nomeArquivo: string;
  titulo: string;
  paisagem?: boolean;
}) {
  const [gerando, setGerando] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);

  async function gerar() {
    const alvo = document.getElementById(alvoId);
    if (!alvo) return;
    setGerando(true);
    alvo.classList.add("modo-imagem");
    try {
      const base = paisagem ? LARGURA_PAISAGEM : LARGURA_RETRATO;
      alvo.style.setProperty("width", `${base}px`, "important");
      await esperar();
      const largura = Math.max(base, alvo.scrollWidth);
      alvo.style.setProperty("width", `${largura}px`, "important");
      await esperar();

      const altura = alvo.scrollHeight;
      const folha = paisagem ? { l: A4.altura, a: A4.largura } : { l: A4.largura, a: A4.altura };
      const alturaPagina = Math.floor(largura * (folha.a / folha.l));

      // Pontos onde dá para cortar sem partir uma linha ao meio.
      const topo = alvo.getBoundingClientRect().top;
      const quebras = [...alvo.querySelectorAll("tr, li, h2, h3, header, section, p, thead")]
        .flatMap((el) => {
          const r = el.getBoundingClientRect();
          return [Math.round(r.top - topo), Math.round(r.bottom - topo)];
        });
      const cortes = cortesDePagina(altura, alturaPagina - 2 * MARGEM, quebras);
      const limites = [0, ...cortes, altura];

      const { toCanvas } = await import("html-to-image");
      const filtro = (no: HTMLElement | Node) =>
        !(no instanceof HTMLElement && no.classList.contains("sem-impressao"));
      const paginas: PaginaJpeg[] = [];
      for (let i = 0; i < limites.length - 1; i++) {
        const inicio = limites[i];
        const fim = limites[i + 1];
        const recorte = await toCanvas(alvo, {
          pixelRatio: AMPLIACAO,
          backgroundColor: "#ffffff",
          width: largura,
          height: fim - inicio,
          filter: filtro,
          style: { transform: `translateY(${-inicio}px)`, transformOrigin: "top left" },
        });
        // Folha A4 em branco com o recorte; da 2ª página em diante, com margem no topo.
        const folhaCanvas = document.createElement("canvas");
        folhaCanvas.width = recorte.width;
        folhaCanvas.height = Math.round(alturaPagina * AMPLIACAO);
        const ctx = folhaCanvas.getContext("2d");
        if (!ctx) throw new Error("Canvas indisponível.");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, folhaCanvas.width, folhaCanvas.height);
        ctx.drawImage(recorte, 0, i > 0 ? MARGEM * AMPLIACAO : 0);
        paginas.push({
          jpeg: await canvasParaJpeg(folhaCanvas),
          largura: folhaCanvas.width,
          altura: folhaCanvas.height,
        });
      }

      const pdf = montarPdf(paginas, { paisagem, titulo });
      setArquivo(new File([pdf as BlobPart], nomeArquivo, { type: "application/pdf" }));
      toast.success(`PDF pronto (${paginas.length} ${paginas.length === 1 ? "página" : "páginas"}). Toque em Enviar.`);
    } catch (erro) {
      console.error(erro);
      toast.error("Não foi possível gerar o PDF. Tente de novo.");
    } finally {
      alvo.classList.remove("modo-imagem");
      alvo.style.removeProperty("width");
      setGerando(false);
    }
  }

  async function compartilhar() {
    if (!arquivo) return;
    const dados = { files: [arquivo], title: titulo };
    if (navigator.canShare?.(dados)) {
      try {
        await navigator.share(dados);
        return;
      } catch (erro) {
        if (erro instanceof DOMException && erro.name === "AbortError") return;
      }
    }
    baixar(arquivo);
    toast.info("PDF baixado. Anexe no WhatsApp.");
  }

  if (!arquivo) {
    return (
      <Button size="sm" variant="outline" onClick={() => void gerar()} disabled={gerando}>
        {gerando ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <FileText data-icon="inline-start" />}
        {gerando ? "Gerando PDF…" : "Gerar PDF"}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button size="sm" className="bg-[#25D366] text-white hover:bg-[#1ebe5b]" onClick={() => void compartilhar()}>
        <Share2 data-icon="inline-start" />
        Enviar PDF pelo WhatsApp
      </Button>
      <Button size="icon" variant="ghost" onClick={() => baixar(arquivo)} aria-label="Baixar o PDF" title="Baixar o PDF">
        <Download />
      </Button>
    </div>
  );
}
