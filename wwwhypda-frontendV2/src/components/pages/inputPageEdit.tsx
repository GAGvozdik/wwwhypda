import messages from '../../common/error_messages.json';
import windowStyles from '../mainWindow/windowStyles.module.scss';
import React, {useState} from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../menu.module.scss';
import CustomStepper from '../inputData/stepper';

import {completeSubmission} from '../inputData/steps';
import { useModal } from '../modal/modalContext';

const InputPageEdit: React.FC = () => {

    const { openModal } = useModal();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    const handleSomething = async () => {
        // CAPTCHA removed for this JWT/CSRF-protected operation; historical comments preserved.
        // const token = await executeRecaptcha('submit_data');

        openModal({
            title: messages.submit_changes_title,
            description: "",
            buttons: [
                {
                    label: messages.submit_changes_action,
                    onClick: () => {
                        handleSubmitData();
                    },
                },
                {
                    label: messages.close,
                    onClick: () => {},
                }
            ]
        });
    };

    const handleSubmitData = async () => {
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
        } catch {
            console.warn("Submission request failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`${styles.treeText} ${windowStyles.contentGroup}`}>

            <div style={{

                    justifyContent: 'center',
                    justifyItems: 'center',
                    fontFamily: 'Afacad_Flux',
                    fontSize: 'calc(var(--main-font-size) * 2.5)',
                    padding: '0.5rem',
                    textAlign: 'center'
                }}
            >
                {messages.input_edit_title}
            </div>

            <CustomStepper handleClick={handleSomething} isLoading={isLoading} isEditable={true}/>
        </div>
    );
};

export default InputPageEdit;