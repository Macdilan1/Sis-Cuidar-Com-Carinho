
import React, { useState, useCallback } from 'react';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { ProcedureRepeatGroup, ProcedureEntryType } from './components/ProcedureRepeatGroup';

// The 'use' client directive is important for client-side functionality.
'use client';

export const App = () => {
  const [patientName, setPatientName] = useState('');
  // Initialize with current date in YYYY-MM-DD format
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  // Initialize with current time in HH:MM format
  const [reportStartTime, setReportStartTime] = useState(() => new Date().toTimeString().slice(0, 5));
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
      const dateTimeInfo = `no dia ${reportDate} às ${reportStartTime}`;
      
      const proceduresTextForReport = procedureEntries
        .filter(entry => entry.description.trim())
        .map(entry => {
          const timePart = entry.time ? `Hora: ${entry.time}` : 'Hora: Não especificada';
          return `${timePart}\nDescrição: ${entry.description.trim()}`;
        })
        .join('\n\n');
      
      const fullReportContent = `Relatório de Cuidados${patientInfo} ${dateTimeInfo}\n\n${proceduresTextForReport}`;
      setReportText(fullReportContent);

    } catch (err: any) {
      console.error('Erro ao gerar relatório:', err);
      setError('Falha ao gerar o relatório. Por favor, tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  }, [patientName, reportDate, reportStartTime, procedureEntries]);

  // Helper to format filename for report download
  const getFilename = useCallback(() => {
    const datePart = reportDate.replace(/-/g, '');
    const timePart = reportStartTime.replace(/:/g, '');

    if (downloadDescription.trim()) {
      const sanitizedDescription = downloadDescription.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
      return `${sanitizedDescription}_${datePart}_${timePart}.txt`;
    } else {
      const namePart = patientName ? patientName.replace(/\s/g, '_') : 'paciente';
      return `relatorio_${namePart}_${datePart}_${timePart}.txt`;
    }
  }, [reportDate, reportStartTime, downloadDescription, patientName]);

  const handleDownloadReport = useCallback(() => {
    if (reportText) {
      const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = getFilename();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }
  }, [reportText, getFilename]);

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
            label="Data do Relatório"
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
              Baixar Relatório (TXT)
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