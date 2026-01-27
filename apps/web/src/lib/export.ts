export interface ExportColumn {
  header: string;
  accessor: (row: any) => string | number;
  align?: 'left' | 'right';
}

export function exportToCSV(
  data: any[],
  columns: ExportColumn[],
  filename: string
) {
  const headers = columns.map((c) => c.header);
  const rows = data.map((row) =>
    columns.map((col) => {
      const val = col.accessor(row);
      return `"${String(val).replace(/"/g, '""')}"`;
    })
  );

  const csv = [headers.map((h) => `"${h}"`).join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface PDFExportOptions {
  title: string;
  filename?: string;
  subtitle?: string;
  summary?: { label: string; value: string }[];
}

// Brand colors
const BRAND = {
  dark: [15, 23, 42] as [number, number, number],       // slate-900
  medium: [71, 85, 105] as [number, number, number],     // slate-500
  light: [241, 245, 249] as [number, number, number],    // slate-100
  accent: [99, 102, 241] as [number, number, number],    // indigo-500
  white: [255, 255, 255] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],   // slate-200
  altRow: [248, 250, 252] as [number, number, number],   // slate-50
};

export async function exportToPDF(
  data: any[],
  columns: ExportColumn[],
  options: PDFExportOptions
) {
  const { title, filename, subtitle, summary } = options;
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // --- Header accent bar ---
  doc.setFillColor(...BRAND.dark);
  doc.rect(0, 0, pageWidth, 3, 'F');

  // --- Logo / Brand name ---
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.medium);
  doc.text('SMASHBOX', margin, 12);

  // --- Title ---
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.dark);
  doc.text(title, margin, 22);

  // --- Subtitle + date ---
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND.medium);
  doc.text(subtitle || `Generated on ${dateStr}`, margin, 28);

  // Date on the right
  doc.text(dateStr, pageWidth - margin, 12, { align: 'right' });

  // Row count below date
  doc.setFontSize(8);
  doc.text(`${data.length} record${data.length !== 1 ? 's' : ''}`, pageWidth - margin, 17, {
    align: 'right',
  });

  // --- Divider line ---
  doc.setDrawColor(...BRAND.border);
  doc.setLineWidth(0.3);
  doc.line(margin, 32, pageWidth - margin, 32);

  // --- Summary cards (above table if present) ---
  let tableStartY = 37;

  if (summary && summary.length > 0) {
    const cardCount = summary.length;
    const gap = 4;
    const totalGap = gap * (cardCount - 1);
    const usableWidth = pageWidth - margin * 2;
    const cardWidth = Math.min((usableWidth - totalGap) / cardCount, 60);
    const cardHeight = 16;
    const startX = margin;

    summary.forEach((s, i) => {
      const x = startX + i * (cardWidth + gap);
      const y = 35;

      // Card background
      doc.setFillColor(...BRAND.light);
      doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'F');

      // Value
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BRAND.dark);
      doc.text(s.value, x + cardWidth / 2, y + 7, { align: 'center' });

      // Label
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BRAND.medium);
      doc.text(s.label.toUpperCase(), x + cardWidth / 2, y + 12.5, { align: 'center' });
    });

    tableStartY = 56;
  }

  // --- Table ---
  const head = [columns.map((col) => col.header.toUpperCase())];
  const body = data.map((row) =>
    columns.map((col) => {
      const val = col.accessor(row);
      return String(val).replace(/<[^>]*>/g, '');
    })
  );

  const columnStyles: Record<number, { halign: 'left' | 'right' }> = {};
  columns.forEach((col, i) => {
    if (col.align === 'right') {
      columnStyles[i] = { halign: 'right' };
    }
  });

  autoTable(doc, {
    head,
    body,
    startY: tableStartY,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
      lineColor: BRAND.border,
      lineWidth: 0.1,
      textColor: BRAND.dark,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: BRAND.dark,
      textColor: BRAND.white,
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: { top: 4, right: 4, bottom: 4, left: 4 },
    },
    bodyStyles: {
      fillColor: BRAND.white,
    },
    alternateRowStyles: {
      fillColor: BRAND.altRow,
    },
    columnStyles,
    tableLineColor: BRAND.border,
    tableLineWidth: 0.1,
    didDrawPage: (hookData: any) => {
      const pageCount = doc.getNumberOfPages();
      const currentPage = hookData.pageNumber || 1;

      // Top accent bar on subsequent pages
      if (currentPage > 1) {
        doc.setFillColor(...BRAND.dark);
        doc.rect(0, 0, pageWidth, 3, 'F');
      }

      // Footer line
      doc.setDrawColor(...BRAND.border);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

      // Footer left: brand
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BRAND.medium);
      doc.text('Smashbox Fitness Platform', margin, pageHeight - 8);

      // Footer center: page number
      doc.text(
        `Page ${currentPage} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );

      // Footer right: date
      doc.text(dateStr, pageWidth - margin, pageHeight - 8, { align: 'right' });
    },
  });

  const dateSuffix = now.toISOString().split('T')[0];
  doc.save(`${filename || title.toLowerCase().replace(/\s+/g, '-')}-${dateSuffix}.pdf`);
}

export function formatStatusBadge(status: string): string {
  const normalized = status.toLowerCase().replace(/\s+/g, '_');
  return `<span class="status ${normalized}">${status}</span>`;
}
