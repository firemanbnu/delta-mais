import { COR_STATUS, ROTULO_STATUS, type StatusDocumento } from "@/lib/gestao";

export function SeloStatus({ status }: { status: StatusDocumento }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${COR_STATUS[status]}`}
    >
      {ROTULO_STATUS[status]}
    </span>
  );
}
