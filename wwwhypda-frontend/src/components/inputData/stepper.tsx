import * as React from 'react';
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import styles from './stepper.module.scss';


import { StepIconProps } from '@mui/material/StepIcon';
import Check from '@mui/icons-material/Check';

import SiteInfo from './steps/siteInfo';
import GeneralInfo from './steps/generalInfo';
import SourceInfo from './steps/sourceInfo';
import MeasurementSample from './steps/measurementSample';
import Measurements from './steps/measurements';
import {sendAllDataToServer, CustomStepIconRoot, StepNumberCircle} from './steps';
import { useModal } from '../modal/modalContext';

const steps = [
    { label: 'Step 1', title: 'Site Information' },
    { label: 'Step 2', title: 'General information about measurements' },
    { label: 'Step 3', title: 'Source Information' },
    { label: 'Step 4', title: 'Measurement “Sample” (the borehole, the sample, or the borehole section where the measurement was performed)' },
    { label: 'Step 5', title: 'Measurements' },
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

const isEditable = true;

const stepComponents = [
    <SiteInfo isEditable={isEditable}/>,
    <GeneralInfo isEditable={isEditable}/>,
    <SourceInfo isEditable={isEditable}/>,
    <MeasurementSample isEditable={isEditable}/>,
    <Measurements isEditable={isEditable}/>,
];

interface CustomStepperProps {
    handleClick: () => void;
}


export default function CustomStepper({handleClick}: CustomStepperProps) {

    const [activeStep, setActiveStep] = React.useState<number>(() => {
        const savedStep = localStorage.getItem('activeStep');
        return savedStep !== null ? Number(savedStep) : 0;
    });


    // const { openModal } = useModal();

    // const handleReset = () => {
    //     openModal(
    //         'Do you want to submit data??', // Title
    //         '', // Description
    //         'Send', // Action button text
    //         () => { handleClick(); }
    //     );
    //     // setActiveStep(0);
    // };

    const [skipped, setSkipped] = React.useState(new Set<number>());

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

    return (
        <Box sx={{ width: '100%' }} className={styles.treeText}>
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
                    <Typography 
                        sx={{ 
                            paddingTop: '4vh', 
                            fontSize: '4vh', 
                            display: 'flex', 
                            justifyContent: 'center', 
                            fontFamily: 'Afacad_Flux',
                            color: 'var(--tree-text)'
                        }}
                    >
                        All steps completed - you're finished
                    </Typography>

                    <Box sx={{ minHeight: '41vh' }} /> 
                    <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2, marginTop: '1vh' }}>
                        <Button
                            onClick={() => {
                                const lastStep = steps.length - 1;
                                setActiveStep(lastStep);
                                localStorage.setItem('activeStep', lastStep.toString());
                            }}
                            className={styles.submitButton}
                            sx={{ mr: 1 }}
                        >
                            Back
                        </Button>

                        <Box sx={{ flex: '1 1 auto' }} />

                            <Button
                                onClick={handleClick}
                                className={styles.submitButton}
                                style={{ minWidth: 120 }}
                            >
                                Submit
                            </Button>

                    </Box>

                </React.Fragment>
            ) : (

                <React.Fragment>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '1rem 0' }}>
                        <div style={{ flex: 1 }}></div> {/* Left spacer */}
                        <div 
                            style={{
                                flex: 2,
                                color: "var(--tree-text)",
                                textAlign: "center",
                                fontSize: '3.5vh'
                            }}
                        >
                            {steps[activeStep].title}
                        </div>

                        <div 
                        style={{ 
                            flex: 1, 
                            display: 'flex', 
                            justifyContent: 'flex-end', 
                            alignItems: 'center'   // центрируем по высоте
                        }}
                        >
                        <Button
                            onClick={() => { /* TODO: Implement clear all logic */ }}
                            className={styles.submitButton}
                            style={{ 
                                maxHeight: '4vh',   // высота в vh
                                minWidth: '15vh'    // ширина в vh
                            }}
                        >
                            Clear all
                        </Button>
                        </div>


                    </div>
                    {stepComponents[activeStep]}
                    <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2, marginTop: '1vh' }}>
                        <Button
                            disabled={activeStep === 0}
                            onClick={handleBack}
                            sx={{ mr: 1 }}
                            className={styles.submitButton}
                        >
                            Back
                        </Button>

                        <Box sx={{ flex: '1 1 auto' }} />

                        <Button onClick={handleNext} className={styles.submitButton}>
                            {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
                        </Button>
                    </Box>
                </React.Fragment>
            )}
        </Box>
    );
}

