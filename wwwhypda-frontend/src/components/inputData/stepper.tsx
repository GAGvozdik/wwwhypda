import * as React from 'react';
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import styles from './stepper.module.scss';

import { styled } from '@mui/material/styles';
import { StepIconProps } from '@mui/material/StepIcon';
import Check from '@mui/icons-material/Check';

import SiteInfo from './steps/siteInfo';
import GeneralInfo from './steps/generalInfo';
import SourceInfo from './steps/sourceInfo';
import MeasurementSample from './steps/measurementSample';
import Measurements from './steps/measurements';

const steps = ['Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5'];

const stepComponents = [
    <SiteInfo />,
    <GeneralInfo />,
    <SourceInfo />,
    <MeasurementSample />,
    <Measurements />,
];

const CustomStepIconRoot = styled('div')<{ ownerState: { active?: boolean; completed?: boolean } }>(
  ({ ownerState }) => ({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: '50%',
    width: '4vh',
    height: '4vh',
    fontSize: '2vh',
    fontFamily: 'Afacad_Flux',
    color: 'var(--step-color-active)', 
    transition: '0.8s',
  })
);

const StepNumberCircle = styled('div')<{ ownerState: { active?: boolean } }>(
  ({ ownerState }) => ({
    width: '4vh',
    height: '4vh',
    borderRadius: '50%',
    backgroundColor: ownerState.active ? 'var(--step-color-active)' : 'var(--step-color)', // Красный, если шаг активен
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '2vh',
    color: 'var(--step-text)', 
    fontWeight: ownerState.active ? 'bold' : '',
    transition: '0.8s',
  })
);

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



export default function CustomStepper() {
    const [activeStep, setActiveStep] = React.useState(0);
    const [skipped, setSkipped] = React.useState(new Set<number>());

    const isStepOptional = (step: number) => {
        return step === 1;
    };

    const isStepSkipped = (step: number) => {
        return skipped.has(step);
    };

    const handleNext = () => {
        let newSkipped = skipped;
        if (isStepSkipped(activeStep)) {
            newSkipped = new Set(newSkipped.values());
            newSkipped.delete(activeStep);
        }

        setActiveStep((prevActiveStep) => prevActiveStep + 1);
        setSkipped(newSkipped);
    };

    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };



    const handleReset = () => {
        setActiveStep(0);
    };

    return (
        <Box sx={{ width: '100%' }} className={styles.treeText}>



            <Stepper activeStep={activeStep}>
                {
                    steps.map((label, index) => {
                        return (
                            <Step key={label}>
                                <StepLabel
                                    StepIconComponent={CustomStepIcon} 
                                >
                                    <div className={styles.treeText}>{label}</div>
                                </StepLabel>
                            </Step>

                        );
                    }
                )}
            </Stepper>


            {activeStep === steps.length ? (
                <React.Fragment>
                    <Typography sx={{ mt: 2, mb: 1 }}>
                        All steps completed - you&apos;re finished
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
                        <Box sx={{ flex: '1 1 auto' }} />
                        <Button onClick={handleReset} className={styles.submitButton}>Reset</Button>
                    </Box>
                </React.Fragment>
            ) : (
                <React.Fragment>
                    {stepComponents[activeStep]}
                    <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
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
