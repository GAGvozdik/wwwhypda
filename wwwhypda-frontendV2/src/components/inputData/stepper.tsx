import messages from '../../common/error_messages.json';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import styles from './stepper.module.scss';

import type { StepIconProps } from '@mui/material/StepIcon';
import Check from '@mui/icons-material/Check';

import SiteInfo from './steps/siteInfo';
import GeneralInfo from './steps/generalInfo';
import SourceInfo from './steps/sourceInfo';
import MeasurementSample from './steps/measurementSample';
import Measurements from './steps/measurements';
import {CustomStepIconRoot, StepNumberCircle} from './steps';
// import {sendAllDataToServer, CustomStepIconRoot, StepNumberCircle} from './steps';
// import { useModal } from '../modal/modalContext';
import { useDispatch } from 'react-redux';
import { ClearSampleMeasurementData, ClearMeasurementsData } from '../../redux/actions';
import type { WithRecaptchaProps } from '../commonFeatures/withRecaptcha';
import withRecaptcha from '../commonFeatures/withRecaptcha';
import SingleSkeleton from '../commonFeatures/singleSkeleton';

const steps = [
    { label: messages.step_1, title: messages.step_site_title },
    { label: messages.step_2, title: messages.step_general_title },
    { label: messages.step_3, title: messages.step_source_title },
    { label: messages.step_4, title: messages.step_sample_title },
    { label: messages.step_5, title: messages.step_measurements_title },
];

function CustomStepIcon(props: StepIconProps) {
    const { active, completed, className, icon } = props;

    return (
        <CustomStepIconRoot ownerState={{ active, completed }} className={className}>
            {completed ? (
                <Check className="MuiStepIcon-completedIcon" />
            ) : (
                <StepNumberCircle ownerState={{ active }}>{icon}</StepNumberCircle>
            )}
        </CustomStepIconRoot>
    );
}

interface CustomStepperProps {
    handleClick: () => void;
    isLoading: boolean;
    isEditable: boolean;
}

function CustomStepper({handleClick, isLoading, isEditable}: CustomStepperProps & WithRecaptchaProps) {

    const navigate = useNavigate();

    const [activeStep, setActiveStep] = useState<number>(() => {
        const savedStep = localStorage.getItem('activeStep');
        return savedStep !== null ? Number(savedStep) : 0;
    });

    const [siteInfoKey, setSiteInfoKey] = useState(0);
    const [generalInfoKey, setGeneralInfoKey] = useState(0);
    const [sourceInfoKey, setSourceInfoKey] = useState(0);



    const dispatch = useDispatch();

    const handleClearAll = () => {
        switch (activeStep) {
            case 0:
                localStorage.removeItem("siteInfoTableData");
                setSiteInfoKey(prevKey => prevKey + 1);
                break;
            case 1:
                localStorage.removeItem("generalInfoData");
                setGeneralInfoKey(prevKey => prevKey + 1);
                break;
            case 2:
                localStorage.setItem("sourceTableData", "[]");
                setSourceInfoKey(prevKey => prevKey + 1);
                break;
            case 3:
                dispatch(ClearSampleMeasurementData());
                // dispatch(ClearMeasurementsData());
                break;
            case 4:
                dispatch(ClearMeasurementsData());
                // dispatch(ClearSampleMeasurementData());
                break;
            default:
                break;
        }
    };

    const clearAction = (
        <SingleSkeleton
            loading={isLoading}
            margin={'0'}
            width={'7.5rem'}
            height={'2.5rem'}
        >
            <Button
                onClick={handleClearAll}
                className={styles.submitButton}
                disabled={!isEditable || isLoading}
                style={{
                    minHeight: '2.5rem',   // минимальная высота в rem
                    minWidth: '7.5rem'    // ширина в rem
                }}
            >
                {messages.ui_clear_all}
            </Button>
        </SingleSkeleton>
    );

    const stepComponents = [
        <SiteInfo key={siteInfoKey} isEditable={isEditable} clearAction={clearAction}/>,
        <GeneralInfo key={generalInfoKey} isEditable={isEditable} clearAction={clearAction}/>,
        <SourceInfo key={sourceInfoKey} isEditable={isEditable} clearAction={clearAction}/>,
        <MeasurementSample isEditable={isEditable} clearAction={clearAction}/>,
        <Measurements isEditable={isEditable} clearAction={clearAction}/>,
    ];

    const [skipped, setSkipped] = useState(new Set<number>());

    const isStepSkipped = (step: number) => skipped.has(step);

    const handleNext = () => {
        let newSkipped = skipped;
        if (isStepSkipped(activeStep)) {
            newSkipped = new Set(newSkipped.values());
            newSkipped.delete(activeStep);
        }
        const newStep = activeStep + 1;
        setActiveStep(newStep);
        setSkipped(newSkipped);
        localStorage.setItem('activeStep', newStep.toString());
    };

    const handleBack = () => {
        const newStep = activeStep - 1;
        setActiveStep(newStep);
        localStorage.setItem('activeStep', newStep.toString());
    };

    const handleNextOrFinish = () => {
        if (activeStep === steps.length - 1) {
            if (!isEditable) {
                navigate('/account');
            } else {
                handleNext();
            }
        } else {
            handleNext();
        }
    };

    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'activeStep') {
                const savedStep = localStorage.getItem('activeStep');
                setActiveStep(savedStep !== null ? Number(savedStep) : 0);
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    return (
        <Box sx={{ width: '100%', minWidth: 0 }} className={`${styles.treeText} ${styles.stepperPage}`}>
            <Stepper activeStep={activeStep}>
                {steps.map((step) => (
                    <Step key={step.label}>
                        <StepLabel StepIconComponent={CustomStepIcon}>
                            <div className={styles.treeText}>{step.label}</div>
                        </StepLabel>
                    </Step>
                ))}
            </Stepper>

            {activeStep === steps.length ? (
                <React.Fragment>
                    <Box className={styles.stepContent}>
                        <Typography
                            sx={{
                                paddingTop: '2rem',
                                fontSize: 'calc(var(--main-font-size) * 2)',
                                display: 'flex',
                                justifyContent: 'center',
                                fontFamily: 'Afacad_Flux',
                                color: 'var(--tree-text)'
                            }}
                        >
                            {messages.ui_all_steps_completed}
                        </Typography>

                        <Box sx={{ minHeight: '4rem' }} />
                    </Box>

                    <Box className={styles.stepNavigation}>
                        <Button
                            onClick={() => {
                                const lastStep = steps.length - 1;
                                setActiveStep(lastStep);
                                localStorage.setItem('activeStep', lastStep.toString());
                            }}
                            className={styles.submitButton}
                            sx={{ mr: 1 }}
                            style={{ minWidth: '7.5rem' }}
                        >
                            {messages.ui_back}
                        </Button>

                        <Box sx={{ flex: '1 1 auto' }} />

                            <Button
                                onClick={() => handleClick()}
                                className={styles.submitButton}
                                style={{ minWidth: '7.5rem' }}
                                disabled={isLoading} // Disable when loading
                            >
                                {messages.ui_submit}
                            </Button>

                    </Box>

                </React.Fragment>
            ) : (

                <React.Fragment>
                    <Box className={styles.stepContent}>
                        <div className={styles.stepTitle}>
                            {/* Панель действий ниже центрируем по высоте, отдельно от заголовка. */}
                            {/* Left spacer */}
                            <div
                                style={{
                                    color: "var(--tree-text)",
                                    textAlign: "center",
                                    fontSize: 'calc(var(--main-font-size) * 1.5)'
                                }}
                            >
                                {steps[activeStep].title}
                            </div>
                        </div>
                        {stepComponents[activeStep]}
                    </Box>
                    <Box className={styles.stepNavigation}>
                        <Button
                            disabled={activeStep === 0}
                            onClick={handleBack}
                            sx={{ mr: 1 }}
                            className={styles.submitButton}
                        >
                            {messages.ui_back}
                        </Button>

                        <Box sx={{ flex: '1 1 auto' }} />

                        <Button onClick={handleNextOrFinish} className={styles.submitButton}>
                            {activeStep === steps.length - 1 ? messages.step_finish : messages.step_next}
                        </Button>
                    </Box>
                </React.Fragment>
            )}
        </Box>
    );
}

export default withRecaptcha(CustomStepper);

