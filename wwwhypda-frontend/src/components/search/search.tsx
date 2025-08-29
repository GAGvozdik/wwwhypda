import React, { useCallback, useEffect, useState } from 'react';
import styles from "./searchStyles.module.scss";
import FormControl from '@mui/material/FormControl';
import RadioGroup from '@mui/material/RadioGroup';
import SearchTableRow from './searchTableRow';
import SingleSkeleton from '../commonFeatures/singleSkeleton';
import { UpdateTableData } from '../../redux/actions';
import { State, UpdateTableDataAction, DynamicRowData } from '../../common/types';
import { useSelector, useDispatch } from 'react-redux';
import SearchResultsTable from './searchResultsTable';
import api from '../api';
import withRecaptcha, { WithRecaptchaProps } from '../commonFeatures/withRecaptcha';

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

const Search: React.FC<WithRecaptchaProps> = ({ executeRecaptcha }) => {
    let rt_id = useSelector((state: State) => state.currentRTID);  
    let rt_name = useSelector((state: State) => state.currentRTName);  

    const dispatch = useDispatch();
    
    const [parameters, setParameters] = useState<Parameter[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchParameters = async () => {
            if (executeRecaptcha) {
                try {
                    const token = await executeRecaptcha('parameters');
                    const response = await api.get<Parameter[]>('/rocks/parameters', { headers: { 'X-Recaptcha-Token': token } }); 
                    setParameters(response.data);
     
                } catch (error: any) {
                    setError(error.message);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchParameters();
    }, [executeRecaptcha]);

    const [selectedValue, setSelectedValue] = useState<number | null>(null);

    const handleSubmit = useCallback(async (event: React.FormEvent) => {
        event.preventDefault();
        if (selectedValue !== null && executeRecaptcha) {
            const token = await executeRecaptcha('search');
            const fetchParameters = async () => {
                try {
                    const response = await api.get<DynamicRowData[]>(`/rocks/samples/${rt_id}/${selectedValue}`, { headers: { 'X-Recaptcha-Token': token } }); 

                    const res = response.data.map((item, index) => ({
                        ...item,
                        id: index + 1 
                    }));

                    dispatch<UpdateTableDataAction>(UpdateTableData(res));

                } catch (error: any) {
                    setError(error.message);
                } finally {
                    setLoading(false);
                }
            };
            fetchParameters();
        }
    }, [selectedValue, executeRecaptcha, rt_id, dispatch]);

    return (
        <div 
            className={`${styles.treeText}`} 
            style={{    
                height: '100%',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gridTemplateRows: '1fr',
                paddingTop: '2vh',
                gap: '2vh',
            }}
        >
            <div 
                className={`${styles.treeText}`} 
                style={{    
                    backgroundColor: 'var(--drawer-color)',
                    borderRadius: '8px',
                    boxSizing: 'border-box',
                    height: '82vh',
                    gridRowStart: 1, 
                    gridRowEnd: 1, 
                    gridColumnStart: 2, 
                    gridColumnEnd: 2, 
                }}
            >
                <SearchResultsTable/>
            </div>

            <SingleSkeleton loading={loading} error={error} height='82vh'>
                <div 
                    className={`${styles.treeText}`} 
                    style={{    
                        backgroundColor: 'var(--drawer-color)',
                        borderRadius: '4px',
                        boxSizing: 'border-box',
                        height: '82vh',
                        overflowY: 'hidden',
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
                        component="form"
                        onSubmit={handleSubmit}
                    >
                        
                        <RadioGroup
                            aria-labelledby="demo-radio-buttons-group-label"
                            defaultValue="female"
                            name="radio-buttons-group"
                            value={selectedValue}
                            onChange={(event) => {setSelectedValue(parseInt(event.target.value as string, 10))}}
                        >

                            <table>
                                <tbody>
                                    {(parameters || []).map((param) => (
                                            <SearchTableRow
                                                key={param.id_Parameter}
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
            </SingleSkeleton>
        </div>
    );
};

export default withRecaptcha(Search);