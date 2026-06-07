import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtMoney, fmtDate } from "./format";

type LineItem = {
  name: string;
  sku?: string | null;
  quantity: number;
  unit_price: number;
  gst_rate?: number;
  tax_amount?: number;
  total: number;
};

type InvoiceData = {
  kind: "sale" | "purchase";
  invoice_no: string;
  date: string | Date;
  party: { name: string; email?: string | null; phone?: string | null; address?: string | null; gst_number?: string | null };
  items: LineItem[];
  subtotal: number;
  tax: number;
  discount?: number;
  total: number;
  notes?: string | null;
  company?: { name: string; address?: string; phone?: string };
};

export function generateInvoicePDF(data: InvoiceData, action: "download" | "print" = "download") {
  const doc = new jsPDF();
  const company = data.company ?? { name: "StockPilot Inc.", address: "—", phone: "—" };

  // Header band
  doc.setFillColor(35, 50, 100);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(company.name, 14, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(company.address ?? "", 14, 20);
  doc.text(company.phone ?? "", 14, 25);

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(data.kind === "sale" ? "TAX INVOICE" : "PURCHASE ORDER", 196, 18, { align: "right" });

  // Invoice meta
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Invoice #: ${data.invoice_no}`, 196, 40, { align: "right" });
  doc.text(`Date: ${fmtDate(data.date)}`, 196, 46, { align: "right" });

  // Party
  doc.setFont("helvetica", "bold");
  doc.text(data.kind === "sale" ? "Bill To:" : "Supplier:", 14, 40);
  doc.setFont("helvetica", "normal");
  doc.text(data.party.name, 14, 46);
  let y = 52;
  if (data.party.email) { doc.text(data.party.email, 14, y); y += 5; }
  if (data.party.phone) { doc.text(data.party.phone, 14, y); y += 5; }
  if (data.party.address) { doc.text(data.party.address, 14, y); y += 5; }
  if (data.party.gst_number) { doc.text(`GSTIN: ${data.party.gst_number}`, 14, y); y += 5; }

  // Items table
  autoTable(doc, {
    startY: Math.max(y + 4, 75),
    head: [["#", "Item", "Qty", "Rate", ...(data.kind === "sale" ? ["GST%", "Tax"] : []), "Total"]],
    body: data.items.map((it, i) => [
      i + 1,
      it.name + (it.sku ? `\n${it.sku}` : ""),
      it.quantity,
      fmtMoney(it.unit_price),
      ...(data.kind === "sale" ? [`${it.gst_rate ?? 0}%`, fmtMoney(it.tax_amount ?? 0)] : []),
      fmtMoney(it.total),
    ]),
    theme: "striped",
    headStyles: { fillColor: [35, 50, 100], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 10 }, 2: { halign: "right" }, 3: { halign: "right" } },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 6;

  // Totals
  const labelX = 140;
  const valX = 196;
  let ty = finalY;
  doc.setFontSize(10);
  doc.text("Subtotal", labelX, ty);
  doc.text(fmtMoney(data.subtotal), valX, ty, { align: "right" }); ty += 6;
  if (data.discount && data.discount > 0) {
    doc.text("Discount", labelX, ty);
    doc.text("- " + fmtMoney(data.discount), valX, ty, { align: "right" }); ty += 6;
  }
  doc.text("Tax (GST)", labelX, ty);
  doc.text(fmtMoney(data.tax), valX, ty, { align: "right" }); ty += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Grand Total", labelX, ty);
  doc.text(fmtMoney(data.total), valX, ty, { align: "right" });

  if (data.notes) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Notes:", 14, ty + 14);
    doc.text(data.notes, 14, ty + 20, { maxWidth: 120 });
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("Thank you for your business.", 105, 290, { align: "center" });

  if (action === "print") {
    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
  } else {
    doc.save(`${data.invoice_no}.pdf`);
  }
}
