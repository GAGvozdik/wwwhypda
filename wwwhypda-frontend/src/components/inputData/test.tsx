"use client";

import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  StrictMode,
} from "react";
import { createRoot } from "react-dom/client";
import { AgGridReact } from "ag-grid-react";
import {
  ClientSideRowModelModule,
  ColDef,
  ISelectCellEditorParams,
  ModuleRegistry,
  SelectEditorModule,
  ValidationModule,
} from "ag-grid-community";

ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  SelectEditorModule,
  ValidationModule, // Development Only
]);

const languages = ["English", "Spanish", "French", "Portuguese", "(other)"];

// Генерация случайных данных
function getRandomNumber(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [rowData, setRowData] = useState<any[]>(
    new Array(100).fill(null).map(() => ({
      language: languages[getRandomNumber(0, 4)],
    }))
  );

  // Настройка колонок
  const columnDefs = useMemo(
    () => [
      {
        headerName: "Select Editor",
        field: "language",
        editable: true, // Режим редактирования по умолчанию
        cellEditor: "agSelectCellEditor", // Выбираем редактор
        cellEditorParams: {
          values: languages,
        } as ISelectCellEditorParams,
      },
    ],
    []
  );

  const defaultColDef: ColDef = useMemo(
    () => ({
      width: 200,
      editable: true, // Автоматическое редактирование для всех колонок
    }),
    []
  );

  // Включаем редактирование по клику
  return (
    <div style={containerStyle}>
      <div style={gridStyle}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          singleClickEdit={true} // Режим редактирования по одному клику
        />
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(
  <StrictMode>
    <GridExample />
  </StrictMode>
);
