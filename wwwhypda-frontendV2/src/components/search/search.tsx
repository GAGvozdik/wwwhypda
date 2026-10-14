import MainTree from '../tree/mainTree';
import messages from '../../common/error_messages.json';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import styles from "./searchStyles.module.scss";
import FormControl from '@mui/material/FormControl';
import RadioGroup from '@mui/material/RadioGroup';
import SearchTableRow from './searchTableRow';
import SingleSkeleton from '../commonFeatures/singleSkeleton';
import { UpdateTableData } from '../../redux/actions';
import type { State, UpdateTableDataAction, DynamicRowData } from '../../common/types';
import { useSelector, useDispatch } from 'react-redux';
import SearchResultsTable from './searchResultsTable';
import api from '../api';
import { RecaptchaRequestContext } from '../commonFeatures/recaptchaContext';

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
    const executeRecaptcha = useContext(RecaptchaRequestContext);
    const rt_id = useSelector((state: State) => state.currentRTID);
    const rt_name = useSelector((state: State) => state.currentRTName);

    const dispatch = useDispatch();

    const [parameters, setParameters] = useState<Parameter[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [isSearching, setIsSearching] = useState<boolean>(false);

    useEffect(() => {
        console.log('rt_name = ', rt_name);
    }, [rt_name, rt_id]);

    useEffect(() => {
        const fetchParameters = async () => {
            setLoading(true);
                try {

                    const response = await api.get<Parameter[]>('/rocks/parameters');
                    setParameters(response.data);

                } catch {
                    setError(messages.catalog_load_failed);
                } finally {
                    setLoading(false);
                }

        };
        fetchParameters();
    }, []);

    const [selectedValue, setSelectedValue] = useState<number | null>(null);

    const handleSubmit = useCallback(async (event: React.FormEvent) => {
        event.preventDefault();
        if (selectedValue !== null && executeRecaptcha) {
            setIsSearching(true);

            const fetchParameters = async () => {
                try {
                    const token = await executeRecaptcha('search');
                    const response = await api.get<DynamicRowData[]>(`/rocks/samples/${rt_id}/${selectedValue}`, { headers: { 'X-Recaptcha-Token': token } });
                    console.log(`/rocks/samples/${rt_id}/${selectedValue}`)
                    const res = response.data.map((item, index) => ({
                        ...item,
                        id: index + 1
                    }));

                    dispatch<UpdateTableDataAction>(UpdateTableData(res));

                } catch {
                    setError(messages.catalog_load_failed);
                } finally {
                    setLoading(false);
                    setIsSearching(false);
                }
            };
            fetchParameters();
        }
    }, [selectedValue, rt_id, dispatch, executeRecaptcha]);

    return (
        <div
            className={`${styles.treeText} ${styles.searchLayout}`}
            style={{



                gap: '1rem',
            }}
        >

            <MainTree />

            <div
                className={`${styles.treeText} ${styles.parametersPanel}`}
                style={{
                    backgroundColor: 'var(--drawer-color)',
                    borderRadius: '4px',
                    boxSizing: 'border-box',


                    // marginBottom: '2vh',




                }}
            >
                <SingleSkeleton loading={loading} error={error} height='100%'>
                    <div
                        className={styles.treeText}
                        id="search-parameter-title"
                        style={{
                            marginTop: '1rem',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            fontSize: 'var(--head-font-size)',
                            textAlign: 'center',
                        }}
                    >
                        {messages.search_in} {rt_name}
                    </div>

                    <FormControl
                        style={{
                            marginTop: '1rem',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                        component="form"
                        onSubmit={handleSubmit}
                    >

                        <RadioGroup
                            className={styles.parameterChoices}
                            aria-labelledby="search-parameter-title"
                            name="radio-buttons-group"
                            value={selectedValue}
                            onChange={(event) => {setSelectedValue(parseInt(event.target.value as string, 10))}}
                        >


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

                        </RadioGroup>

                        <button type="submit" className={`${styles.submitButton} ${styles.findButton}`}>
                            {messages.ui_find_data}
                        </button>

                    </FormControl>
                </SingleSkeleton>
            </div>


            <div
                className={`${styles.treeText} ${styles.resultsPanel}`}
                style={{
                    backgroundColor: 'var(--drawer-color)',
                    borderRadius: '8px',
                    boxSizing: 'border-box',


                    // marginBottom: '2vh',




                }}
            >
                <SingleSkeleton loading={isSearching} error={error} height='100%' isLoadIcon={true}>
                    <SearchResultsTable/>
                </SingleSkeleton>
            </div>

        </div>
    );
};

export default Search;