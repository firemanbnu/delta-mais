"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, ImageIcon, Loader2, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Largura da folha A4 em pé a 96 dpi; a imagem sai igual em qualquer tela. */
const LARGURA_A4 = 794;
/** Margem lateral da folha na imagem (10 mm), igual ao padding de `.modo-imagem`. */
const MARGEM = 38;

/**
 * Maior área de imagem que o Safari do iPhone consegue gerar (cerca de 16,7
 * milhões de pixels). Acima disso a imagem sai em branco.
 */
const AREA_MAXIMA = 16_000_000;
/** Ampliação máxima: nitidez boa para dar zoom sem um arquivo enorme. */
const AMPLIACAO_MAXIMA = 4;

/** Quantas vezes a imagem é maior que a folha na tela, dentro do limite de área. */
function ampliacaoPara(largura: number, altura: number): number {
  const cabe = Math.sqrt(AREA_MAXIMA / (largura * altura));
  return Math.max(1, Math.min(AMPLIACAO_MAXIMA, Math.floor(cabe * 10) / 10));
}

/** Pausa curta para o navegador recalcular o layout; funciona com a aba em segundo plano. */
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

/**
 * Gera uma imagem PNG da folha impressa (o elemento `alvoId`) e abre o menu de
 * compartilhar do aparelho, onde aparece o WhatsApp.
 *
 * São dois toques de propósito: o primeiro gera a imagem e o segundo
 * compartilha. O iPhone só abre o menu de compartilhar logo após um toque, e
 * gerar a imagem leva alguns segundos. Sem o menu de compartilhar (alguns
 * navegadores de computador), a imagem é baixada para anexar no WhatsApp.
 */
export function BotaoImagemEscala({
  alvoId,
  nomeArquivo,
  titulo,
}: {
  alvoId: string;
  nomeArquivo: string;
  titulo: string;
}) {
  const [gerando, setGerando] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);

  async function gerar() {
    const alvo = document.getElementById(alvoId);
    if (!alvo) return;
    setGerando(true);
    alvo.classList.add("modo-imagem");
    try {
      // Dá tempo de o navegador refazer o layout na largura da A4.
      await esperar();
      // A tabela das noites (31 colunas) pode passar da A4: a imagem alarga
      // até caber tudo, com a mesma margem dos dois lados.
      const largura = Math.max(LARGURA_A4, alvo.scrollWidth + MARGEM);
      alvo.style.setProperty("width", `${largura}px`, "important");
      await esperar();
      const altura = alvo.scrollHeight;
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(alvo, {
        pixelRatio: ampliacaoPara(largura, altura),
        backgroundColor: "#ffffff",
        width: largura,
        height: altura,
        filter: (no) => !(no instanceof HTMLElement && no.classList.contains("sem-impressao")),
      });
      if (!blob) throw new Error("A imagem saiu vazia.");
      setArquivo(new File([blob], nomeArquivo, { type: "image/png" }));
      toast.success("Imagem pronta. Toque em Enviar pelo WhatsApp.");
    } catch (erro) {
      console.error(erro);
      toast.error("Não foi possível gerar a imagem. Tente de novo.");
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
        // Fechar o menu sem escolher nada não é erro.
        if (erro instanceof DOMException && erro.name === "AbortError") return;
      }
    }
    baixar(arquivo);
    toast.info("Imagem baixada. Anexe no WhatsApp.");
  }

  if (!arquivo) {
    return (
      <Button size="sm" variant="outline" onClick={() => void gerar()} disabled={gerando}>
        {gerando ? (
          <Loader2 data-icon="inline-start" className="animate-spin" />
        ) : (
          <ImageIcon data-icon="inline-start" />
        )}
        {gerando ? "Gerando imagem…" : "Gerar imagem"}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button size="sm" className="bg-[#25D366] text-white hover:bg-[#1ebe5b]" onClick={() => void compartilhar()}>
        <Share2 data-icon="inline-start" />
        Enviar pelo WhatsApp
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => baixar(arquivo)}
        aria-label="Baixar a imagem"
        title="Baixar a imagem"
      >
        <Download />
      </Button>
    </div>
  );
}
