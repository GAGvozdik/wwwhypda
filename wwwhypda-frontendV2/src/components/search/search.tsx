import MainTree from '../tree/mainTree';
import messages from '../../common/error_messages.json';
import React, { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import styles from "./searchStyles.module.scss";
import { ToggleButton, ToggleButtonGroup, Button } from '@mui/material';
import { parseSearchParameter } from '../../common/catalog';
import FormControl from '@mui/material/FormControl';
import RadioGroup from '@mui/material/RadioGroup';
import SearchTableRow from './searchTableRow';
import SingleSkeleton from '../commonFeatures/singleSkeleton';
import { UpdateTableData } from '../../redux/actions';
import type { State, UpdateTableDataAction, CatalogParameter, CatalogSearchRow, SearchParameterSelection, SearchPanel, SearchPanels } from '../../common/types';
import { useSelector, useDispatch } from 'react-redux';
import SearchResultsTable from './searchResultsTable';
import api from '../api';
import { RecaptchaRequestContext } from '../commonFeatures/recaptchaContext';

const Search: React.FC = () => {
    const executeRecaptcha = useContext(RecaptchaRequestContext);
    const rt_id = useSelector((state: State) => state.currentRTID);
    const rt_name = useSelector((state: State) => state.currentRTName);

    const dispatch = useDispatch();

    const [allRootId, setAllRootId] = useState<string | null>(null);
    const [parameters, setParameters] = useState<CatalogParameter[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const pendingRequest = useRef(false);

    useEffect(() => {
        console.log('rt_name = ', rt_name);
    }, [rt_name, rt_id]);

    useEffect(() => {
        const fetchParameters = async () => {
            setLoading(true);
                try {

                    const response = await api.get<CatalogParameter[]>('/rocks/parameters');
                    setParameters(response.data);

                } catch {
                    setError(messages.catalog_load_failed);
                } finally {
                    setLoading(false);
                }

        };
        fetchParameters();
    }, []);

    const [selectedValue, setSelectedValue] = useState<SearchParameterSelection>('all');

    const [panels, setPanels] = useState<SearchPanels>({ tree: true, form: true, results: true });
    const panelHost = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const host = panelHost.current;
        const toolbar = host?.querySelector<HTMLElement>('[data-search-toolbar]');
        if (!host || !toolbar) return;
        // Measure only the toolbar in CSS pixels, never the viewport or browser zoom.
        const measure = () => host.style.setProperty('--search-toolbar-height', `${toolbar.getBoundingClientRect().height}px`);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(toolbar);
        return () => observer.disconnect();
    }, []);
    const request = useRef<{ controller: AbortController; rock: string; parameter: SearchParameterSelection } | null>(null);
    const selection = useRef({ rock: rt_id, parameter: selectedValue });
    selection.current = { rock: rt_id, parameter: selectedValue };
    const cancel = useCallback(() => {
        request.current?.controller.abort();
        request.current = null;
        pendingRequest.current = false;
    }, []);
    useEffect(() => () => cancel(), [cancel]);
    useEffect(() => {
        cancel();
        setIsSearching(false);
    }, [rt_id, selectedValue, cancel]);

    const setVisiblePanels = (next: SearchPanels) => {
        for (const panel of ['tree', 'form', 'results'] as SearchPanel[]) {
            if (!next[panel] && panelHost.current?.querySelector(`#search-panel-${panel}`)?.contains(document.activeElement)) {
                panelHost.current.querySelector<HTMLButtonElement>(`#search-toggle-${panel}`)?.focus({ preventScroll: true });
            }
        }
        setPanels(next);
    };
    const handleSubmit = useCallback(async (event: React.FormEvent) => {
        event.preventDefault();
        if (pendingRequest.current) return;
        if (!/^\d+$/.test(rt_id) || selectedValue === null) {
            setSearchError(messages.search_selection_required);
            setPanels(previous => ({ ...previous, results: true }));
            return;
        }
        setPanels(previous => ({ ...previous, results: true }));
        if (!executeRecaptcha) { setSearchError(messages.captcha_unavailable); return; }
        const job = { controller: new AbortController(), rock: rt_id, parameter: selectedValue };
        request.current = job;
        pendingRequest.current = true;
        setSearchError(null);
        setIsSearching(true);
        const current = () => request.current === job && !job.controller.signal.aborted &&
            selection.current.rock === job.rock && selection.current.parameter === job.parameter;
        let verified = false;
        try {
            const token = await executeRecaptcha('search');
            if (!current()) return;
            verified = true;
            const response = await api.get<CatalogSearchRow[]>('/rocks/search', {
                params: { rock_type_id: job.rock, parameter_id: job.parameter },
                headers: { 'X-Recaptcha-Token': token }, signal: job.controller.signal,
            });
            if (!Array.isArray(response.data)) throw new Error('Invalid catalog response');
            if (current()) dispatch<UpdateTableDataAction>(UpdateTableData(response.data));
        } catch {
            if (current()) setSearchError(verified ? messages.catalog_load_failed : messages.captcha_unavailable);
        } finally {
            if (request.current === job) { cancel(); setIsSearching(false); }
        }
    }, [selectedValue, rt_id, dispatch, executeRecaptcha, cancel]);

    const panelKeys: SearchPanel[] = ['tree', 'form', 'results'];
    const visibleCount = panelKeys.filter(panel => panels[panel]).length;
    const slot = (panel: SearchPanel) => ({
        id: `search-panel-${panel}`, inert: !panels[panel], 'aria-hidden': !panels[panel],
        className: `${styles.panelSlot} ${styles[`${panel}Slot`]} ${panels[panel] ? '' : styles.panelHidden}`,
    });

    return (
        <div ref={panelHost} className={`${styles.treeText} ${styles.searchWorkspace}`}>
            <div className={styles.panelToolbar} data-search-toolbar>
                <span id="search-view-label">{messages.search_view}</span>
                <ToggleButtonGroup aria-labelledby="search-view-label" value={panelKeys.filter(panel => panels[panel])}
                    onChange={(_event, values: SearchPanel[]) => setVisiblePanels({ tree: values.includes('tree'), form: values.includes('form'), results: values.includes('results') })}>
                    {panelKeys.map(panel => <ToggleButton key={panel} value={panel} id={`search-toggle-${panel}`}
                        aria-controls={`search-panel-${panel}`} aria-pressed={panels[panel]}>
                        <span aria-hidden="true">{panels[panel] ? '✓' : '−'}</span>
                        {panel === 'tree' ? messages.search_panel_tree : panel === 'form' ? messages.search_panel_form : messages.search_panel_results}
                    </ToggleButton>)}
                </ToggleButtonGroup>
                <Button className={styles.showAll} disabled={visibleCount === 3} onClick={() => setVisiblePanels({ tree: true, form: true, results: true })}>{messages.search_show_all}</Button>
            </div>
            {visibleCount === 0 && <div className={styles.noPanels} role="status">{messages.search_no_panels_visible}</div>}
        <div
            className={`${styles.searchLayout} ${visibleCount === 0 ? styles.noPanelLayout : ''}`}
            style={{



                '--tree-track': panels.tree ? '0.72fr' : '0fr',
                '--form-track': panels.form ? '1fr' : '0fr',
                '--results-track': panels.results ? '1fr' : '0fr',
                '--tree-height': panels.tree ? '12rem' : '0rem',
                '--form-height': panels.form ? '1fr' : '0fr',
                '--results-height': panels.results ? '32rem' : '0rem',
                '--first-gap': panels.tree && (panels.form || panels.results) ? '1rem' : '0rem',
                '--second-gap': panels.form && panels.results ? '1rem' : '0rem',
            } as React.CSSProperties}
        >

            <div {...slot('tree')}><MainTree onRootKnown={setAllRootId} /></div>
            <div {...slot('form')}>

            <div
                className={`${styles.treeText} ${styles.parametersPanel}`}
                style={{
                    backgroundColor: 'var(--drawer-color)',
                    borderRadius: '4px',
                    boxSizing: 'border-box',


                    // marginBottom: '2vh',




                }}
            >
                <SingleSkeleton loading={loading} error={error} height='100%' borderRadius='0.25rem'>
                    <div className={styles.parametersContent}>
                    <div
                        className={`${styles.treeText} ${styles.parametersTitle}`}
                        id="search-parameter-title"
                    >
                        {messages.search_in} {allRootId === rt_id ? messages.search_all_rock_types : rt_name}
                    </div>

                    <FormControl
                        className={styles.parametersForm}
                        component="form"
                        onSubmit={handleSubmit}
                    >

                        <RadioGroup
                            className={styles.parameterChoices}
                            aria-labelledby="search-parameter-title"
                            name="radio-buttons-group"
                            value={selectedValue}
                            onChange={(event) => setSelectedValue(parseSearchParameter(event.target.value))}
                        >


                                    <SearchTableRow name={messages.search_all_parameters} desc="" unit="" value="all" selectedValue={selectedValue} />
                                    {(parameters || []).map((param) => (
                                            <SearchTableRow
                                                key={param.id_Parameter}
                                                name={param.html_code}
                                                desc={param.param_name}
                                                unit={param.html_units}
                                                value={param.id_Parameter}
                                                selectedValue={selectedValue}
                                            />
                                        ))}

                        </RadioGroup>

                        <button type="submit" disabled={isSearching} className={`${styles.submitButton} ${styles.findButton}`}>
                            {messages.ui_find_data}
                        </button>

                    </FormControl>
                </div>
                </SingleSkeleton>
            </div>
            </div>

            <div {...slot('results')}>
            <div
                className={`${styles.treeText} ${styles.resultsPanel}`}
                style={{
                    backgroundColor: 'var(--drawer-color)',
                    borderRadius: '8px',
                    boxSizing: 'border-box',


                    // marginBottom: '2vh',




                }}
            >
                <div className={styles.tableLayer} aria-busy={isSearching}>
                    <SearchResultsTable loading={isSearching}/>
                    <SingleSkeleton loading={isSearching} error={searchError} height="100%" isLoadIcon={true}
                        overlay backgroundColor="var(--drawer-color)"><span /></SingleSkeleton>
                </div>
            </div>
            </div>
        </div>
        </div>
    );
};

export default Search;