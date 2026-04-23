import * as React from 'react';
import Checkbox from '@mui/material/Checkbox';
import type { Dispatch, SetStateAction } from 'react';

interface CustomCheckboxProps {
    isChecked: boolean;
    onChange: Dispatch<SetStateAction<boolean>>;
    color?: string;
}

const CustomCheckbox: React.FC<CustomCheckboxProps> = ({ isChecked, onChange, color }) => {
    return (
        <Checkbox
            checked={isChecked}
            onChange={(event) => onChange(event.target.checked)}
            sx={{
                color: color ? color : 'var(--checkbox-color)',
                '&.Mui-checked': { color: color ? color : 'var(--checkbox-checked)' },
                fontFamily: 'MyRuda',
                zIndex: '99',
            }}
        />
    );
};

export default CustomCheckbox;




        // <FormControl size="small" className={styles.filterControlCheckbox}>
        //     <FormControlLabel
        //         control={
        //           <Checkbox 
        //             size="small"
        //             checked={freeOnly} 
        //             onChange={(e) => setFreeOnly(e.target.checked)} 
        //             sx={{ p: 0.5 }}
        //           />
        //         }
        //         label="Только бесплатные"
        //         slotProps={{
        //           typography: {
        //             sx: {
        //               fontFamily: 'MyRuda',
        //               fontSize: 'var(--standard-font-size)',
        //               color: 'rgba(var(--text-primary), 1)',
        //             },
        //           },
        //         }}
        //     />
        // </FormControl>