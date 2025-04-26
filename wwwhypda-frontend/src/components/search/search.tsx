import React from 'react';
import styles from "./searchStyles.module.scss";
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
// import Button from './';
import SearchTableRow from './searchTableRow';

import {useEffect, useState, useRef} from 'react';
import axios from 'axios';

import { UpdateTableData, } from '../../redux/actions';
import { State, UpdateTableDataAction } from '../../common/types';
import { useSelector, useDispatch } from 'react-redux';
// import {MeasurementData, testColumns} from '../../common/types';
import { DynamicRowData } from '../../common/types'; // Импортируем новый тип
import SearchResultsTable from './searchResultsTable';


interface Parameter {
  id_Parameter: number;
  code: string;
  param_name: string;
  units: string;
  html_code: string;
  html_units: string;
  MaxValue: number;
  MinValue: number;
}



const Search: React.FC = () => {

    let rt_id = useSelector((state: State) => state.currentRTID);  
    let rt_name = useSelector((state: State) => state.currentRTName);  

    const dispatch = useDispatch();
    

    const [parameters, setParameters] = useState<Parameter[]>([]);

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchParameters = async () => {
            try {
                const response = await axios.get<Parameter[]>('http://localhost:5000/api/parameters'); 
                setParameters(response.data);
 
            } catch (error: any) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };
        fetchParameters();
    }, []);

    const [selectedValue, setSelectedValue] = useState<number | null>(null); // Состояние для выбранного параметра

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault(); // Предотвращаем перезагрузку страницы
        if (selectedValue !== null) {
            console.log(`Selected Parameter ID: ${selectedValue}`); // Выводим в консоль

            const fetchParameters = async () => {
                try {
                    const response = await axios.get<DynamicRowData[]>(`http://localhost:5000/api/samples/${rt_id}/${selectedValue}`); 

                    console.log(response.data);

                    const res = response.data.map((item, index) => ({
                        ...item,
                        id: index + 1 
                    }));

                    dispatch<UpdateTableDataAction>(UpdateTableData(res));

                    console.log(res);

                } catch (error: any) {
                    setError(error.message);
                } finally {
                    setLoading(false);
                }
            };
            fetchParameters();
        }
    };

    return (
        <div 
            className={`${styles.treeText}`} 
            style={{    

                height: '100%',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gridTemplateRows: '1fr',
                // boxSizing: 'border-box',
                // overflow: 'scroll',
                // overflowY: 'scroll',
                paddingTop: '2vh',
                gap: '2vh'
            }}
        >
            <div 
                className={`${styles.treeText}`} 
                style={{    
                    // margin: '2vh',
                    // padding: '1vh',
                    // border: '3px solid var(--border)',
                    backgroundColor: 'var(--drawer-color)',
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                    height: '82vh',
                    // overflow: 'scroll',
                    // overflowY: 'scroll',
                    gridRowStart: 1, 
                    gridRowEnd: 1, 
                    gridColumnStart: 2, 
                    gridColumnEnd: 2, 
                }}
            >
                <SearchResultsTable/>
            </div>

            <div 
                className={`${styles.treeText}`} 
                style={{    
                    // margin: '2vh',
                    // padding: '1vh',
                    // border: '3px solid var(--border)',
                    backgroundColor: 'var(--drawer-color)',
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                    height: '82vh',
                    // overflow: 'scroll',
                    overflowY: 'scroll',
                    gridRowStart: 1, 
                    gridRowEnd: 1, 
                    gridColumnStart: 1, 
                    gridColumnEnd: 2, 
                }}
            >
                <div 
                    className={styles.treeText} 
                    style={{    
                        marginTop: '2vh',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        fontSize: 'var(--head-font-size)',
                        textAlign: 'center', 
                    }}
                >
                    Search in {rt_name}
                </div>

                <FormControl
                    style={{    
                        marginTop: '2vh',       
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                    component="form" // Добавляем компонент формы
                    onSubmit={handleSubmit} // Обрабатываем событие отправки формы
                >
                    {/* <FormLabel id="demo-radio-buttons-group-label">Parameter</FormLabel> */}
                    <RadioGroup
                        aria-labelledby="demo-radio-buttons-group-label"
                        defaultValue="female"
                        name="radio-buttons-group"
                        value={selectedValue}
                        onChange={(event) => {setSelectedValue(parseInt(event.target.value as string, 10))}}
                    >

                        <table>
                            <tbody>

                                {parameters.map((param) => (
                                        <SearchTableRow
                                            name={param.html_code}
                                            desc={param.param_name}
                                            unit={param.html_units}
                                            value={param.id_Parameter} 
                                            onChange={setSelectedValue} 
                                            selectedValue={selectedValue} 
                                        />
                                    ))}

                            </tbody>
                        </table>
                    </RadioGroup>

                    <button type="submit" className={styles.submitButton} style={{width: '30%', marginBottom: '2vh'}}>
                        Find data
                    </button>

                </FormControl>
                
            </div>
        </div>
    );
};

export default Search;



// {


// }


