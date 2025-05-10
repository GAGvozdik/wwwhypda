// src/common/themes/themeDarkBlue.ts

import { colorSchemeDark, themeQuartz } from "ag-grid-community";
import { State } from '../../common/types';
import { useSelector } from 'react-redux';
import axios from "axios";
import { styled } from '@mui/material/styles';
import api from '../api';

// Пример функции для получения CSRF-токена из cookie
const getCsrfTokenFromCookie = () => {
  const match = document.cookie.match(/csrf_token=([^;]+)/);
  return match ? match[1] : "";
};

export const sendAllDataToServer = async () => {
  const payload = insertData();

  try {
    const response = await api.post("http://localhost:5000/input/submit", payload, {
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": getCsrfTokenFromCookie(),
      },
      withCredentials: true, // Отправлять HttpOnly cookie (JWT)
    });

    console.log("Данные успешно отправлены:", response.data);
  } catch (error: any) {
    console.error("Ошибка при отправке:", error.response?.data || error.message);
  }
};

const insertData = () => {
  return {
    generalInfoData: JSON.parse(localStorage.getItem("generalInfoData") || "[]"),
    measurementsTableData: JSON.parse(localStorage.getItem("measurementsTableData") || "[]"),
    sampleMeasurementTableData: JSON.parse(localStorage.getItem("sampleMeasurementTableData") || "[]"),
    siteInfoTableData: JSON.parse(localStorage.getItem("siteInfoTableData") || "[]"),
    sourceTableData: JSON.parse(localStorage.getItem("sourceTableData") || "[]"),
  };
};

export const useStepsTheme = () => {
  const isDarkTheme = useSelector((state: State) => state.isDarkTheme);

  const theme = themeQuartz.withPart(colorSchemeDark).withParams({
    fontFamily: "Afacad_Flux !important",
    foregroundColor: isDarkTheme ? "var(--tree-text)" : "var(--border)",
    headerTextColor: "var(--tree-text)",
    rangeSelectionBorderColor: "var(--tree-text)",
    rangeSelectionBackgroundColor: "var(--scrollbar-track-color)",
    columnBorder: { color: isDarkTheme ? '#33383d' : "lightgrey", width: '1px' },
  });

  return theme;
};

export const CustomStepIconRoot = styled('div')<{ ownerState: { active?: boolean; completed?: boolean } }>(
  ({ ownerState }) => ({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: '50%',
    width: '4vh',
    height: '4vh',
    fontSize: '2vh',
    fontFamily: 'Afacad_Flux',
    color: 'var(--step-color-active)', 
    transition: '0.8s',
  })
);

export const StepNumberCircle = styled('div')<{ ownerState: { active?: boolean } }>(
  ({ ownerState }) => ({
    width: '4vh',
    height: '4vh',
    borderRadius: '50%',
    backgroundColor: ownerState.active ? 'var(--step-color-active)' : 'var(--step-color)',  
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '2vh',
    color: 'var(--step-text)', 
    fontWeight: ownerState.active ? 'bold' : '',
    transition: '0.8s',
  })
);
