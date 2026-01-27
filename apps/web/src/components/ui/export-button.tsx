'use client';

import { useState } from 'react';
import { Download, FileText, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportToCSV, exportToPDF, type ExportColumn, type PDFExportOptions } from '@/lib/export';

interface ExportButtonProps {
  data: any[];
  columns: ExportColumn[];
  filename: string;
  pdfTitle?: string;
  pdfSummary?: { label: string; value: string }[];
}

export function ExportButton({
  data,
  columns,
  filename,
  pdfTitle,
  pdfSummary,
}: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleCSV = async () => {
    setLoading(true);
    try {
      exportToCSV(data, columns, filename);
    } finally {
      setLoading(false);
    }
  };

  const handlePDF = async () => {
    setLoading(true);
    try {
      const options: PDFExportOptions = {
        title: pdfTitle || `${filename.charAt(0).toUpperCase() + filename.slice(1)} Report`,
        filename,
        summary: pdfSummary,
      };
      await exportToPDF(data, columns, options);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="rounded-xl whitespace-nowrap"
          disabled={loading || data.length === 0}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Export
          <ChevronDown className="w-4 h-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCSV}>
          <FileText className="w-4 h-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePDF}>
          <FileText className="w-4 h-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
