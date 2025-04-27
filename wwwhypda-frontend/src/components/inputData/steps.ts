// src/common/themes/themeDarkBlue.ts

import { colorSchemeDark, themeQuartz } from "ag-grid-community";
import { State } from '../../common/types';
import { useSelector } from 'react-redux';

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
