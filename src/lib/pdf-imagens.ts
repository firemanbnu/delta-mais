/**
 * PDF mínimo com uma imagem JPEG por página (sem dependências). Cada imagem
 * ocupa a largura toda da folha A4, alinhada ao topo.
 */

export type PaginaJpeg = { jpeg: Uint8Array; largura: number; altura: number };

/** A4 em pontos (1/72 pol.). */
export const A4 = { largura: 595.28, altura: 841.89 } as const;

const codificador = new TextEncoder();

function num(v: number): string {
  return Number(v.toFixed(2)).toString();
}

export function montarPdf(paginas: PaginaJpeg[], opcoes: { paisagem?: boolean; titulo?: string } = {}): Uint8Array {
  const larg = opcoes.paisagem ? A4.altura : A4.largura;
  const alt = opcoes.paisagem ? A4.largura : A4.altura;

  const partes: Uint8Array[] = [];
  const deslocamentos: number[] = [];
  let tamanho = 0;
  const escrever = (dados: Uint8Array | string) => {
    const b = typeof dados === "string" ? codificador.encode(dados) : dados;
    partes.push(b);
    tamanho += b.length;
  };
  const objeto = (n: number, corpo: () => void) => {
    deslocamentos[n] = tamanho;
    escrever(`${n} 0 obj\n`);
    corpo();
    escrever("\nendobj\n");
  };

  // 1 catálogo, 2 páginas, 3 info; depois, por página: página, conteúdo, imagem.
  const primeiro = 4;
  const idsPaginas = paginas.map((_, i) => primeiro + i * 3);

  escrever("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  objeto(1, () => escrever("<< /Type /Catalog /Pages 2 0 R >>"));
  objeto(2, () =>
    escrever(`<< /Type /Pages /Kids [${idsPaginas.map((id) => `${id} 0 R`).join(" ")}] /Count ${paginas.length} >>`),
  );
  const titulo = (opcoes.titulo ?? "Relatório")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[()\\]/g, "");
  objeto(3, () => escrever(`<< /Title (${titulo}) /Producer (Delta Mais) >>`));

  paginas.forEach((p, i) => {
    const idPagina = idsPaginas[i];
    const idConteudo = idPagina + 1;
    const idImagem = idPagina + 2;
    const escala = larg / p.largura;
    const altImg = p.altura * escala;
    const conteudo = `q ${num(larg)} 0 0 ${num(altImg)} 0 ${num(alt - altImg)} cm /Im0 Do Q`;

    objeto(idPagina, () =>
      escrever(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(larg)} ${num(alt)}] ` +
          `/Resources << /XObject << /Im0 ${idImagem} 0 R >> >> /Contents ${idConteudo} 0 R >>`,
      ),
    );
    objeto(idConteudo, () => escrever(`<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`));
    objeto(idImagem, () => {
      escrever(
        `<< /Type /XObject /Subtype /Image /Width ${p.largura} /Height ${p.altura} ` +
          `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`,
      );
      escrever(p.jpeg);
      escrever("\nendstream");
    });
  });

  const total = primeiro + paginas.length * 3;
  const xref = tamanho;
  let tabela = `xref\n0 ${total}\n0000000000 65535 f \n`;
  for (let n = 1; n < total; n++) tabela += `${String(deslocamentos[n]).padStart(10, "0")} 00000 n \n`;
  escrever(tabela);
  escrever(`trailer\n<< /Size ${total} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const saida = new Uint8Array(tamanho);
  let p = 0;
  for (const parte of partes) {
    saida.set(parte, p);
    p += parte.length;
  }
  return saida;
}

/**
 * Onde cortar as páginas: o maior ponto de quebra que cabe na folha, desde que
 * não deixe a página com menos da metade ocupada; senão corta no limite.
 */
export function cortesDePagina(alturaTotal: number, alturaPagina: number, quebras: number[]): number[] {
  const ordenadas = [...new Set(quebras)].filter((q) => q > 0 && q < alturaTotal).sort((a, b) => a - b);
  const cortes: number[] = [];
  let inicio = 0;
  while (alturaTotal - inicio > alturaPagina) {
    const limite = inicio + alturaPagina;
    const candidatas = ordenadas.filter((q) => q <= limite && q > inicio + alturaPagina / 2);
    const corte = candidatas.length ? candidatas[candidatas.length - 1] : limite;
    cortes.push(corte);
    inicio = corte;
  }
  return cortes;
}
