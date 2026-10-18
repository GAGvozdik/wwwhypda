import React from 'react';
import type { SearchParameterSelection } from '../../common/types';
import styles from "./searchStyles.module.scss";
import Radio from '@mui/material/Radio';
import FormControlLabel from '@mui/material/FormControlLabel';
// import RadioGroup from '@mui/material/RadioGroup';
// import FormControlLabel from '@mui/material/FormControlLabel';
// import FormControl from '@mui/material/FormControl';
// import FormLabel from '@mui/material/FormLabel';


interface SearchTableRowProps {
    name: string;
    desc: string;
    unit: string;
    value: Exclude<SearchParameterSelection, null>; // Добавьте значение для радиокнопки
    onChange?: (value: Exclude<SearchParameterSelection, null>) => void; // Функция для изменения состояния
    selectedValue: SearchParameterSelection;
}

const SearchTableRow: React.FC<SearchTableRowProps> = ({ name, desc, unit, value, onChange, selectedValue }) => {
    const radioId = `radio-${value}`; 
    return (
        <FormControlLabel
            className={styles.searchParameter}
            value={value}
            disableTypography
            control={
                <Radio
                    size='small'
                    id={radioId}
                    sx={{
                        color: 'var(--radio-color)',
                        '&.Mui-checked': { color: 'var(--radio-color)' },
                    }}
                    checked={selectedValue === value} // Управляемый компонент: checked по значению selectedValue
                    value={value}
                    onChange={onChange ? () => onChange(value) : undefined}
                />
            }
            label={
                <span className={`${styles.parameterText} ${value === 'all' ? styles.allParameter : ''}`}>
                    {value === 'all' ? <span>{name}</span> : <>
                        <span className={styles.parameterDescription}>
                            <span dangerouslySetInnerHTML={{ __html: desc }} />{' '}
                            <span dangerouslySetInnerHTML={{ __html: name }} />
                        </span>
                        <span className={styles.parameterUnit}>[ <span dangerouslySetInnerHTML={{ __html: unit }} /> ]</span>
                    </>}
                </span>
            }
        />
    );
};
export default SearchTableRow;




