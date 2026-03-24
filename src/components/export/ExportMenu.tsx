'use client';

import { useState } from 'react';
import { Download, FileText, FileJson, FileDown } from 'lucide-react';
import { exportToPDF, exportToText, exportToJSON } from '@/lib/export';
import { ChatMessage } from '@/types';

interface Props {
  messages: ChatMessage[];
  channel: string;
}

export function ExportMenu({ messages, channel }: Props) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handlePDF = async () => {
    setExporting(true);
    try {
      await exportToPDF('chat-document', channel);
    } finally {
      setExporting(false);
      setOpen(false);
    }
  };

  const handleText = () => {
    exportToText(messages, channel);
    setOpen(false);
  };

  const handleJSON = () => {
    exportToJSON(messages, channel);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="tb-btn flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition"
        disabled={exporting}
      >
        <Download className="w-4 h-4" />
        {exporting ? 'Export...' : 'Exporter'}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="tb-dropdown absolute right-0 top-full mt-1 z-20 rounded-lg shadow-lg border py-1 min-w-[180px]">
            <button
              onClick={handlePDF}
              className="tb-dropdown-item w-full flex items-center gap-3 px-4 py-2 text-sm"
            >
              <FileDown className="w-4 h-4 text-red-500" />
              Export PDF
            </button>
            <button
              onClick={handleText}
              className="tb-dropdown-item w-full flex items-center gap-3 px-4 py-2 text-sm"
            >
              <FileText className="w-4 h-4 text-blue-500" />
              Export Texte
            </button>
            <button
              onClick={handleJSON}
              className="tb-dropdown-item w-full flex items-center gap-3 px-4 py-2 text-sm"
            >
              <FileJson className="w-4 h-4 text-green-500" />
              Export JSON
            </button>
          </div>
        </>
      )}
    </div>
  );
}
