// src/common/themes/themeDarkBlue.ts

import { colorSchemeDark, themeQuartz } from "ag-grid-community";
import type { State } from '../../common/types';
import { useSelector } from 'react-redux';
// import axios from "axios";
import { styled } from '@mui/material/styles';
import api from '../api';
import { getCsrfTokenFromCookie } from '../../common/types';


export const sendAllDataToServer = async (recaptchaToken: string) => {
  const payload = insertData();

  try {
    await api.post("/input/submit", { ...payload, recaptcha_token: recaptchaToken }, {
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": getCsrfTokenFromCookie(),
      },
      withCredentials: true, // Отправлять HttpOnly cookie (JWT)
    });

    console.log("Данные успешно отправлены");
  } catch {
    console.warn("Ошибка при отправке данных");
  }
};

export const completeSubmission = async (id: string) => {
  try {
    await api.post(`/input/complete/${id}`, {}, {
        headers: {
            'X-CSRF-TOKEN': getCsrfTokenFromCookie()
        },
        withCredentials: true
    });
    console.log("Submission completed");
  } catch {
    console.warn("Error completing submission");
  }
};

const insertData = () => {
  return {
    generalInfoData: JSON.parse(localStorage.getItem("generalInfoData") || "[]"),
    measurementsTableData: JSON.parse(localStorage.getItem("measurementsTableData") || "[]"),
    sampleMeasurementTableData: JSON.parse(localStorage.getItem("sampleMeasurementTableData") || "[]"),
    siteInfoTableData: JSON.parse(localStorage.getItem("siteInfoTableData") || "[]"),
    sourceTableData: (JSON.parse(localStorage.getItem("sourceTableData") || "[]") as Array<{ field: string; value: string }>).map((row) => row.field === "authors" ? { ...row, value: "" } : row),
  };
};

export const useStepsTheme = () => {
  const isDarkTheme = useSelector((state: State) => state.isDarkTheme);

  const baseTheme = isDarkTheme ? themeQuartz.withPart(colorSchemeDark) : themeQuartz;
  const theme = baseTheme.withParams({
    fontFamily: "Afacad_Flux",
    fontSize: "var(--main-font-size)",
    cellFontSize: "var(--main-font-size)",
    headerFontSize: "var(--main-font-size)",
    backgroundColor: "var(--table-color)",
    headerBackgroundColor: "var(--form-color)",
    borderColor: "var(--table-border-color)",
    accentColor: "var(--tree-text)",
    selectedRowBackgroundColor: "var(--tree-hover)",
    rowHoverColor: "var(--tree-hover)",
    cellEditingBorder: { color: "var(--tree-text)", width: "1px" },
    inputBackgroundColor: "var(--field-background)",
    inputTextColor: "var(--input-text)",
    inputBorder: { color: "var(--field-border)", width: "2px", style: "solid" },
    inputFocusBorder: { color: "var(--field-border-active)", width: "2px", style: "solid" },
    rowHeight: "2.5rem",
    headerHeight: "2.5rem",
    listItemHeight: "2.5rem",
    iconSize: "1rem",
    spacing: "0.375rem",

    foregroundColor: isDarkTheme ? "var(--tree-text)" : "var(--border)",
    headerTextColor: "var(--tree-text)",
    columnBorder: { color: 'var(--table-grid-line)', width: '1px', style: 'solid' },
    rowBorder: { color: 'var(--table-grid-line)', width: '1px', style: 'solid' },
    headerColumnBorder: { color: 'var(--table-grid-line)', width: '1px', style: 'solid' },
    headerColumnBorderHeight: '100%',
    headerRowBorder: { color: 'var(--table-grid-line)', width: '1px', style: 'solid' },
  });

  return theme;
};

export const CustomStepIconRoot = styled('div')<{ ownerState: { active?: boolean; completed?: boolean } }>(
  ({  }) => ({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: '50%',
    width: '2rem',
    height: '2rem',
    fontSize: 'var(--main-font-size)',
    fontFamily: 'Afacad_Flux',
    color: 'var(--step-color-active)',
    transition: '0.8s',
  })
);

export const StepNumberCircle = styled('div')<{ ownerState: { active?: boolean } }>(
  ({ ownerState }) => ({
    width: '2rem',
    height: '2rem',
    borderRadius: '50%',
    backgroundColor: ownerState.active ? 'var(--step-color-active)' : 'var(--step-color)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 'var(--main-font-size)',
    color: 'var(--step-text)',
    fontWeight: ownerState.active ? 'bold' : '',
    transition: '0.8s',
  })
);