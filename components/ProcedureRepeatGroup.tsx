
import React from 'react';
import { Input } from './Input';
import { Button } from './Button';

export interface ProcedureEntryType {
  id: string;
  time: string;
  description: string;
}

interface ProcedureRepeatGroupProps {
  entries: ProcedureEntryType[];
  onAdd: () => void;
  onUpdate: (id: string, field: keyof ProcedureEntryType, value: string) => void;
  onRemove: (id: string) => void;
}

export const ProcedureRepeatGroup: React.FC<ProcedureRepeatGroupProps> = ({
  entries,
  onAdd,
  onUpdate,
  onRemove,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Procedimentos Detalhados</h3>
      {entries.map((entry, index) => (
        <div key={entry.id} className="flex flex-col sm:flex-row gap-4 p-4 border border-gray-200 rounded-md bg-gray-50 relative">
          <div className="flex-1">
            <Input
              label={`Hora ${index + 1}`}
              type="time"
              value={entry.time}
              onChange={(e) => onUpdate(entry.id, 'time', e.target.value)}
            />
          </div>
          <div className="flex-[2]">
            <Input
              label={`Descrição do Procedimento ${index + 1}`}
              placeholder="Ex: Administrado medicamento A às 8h"
              value={entry.description}
              onChange={(e) => onUpdate(entry.id, 'description', e.target.value)}
            />
          </div>
          <div className="sm:self-end pt-2 sm:pt-0">
            <Button
              type="button"
              onClick={() => onRemove(entry.id)}
              className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
            >
              Remover
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        onClick={onAdd}
        className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 mt-4"
      >
        Adicionar Novo Procedimento
      </Button>
    </div>
  );
};
