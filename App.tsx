

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
                                `Data Início: ${formattedStartDate}\n` +
                                `Hora Início: ${reportStartTime}\n` +
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

    doc.text(`Data Início: ${formattedStartDate}`, 20, yPos);
    yPos += 7;
    doc.text(`Hora Início: ${reportStartTime}`, 20, yPos);
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