

import React, { useState, useCallback } from 'react';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { ProcedureRepeatGroup, ProcedureEntryType } from './components/ProcedureRepeatGroup';
import { jsPDF } from 'jspdf'; // Import jsPDF

// The 'use' client directive is important for client-side functionality.
'use client';

// Helper function to calculate shift duration
const calculateShiftDuration = (
  startDateStr: string,
  startTimeStr: string,
  endDateStr: string,
  endTimeStr: string,
): string => {
  if (!startDateStr || !startTimeStr || !endDateStr || !endTimeStr) {
    return 'Não disponível (informações incompletas)';
  }

  const start = new Date(`${startDateStr}T${startTimeStr}:00`);
  const end = new Date(`${endDateStr}T${endTimeStr}:00`);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 'Não disponível (formato de data/hora inválido)';
  }

  const diffMs = end.getTime() - start.getTime();
  
  if (diffMs < 0) {
    return 'Duração inválida (data/hora final antes da inicial)';
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let durationString = '';
  if (hours > 0) {
    durationString += `${hours} hora${hours !== 1 ? 's' : ''}`;
  }
  if (minutes > 0) {
    if (durationString) {
      durationString += ' e ';
    }
    durationString += `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
  }
  
  if (!durationString) {
    return '0 minutos';
  }

  return durationString;
};


export const App = () => {
  const [patientName, setPatientName] = useState('');
  // Initialize with current date in YYYY-MM-DD format
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  // Initialize with current time in HH:MM format
  const [reportStartTime, setReportStartTime] = useState(() => new Date().toTimeString().slice(0, 5));
  
  // New state for end date and time
  const [reportEndDate, setReportEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportEndTime, setReportEndTime] = useState(() => new Date().toTimeString().slice(0, 5));

  const [procedureEntries, setProcedureEntries] = useState<ProcedureEntryType[]>([]);
  const [downloadDescription, setDownloadDescription] = useState('');
  const [reportText, setReportText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      return;
    }

    setIsLoading(true);
    setError(null);
    setReportText(null);

    try {
      const patientInfo = patientName ? ` para ${patientName}` : ' para paciente não especificado';
      
      const formattedStartDate = new Date(reportDate).toLocaleDateString('pt-BR');
      const formattedEndDate = new Date(reportEndDate).toLocaleDateString('pt-BR');

      const shiftDuration = calculateShiftDuration(
        reportDate, reportStartTime, reportEndDate, reportEndTime
      );

      const proceduresTextForReport = procedureEntries
        .filter(entry => entry.description.trim())
        .map(entry => {
          const timePart = entry.time ? `Hora: ${entry.time}` : 'Hora: Não especificada';
          return `${timePart}\nDescrição: ${entry.description.trim()}`;
        })
        .join('\n\n');
      
      const fullReportContent = `Relatório de Cuidados${patientInfo}\n\n` +
                                `Data de Início: ${formattedStartDate}\n` +
                                `Hora de Início: ${reportStartTime}\n` +
                                `Data Final: ${formattedEndDate}\n` +
                                `Hora Final: ${reportEndTime}\n` +
                                `Tempo de Plantão: ${shiftDuration}\n\n` +
                                `${proceduresTextForReport}`;
      setReportText(fullReportContent);

    } catch (err: any) {
      console.error('Erro ao gerar relatório:', err);
      setError('Falha ao gerar o relatório. Por favor, tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  }, [patientName, reportDate, reportStartTime, reportEndDate, reportEndTime, procedureEntries]);

  // Helper to format filename for report download
  const getFilename = useCallback((extension: 'txt' | 'pdf') => {
    const startDatePart = reportDate.replace(/-/g, '');
    const startTimePart = reportStartTime.replace(/:/g, '');
    const endDatePart = reportEndDate.replace(/-/g, '');
    const endTimePart = reportEndTime.replace(/:/g, '');


    if (downloadDescription.trim()) {
      const sanitizedDescription = downloadDescription.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
      return `${sanitizedDescription}_${startDatePart}_${startTimePart}_${endDatePart}_${endTimePart}.${extension}`;
    } else {
      const namePart = patientName ? patientName.replace(/\s/g, '_') : 'paciente';
      return `relatorio_${namePart}_${startDatePart}_${startTimePart}_${endDatePart}_${endTimePart}.${extension}`;
    }
  }, [reportDate, reportStartTime, reportEndDate, reportEndTime, downloadDescription, patientName]);

  const handleDownloadReport = useCallback(() => {
    if (!reportText) { // Ensure report is generated before trying to download
      setError('Por favor, gere o relatório antes de tentar baixar.');
      return;
    }

    const doc = new jsPDF();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(18);
    doc.text('Relatório de Cuidados', 105, 20, { align: 'center' }); // Centered title

    let yPos = 35; // Start position for content
    doc.setFontSize(12);

    // Patient Info
    const patientDisplay = patientName.trim() ? patientName.trim() : 'Não especificado';
    doc.text(`Paciente: ${patientDisplay}`, 20, yPos);
    yPos += 7;

    // Dates and Times
    const formattedStartDate = new Date(reportDate).toLocaleDateString('pt-BR');
    const formattedEndDate = new Date(reportEndDate).toLocaleDateString('pt-BR');
    const shiftDuration = calculateShiftDuration(
      reportDate, reportStartTime, reportEndDate, reportEndTime
    );

    doc.text(`Data de Início: ${formattedStartDate}`, 20, yPos);
    yPos += 7;
    doc.text(`Hora de Início: ${reportStartTime}`, 20, yPos);
    yPos += 7;
    doc.text(`Data Final: ${formattedEndDate}`, 20, yPos);
    yPos += 7;
    doc.text(`Hora Final: ${reportEndTime}`, 20, yPos);
    yPos += 7;
    doc.text(`Tempo de Plantão: ${shiftDuration}`, 20, yPos);
    yPos += 12; // Extra space before procedures

    // Procedures Section
    doc.setFontSize(14);
    doc.text('Procedimentos Detalhados:', 20, yPos);
    yPos += 8;

    doc.setFontSize(11);
    procedureEntries.filter(entry => entry.description.trim()).forEach((entry, index) => {
        const timeDisplay = entry.time.trim() ? entry.time.trim() : 'Não especificada';
        const descriptionLines = doc.splitTextToSize(`Descrição: ${entry.description.trim()}`, 170); // Max width 170mm

        doc.text(`- Hora: ${timeDisplay}`, 25, yPos);
        yPos += 7;
        descriptionLines.forEach(line => {
            doc.text(line, 30, yPos);
            yPos += 7;
        });
        yPos += 5; // Space between entries

        // Add new page if content exceeds current page height (A4 is 297mm, leave margins)
        if (yPos > 270) { 
            doc.addPage();
            yPos = 20; // Reset yPos for new page
            doc.setFontSize(14);
            doc.text('Procedimentos Detalhados (continuação):', 20, yPos);
            yPos += 8;
            doc.setFontSize(11);
        }
    });

    const filename = getFilename('pdf');
    doc.save(filename);
  }, [reportText, getFilename, patientName, reportDate, reportStartTime, reportEndDate, reportEndTime, procedureEntries]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <header className="w-full max-w-2xl text-center mb-8">
        {/* Logo */}
        {/* Fix: Use `className` instead of `class` for JSX elements */}
        <img src="data:image/jpeg;base64,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" className="h-32 w-auto mx-auto mb-4" alt="Logotipo do Aplicativo" />
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
          
          {/* New fields for end date and time */}
          <Input
            label="Data Final do Relatório"
            type="date"
            value={reportEndDate}
            onChange={(e) => setReportEndDate(e.target.value)}
          />
          <Input
            label="Hora Final do Relatório"
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
            label="Descrição para o Nome do Arquivo (Opcional)"
            placeholder="Ex: Relatório diário Maria Silva"
            value={downloadDescription}
            onChange={(e) => setDownloadDescription(e.target.value)}
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

        {reportText && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Relatório Escrito:</h3>
            <div className="w-full bg-gray-100 rounded-lg p-4 shadow-inner mb-4">
              <pre className="text-gray-800 whitespace-pre-wrap font-sans">
                {reportText}
              </pre>
            </div>
            <Button
              onClick={handleDownloadReport}
              className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
            >
              Baixar Relatório (PDF)
            </Button>
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