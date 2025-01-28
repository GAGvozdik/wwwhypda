import React from 'react';
import styles from '../menu.module.scss';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';


interface SearchTableRowProps {
    name: string;
    desc: string;
    unit: string;
    value: number; // Добавьте значение для радиокнопки
    onChange: (value: number) => void; // Функция для изменения состояния
    selectedValue: number | null;
}

const SearchTableRow: React.FC<SearchTableRowProps> = ({ name, desc, unit, value, onChange, selectedValue }) => {
    const radioId = `radio-${value}`; 
    return (
        <label
            htmlFor={radioId}
            className={styles.searchTableRow}
        >
            <tr>
                <td>
                    <Radio
                        size='small'
                        id={radioId}
                        sx={{
                            color: 'var(--radio-color)',
                            '&.Mui-checked': {
                                color: 'var(--radio-color)',
                            },
                        }}
                        checked={selectedValue === value} // Управляемый компонент: checked по значению selectedValue
                        value={value}
                        onChange={() => onChange(value)}
                    />
                </td>
                <td>
                    <span dangerouslySetInnerHTML={{ __html: name }} />
                </td>
                <td>
                    <span dangerouslySetInnerHTML={{ __html: desc }} />
                </td>
                <td>
                    [&nbsp;&nbsp;&nbsp;&nbsp;<span dangerouslySetInnerHTML={{ __html: unit }} />&nbsp;&nbsp;&nbsp;&nbsp;]
                </td>
            </tr>
        </label>
    );
};
export default SearchTableRow;




