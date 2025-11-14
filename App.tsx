
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { ProcedureRepeatGroup, ProcedureEntryType } from './components/ProcedureRepeatGroup';

// The 'use' client directive is important for client-side functionality.
'use client';

// Declare jsPDF globally, as it's loaded via CDN
declare global {
  interface Window {
    jspdf: {
      jsPDF: new () => any; // Simplified type for global jsPDF
    };
  }
}

export const App = () => {
  const [patientName, setPatientName] = useState('');
  // Initialize with current date in YYYY-MM-DD format
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  // Initialize with current time in HH:MM format
  const [reportStartTime, setReportStartTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  // Add new state for report end date and time
  const [reportEndDate, setReportEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportEndTime, setReportEndTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [procedureEntries, setProcedureEntries] = useState<ProcedureEntryType[]>([]);
  const [downloadDescription, setDownloadDescription] = useState('');
  const [reportText, setReportText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // New state for success message

  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for the hidden file input
  const [openedPdfUrl, setOpenedPdfUrl] = useState<string | null>(null); // State for PDF viewer modal

  // Effect to clean up object URLs when component unmounts or PDF is closed
  useEffect(() => {
    return () => {
      if (openedPdfUrl) {
        URL.revokeObjectURL(openedPdfUrl);
      }
    };
  }, [openedPdfUrl]);

  const handleAddProcedureEntry = useCallback(() => {
    setProcedureEntries((prevEntries) => [
      ...prevEntries,
      { id: Date.now().toString(), time: '', description: '' },
    ]);
  }, []);

  const handleUpdateProcedureEntry = useCallback(
    (id: string, field: keyof ProcedureEntryType, value: string) => {
      setProcedureEntries((prevEntries) =>
        prevEntries.map((entry) =>
          entry.id === id ? { ...entry, [field]: value } : entry
        )
      );
    },
    []
  );

  const handleRemoveProcedureEntry = useCallback((id: string) => {
    setProcedureEntries((prevEntries) =>
      prevEntries.filter((entry) => entry.id !== id)
    );
  }, []);

  const handleGenerateReport = useCallback(async () => {
    const hasValidProcedure = procedureEntries.some(entry => entry.description.trim() !== '');
    if (procedureEntries.length === 0 || !hasValidProcedure) {
      setError('Por favor, adicione e preencha ao menos uma descrição de procedimento para gerar o relatório.');
      setSuccessMessage(null); // Clear success message on validation error
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null); // Clear previous success message
    setReportText(null);

    try {
      const formattedStartDate = reportDate.split('-').reverse().join('/'); // DD/MM/YYYY
      const formattedEndDate = reportEndDate.split('-').reverse().join('/'); // DD/MM/YYYY

      const startDateTime = new Date(`${reportDate}T${reportStartTime}:00`);
      const endDateTime = new Date(`${reportEndDate}T${reportEndTime}:00`);

      let shiftDurationHours = 0;
      if (endDateTime.getTime() < startDateTime.getTime()) {
        setError('A data e hora final não podem ser anteriores à data e hora de início.');
        setIsLoading(false);
        return;
      } else {
        const diffMs = endDateTime.getTime() - startDateTime.getTime();
        shiftDurationHours = Math.round(diffMs / (1000 * 60 * 60)); // Round to nearest hour
      }
      
      const patientInfoLine = patientName ? `Paciente: ${patientName}` : 'Paciente: Não especificado';

      const proceduresTextFormatted = procedureEntries
        .filter(entry => entry.description.trim())
        .map(entry => {
          const timePart = entry.time ? `Hora: ${entry.time}` : 'Hora: Não especificada';
          return `- ${timePart}\nDescrição: ${entry.description.trim()}`;
        })
        .join('\n\n');
      
      const fullReportContent = `Relatório de Cuidados
${patientInfoLine}
Data Início: ${formattedStartDate}
Hora Início: ${reportStartTime}
Data Final: ${formattedEndDate}
Hora Final: ${reportEndTime}
Tempo de Plantão: ${shiftDurationHours} horas

Procedimentos Detalhados:
${proceduresTextFormatted}`;

      setReportText(fullReportContent);
      setSuccessMessage('Relatório gerado com sucesso!'); // Set success message

    } catch (err: any) {
      console.error('Erro ao gerar relatório:', err);
      setError('Falha ao gerar o relatório. Por favor, tente novamente mais tarde.');
      setSuccessMessage(null); // Clear success message on error
    } finally {
      setIsLoading(false);
    }
  }, [patientName, reportDate, reportStartTime, reportEndDate, reportEndTime, procedureEntries]);

  // Helper to format filename for report download
  const getFilename = useCallback(() => {
    const formattedDateForFilename = reportDate.split('-').reverse().join(''); // DDMMYYYY
    const timePart = reportStartTime.replace(/:/g, '');

    if (downloadDescription.trim()) {
      const sanitizedDescription = downloadDescription.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
      return `${sanitizedDescription}_${formattedDateForFilename}_${timePart}.pdf`;
    } else {
      const namePart = patientName ? patientName.replace(/\s/g, '_') : 'paciente';
      return `relatorio_${namePart}_${formattedDateForFilename}_${timePart}.pdf`;
    }
  }, [reportDate, reportStartTime, downloadDescription, patientName]);

  const handleDownloadReport = useCallback(() => {
    if (!reportText) {
      setError('Nenhum relatório para baixar. Por favor, gere o relatório primeiro.');
      setSuccessMessage(null);
      return;
    }

    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
      setError('A biblioteca de PDF não foi carregada. Por favor, tente novamente ou verifique sua conexão.');
      setSuccessMessage(null);
      console.error('jsPDF library not found.');
      return;
    }

    try {
      const doc = new window.jspdf.jsPDF();
      doc.setFont('helvetica'); // Use a common sans-serif font
      doc.setFontSize(12);

      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      const margin = 15; // mm

      let yPosition = margin;

      // Add title
      doc.setFontSize(16);
      doc.text('Relatório de Cuidados', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15; // Move down for next content

      doc.setFontSize(12);

      // Split the reportText into lines and add them to the PDF
      const lines = reportText.split('\n');

      for (const line of lines) {
          const splitLines = doc.splitTextToSize(line, pageWidth - 2 * margin);

          for (const splitLine of splitLines) {
              if (yPosition + 7 > pageHeight - margin) { // Check if new page is needed (7 is estimated line height)
                  doc.addPage();
                  yPosition = margin; // Reset y position for new page
              }
              // Add special formatting for "Procedimentos Detalhados:" title
              if (splitLine.includes("Procedimentos Detalhados:")) {
                doc.setFontSize(14); // Slightly larger for section title
                doc.text(splitLine, margin, yPosition);
                doc.setFontSize(12); // Reset to normal size
              } else if (splitLine.startsWith('- Hora:') || splitLine.startsWith('Descrição:')) {
                // Indent procedure details slightly
                doc.text(splitLine, margin + 5, yPosition);
              } else {
                doc.text(splitLine, margin, yPosition);
              }
              yPosition += 7; // Increment y position for the next line
          }
          // Add a bit more space after certain sections for better readability
          if (line.includes('Tempo de Plantão:')) {
              yPosition += 5;
          }
      }

      doc.save(getFilename());

    } catch (pdfError) {
      console.error('Erro ao gerar o PDF:', pdfError);
      setError('Falha ao gerar o arquivo PDF. Por favor, tente novamente.');
      setSuccessMessage(null);
    }
  }, [reportText, getFilename]);

  const handleShareOnWhatsApp = useCallback(() => {
    if (!reportText) {
      setError('Nenhum relatório para compartilhar. Por favor, gere o relatório primeiro.');
      setSuccessMessage(null);
      return;
    }

    const patientInfo = patientName ? ` para ${patientName}` : '';
    const dateInfo = reportDate ? ` em ${reportDate.split('-').reverse().join('/')}` : '';
    const message = encodeURIComponent(
      `Olá! Um Relatório de Cuidados${patientInfo} foi gerado${dateInfo}. Por favor, verifique o arquivo PDF que acabei de baixar e enviarei.`
    );
    
    // Open WhatsApp Web/App with the pre-filled message
    window.open(`https://wa.me/?text=${message}`, '_blank');
  }, [reportText, patientName, reportDate]);

  const handleOpenFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      if (openedPdfUrl) {
        URL.revokeObjectURL(openedPdfUrl); // Revoke previous URL if any
      }
      const fileURL = URL.createObjectURL(file);
      setOpenedPdfUrl(fileURL);
      setSuccessMessage(null); // Clear previous messages
      setError(null);
    } else if (file) {
      setError('Por favor, selecione um arquivo PDF.');
      setSuccessMessage(null); // Clear previous messages
    }
    // Clear the input value so the same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [openedPdfUrl]);

  const handleClosePdfViewer = useCallback(() => {
    if (openedPdfUrl) {
      URL.revokeObjectURL(openedPdfUrl);
      setOpenedPdfUrl(null);
      setSuccessMessage(null); // Clear messages when viewer is closed
      setError(null);
    }
  }, [openedPdfUrl]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <header className="w-full max-w-2xl text-center mb-8">
        <h1 className="text-4xl font-extrabold text-green-700 tracking-tight leading-tight">
          Cuidar com carinho: Anotações Diárias
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Simplifique o registro de cuidados e a comunicação.
        </p>
      </header>

      <main className="w-full max-w-2xl bg-white p-8 rounded-xl shadow-lg border border-gray-200">
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          <Input
            label="Nome do Paciente (Opcional)"
            placeholder="Ex: Maria da Silva"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
          />
          <Input
            label="Data de Início do Relatório"
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
          />
          <Input
            label="Hora de Início do Relatório"
            type="time"
            value={reportStartTime}
            onChange={(e) => setReportStartTime(e.target.value)}
          />
          {/* New Input fields for end date and time */}
          <Input
            label="Data Final do Relatório"
            type="date"
            value={reportEndDate}
            onChange={(e) => setReportEndDate(e.target.value)}
          />
          <Input
            label="Hora de Término do Plantão"
            type="time"
            value={reportEndTime}
            onChange={(e) => setReportEndTime(e.target.value)}
          />
          
          <ProcedureRepeatGroup
            entries={procedureEntries}
            onAdd={handleAddProcedureEntry}
            onUpdate={handleUpdateProcedureEntry}
            onRemove={handleRemoveProcedureEntry}
          />

          <Input
            label="DESCRIÇÃO PARA O NOME DO ARQUIVO (OPCIONAL)"
            placeholder="Ex: Relatório diário Maria Silva"
            value={downloadDescription}
            onChange={(e) => setDownloadDescription(e.target.value)}
            wrapperClassName="p-4 border border-gray-200 rounded-md bg-gray-50 relative"
          />

          <Button
            onClick={handleGenerateReport}
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Gerando Relatório...' : 'Gerar Relatório'}
          </Button>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md" role="alert">
            {error}
          </div>
        )}

        {successMessage && ( // Display success message
          <div className="mt-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md" role="status">
            {successMessage}
          </div>
        )}

        {reportText && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Relatório Escrito:</h3>
            <div className="w-full bg-gray-100 rounded-lg p-4 shadow-inner mb-4">
              <pre className="text-gray-800 whitespace-pre-wrap font-sans">
                {reportText}
              </pre>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleDownloadReport}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
              >
                Baixar Relatório (PDF)
              </Button>
              <Button
                onClick={handleShareOnWhatsApp}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
              >
                Compartilhar via WhatsApp
              </Button>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Ferramentas PDF:</h3>
            <input
                type="file"
                accept="application/pdf"
                onChange={handleOpenFile}
                ref={fileInputRef}
                style={{ display: 'none' }} 
            />
            <Button
                type="button" 
                onClick={() => fileInputRef.current?.click()} 
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-md transition-colors duration-200"
            >
                Abrir PDF existente
            </Button>
        </div>

        {openedPdfUrl && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">Visualizador de PDF</h3>
                <Button 
                  onClick={handleClosePdfViewer}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md"
                >
                  Fechar
                </Button>
              </div>
              <iframe 
                src={openedPdfUrl} 
                className="flex-1 w-full h-full border-0 rounded-b-lg" 
                title="Visualizador de PDF"
              ></iframe>
            </div>
          </div>
        )}

        <section className="mt-8 pt-6 border-t border-gray-200 text-center text-gray-500 text-sm">
          <p>
            Para dúvidas ou sugestões, visite nosso site em <a href="https://mac_dylan" target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-600 underline">mac_dylan</a>
          </p>
        </section>
      </main>
    </div>
  );
};
