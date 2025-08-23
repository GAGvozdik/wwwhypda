import React, {useState} from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../menu.module.scss';
import CustomStepper from '../inputData/stepper';

import {completeSubmission} from '../inputData/steps';
import { useModal } from '../modal/modalContext';
import withRecaptcha, { WithRecaptchaProps } from '../commonFeatures/withRecaptcha';

const InputPageEdit: React.FC<WithRecaptchaProps> = ({ executeRecaptcha }) => {

    const { openModal } = useModal();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    const handleSomething = async () => {
        if (!executeRecaptcha) {
            console.error('Recaptcha not available');
            return;
        }

        const token = await executeRecaptcha('submit_data');

        openModal({
            title: "Submit your changes?",
            description: "",
            buttons: [
                {
                    label: "Submit editings",
                    onClick: () => {
                        handleSubmitData(token);
                    },
                },
                {
                    label: "Close",
                    onClick: () => {},
                }
            ]
        });
    };

    const handleSubmitData = async (token: string) => {
        setIsLoading(true);
        const submissionId = localStorage.getItem("submissionId");
        if (!submissionId) {
            console.error("Submission ID is not available.");
            setIsLoading(false);
            return;
        }

        try {
            await completeSubmission(submissionId);
            localStorage.removeItem("generalInfoData");
            localStorage.removeItem("measurementsTableData");
            localStorage.removeItem("sampleMeasurementTableData");
            localStorage.removeItem("siteInfoTableData");
            localStorage.removeItem("sourceTableData");
            localStorage.removeItem('activeStep');
            localStorage.removeItem('submissionId');
            navigate('/superaccount');
        } catch (error) {
            console.error("Error submitting data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.treeText}>

            <div style={{ 

                    justifyContent: 'center', 
                    justifyItems: 'center',
                    fontFamily: 'Afacad_Flux !important',
                    fontSize: '5vh',
                    padding: '1vh',
                    textAlign: 'center'
                }}
            >
                InputPageEdit
            </div>

            <CustomStepper handleClick={handleSomething} isLoading={isLoading} isEditable={true}/>
        </div>
    );
};

export default withRecaptcha(InputPageEdit);