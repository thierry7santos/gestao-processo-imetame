import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { Solicitacao } from "@/lib/types";
import { fmtDate, fmtDateTime, fmtMin, minutesBetween } from "@/lib/formatters";
import { perfilLabel } from "@/lib/auth";

function divergenciaAgrup(a: Solicitacao["agrupamentos"][number]): number {
  const dc = a.validacao?.compDigitado != null && a.comprimento != null ? Math.abs(a.validacao.compDigitado - a.comprimento) : 0;
  const dl = a.validacao?.largDigitado != null && a.largura != null ? Math.abs(a.validacao.largDigitado - a.largura) : 0;
  return Math.max(dc, dl);
}

function dataHora(): string {
  return new Date().toLocaleString("pt-BR");
}

export function exportarAuditoriaPDF(lista: Solicitacao[]) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text("Auditoria de Produção — Gestão de Processos CNC", 14, 16);
  doc.setFontSize(9);
  doc.text(`Gerado em ${dataHora()} · ${lista.length} solicitação(ões)`, 14, 22);

  const head = [["ID", "Solicitante", "OS", "Título", "Tipo", "Plano", "Necessidade", "Status", "Corte", "Máquinas", "Divergência"]];
  const body = lista.map((s) => {
    const total = s.agrupamentos.length;
    const cortados = s.agrupamentos.filter((a) => a.statusCorte === "Cortado").length;
    const maquinas = Array.from(new Set(s.agrupamentos.map((a) => a.maquina).filter(Boolean))).join(", ");
    const divMax = Math.max(0, ...s.agrupamentos.map(divergenciaAgrup));
    return [
      s.id, s.planejadorCriador, s.os, s.titulo, s.tipo, s.numeroPlano ?? "—",
      fmtDate(s.dataNecessidade), s.status,
      total === 0 ? "—" : `${cortados}/${total}`,
      maquinas || "—",
      divMax > 50 ? `SIM (±${divMax}mm)` : "—",
    ];
  });

  autoTable(doc, {
    head,
    body,
    startY: 26,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
    didDrawPage: () => {
      doc.setFontSize(7);
      doc.text("Imetame · Uso interno", 14, doc.internal.pageSize.getHeight() - 8);
    },
  });

  doc.save(`auditoria-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportarAuditoriaExcel(lista: Solicitacao[]) {
  const wb = XLSX.utils.book_new();

  const rows = lista.map((s) => {
    const total = s.agrupamentos.length;
    const cortados = s.agrupamentos.filter((a) => a.statusCorte === "Cortado").length;
    const maquinas = Array.from(new Set(s.agrupamentos.map((a) => a.maquina).filter(Boolean))).join(", ");
    const divMax = Math.max(0, ...s.agrupamentos.map(divergenciaAgrup));
    return {
      ID: s.id,
      Solicitante: s.planejadorCriador,
      OS: s.os,
      Título: s.titulo,
      Tipo: s.tipo,
      Plano: s.numeroPlano ?? "",
      Necessidade: fmtDate(s.dataNecessidade),
      Status: s.status,
      "Corte (cort/total)": total === 0 ? "" : `${cortados}/${total}`,
      Máquinas: maquinas,
      "Divergência": divMax > 50 ? `SIM ±${divMax}mm` : "Não",
      "Criado em": fmtDateTime(s.createdAt),
    };
  });
  const ws1 = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws1, "Solicitações");

  // Aba de timeline por OS
  const timeline: Record<string, string | number>[] = [];
  for (const s of lista) {
    for (const h of s.historico) {
      timeline.push({ ID: s.id, OS: s.os, Data: fmtDateTime(h.dataHora), Usuário: h.usuario, Mudança: h.mudanca });
    }
    for (const a of s.agrupamentos) {
      if (a.inicioCorte) timeline.push({ ID: s.id, OS: s.os, Data: fmtDateTime(a.inicioCorte), Usuário: a.operador ?? "—", Mudança: `Início corte · ${a.nome}` });
      for (const p of a.paradas ?? []) {
        timeline.push({ ID: s.id, OS: s.os, Data: fmtDateTime(p.inicio), Usuário: p.operador, Mudança: `Parada · ${a.nome} — ${p.motivo}` });
      }
      if (a.fimCorte) timeline.push({ ID: s.id, OS: s.os, Data: fmtDateTime(a.fimCorte), Usuário: a.operador ?? "—", Mudança: `Fim corte · ${a.nome} (${fmtMin(minutesBetween(a.inicioCorte, a.fimCorte))})` });
    }
  }
  const ws2 = XLSX.utils.json_to_sheet(timeline);
  XLSX.utils.book_append_sheet(wb, ws2, "Timeline");

  XLSX.writeFile(wb, `auditoria-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export interface KpisResumo {
  cortados: number;
  pesoTotal: number;
  tempoRealTotal: number;
  tempoEstTotal: number;
}

export function exportarKpisPDF(
  resumo: KpisResumo,
  porMaquina: { maq: string; est: number; real: number; peso: number; eficiencia: number }[],
  porOperador: { operador: string; est: number; real: number; peso: number; eficiencia: number }[],
) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text("Central de KPIs — Gestão de Processos CNC", 14, 16);
  doc.setFontSize(9);
  doc.text(`Gerado em ${dataHora()}`, 14, 22);

  doc.setFontSize(10);
  doc.text(`Cortados: ${resumo.cortados}  |  Peso: ${resumo.pesoTotal.toLocaleString("pt-BR")} kg  |  Tempo real: ${fmtMin(resumo.tempoRealTotal)}  |  Estimado: ${fmtMin(resumo.tempoEstTotal)}`, 14, 30);

  autoTable(doc, {
    startY: 36,
    head: [["Máquina", "Estimado", "Real", "Peso (kg)", "Eficiência"]],
    body: porMaquina.map((m) => [m.maq, fmtMin(m.est), fmtMin(m.real), String(m.peso), `${m.eficiencia}%`]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [40, 40, 40] },
  });

  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6,
    head: [["Operador", "Estimado", "Real", "Peso (kg)", "Eficiência"]],
    body: porOperador.map((o) => [o.operador, fmtMin(o.est), fmtMin(o.real), String(o.peso), `${o.eficiencia}%`]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [40, 40, 40] },
  });

  doc.save(`kpis-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportarKpisExcel(
  resumo: KpisResumo,
  porMaquina: { maq: string; est: number; real: number; peso: number; eficiencia: number }[],
  porOperador: { operador: string; est: number; real: number; peso: number; eficiencia: number }[],
) {
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet([
    { Indicador: "Cortados", Valor: resumo.cortados },
    { Indicador: "Peso total (kg)", Valor: resumo.pesoTotal },
    { Indicador: "Tempo real total", Valor: fmtMin(resumo.tempoRealTotal) },
    { Indicador: "Tempo estimado total", Valor: fmtMin(resumo.tempoEstTotal) },
  ]);
  XLSX.utils.book_append_sheet(wb, ws1, "Resumo");

  const ws2 = XLSX.utils.json_to_sheet(porMaquina.map((m) => ({
    Máquina: m.maq, "Estimado (min)": m.est, "Real (min)": m.real, "Peso (kg)": m.peso, "Eficiência %": m.eficiencia,
  })));
  XLSX.utils.book_append_sheet(wb, ws2, "Por Máquina");

  const ws3 = XLSX.utils.json_to_sheet(porOperador.map((o) => ({
    Operador: o.operador, "Estimado (min)": o.est, "Real (min)": o.real, "Peso (kg)": o.peso, "Eficiência %": o.eficiencia,
  })));
  XLSX.utils.book_append_sheet(wb, ws3, "Por Operador");

  XLSX.writeFile(wb, `kpis-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export { perfilLabel };
