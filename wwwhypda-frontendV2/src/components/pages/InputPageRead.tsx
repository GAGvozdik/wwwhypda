import messages from '../../common/error_messages.json';
import windowStyles from '../mainWindow/windowStyles.module.scss';
import React, {useState} from 'react';
import styles from '../menu.module.scss';
import CustomStepper from '../inputData/stepper';

import {sendAllDataToServer} from '../inputData/steps';
import { useModal } from '../modal/modalContext';

const InputPageRead: React.FC = () => {

    const { openModal } = useModal();
    const [isLoading, setIsLoading] = useState(false);

    // const handleReset = () => {
    //     openModal(
    //         'Do you want to submit data??', // Title
    //         '', // Description
    //         'Send', // Action button text
    //         () => { handleClick(); }
    //     );
    //     // setActiveStep(0);
    // };

    const handleSomething = async () => {
        // CAPTCHA removed for this JWT/CSRF-protected operation; historical comments preserved.
        // Or show an error message to the user
        // Execute reCAPTCHA here

        openModal({
            title: messages.submit_dataset_title,
            description: "",
            buttons: [
                {
                    label: messages.ui_submit,
                    onClick: () => {
                        handleSubmitData();
                    },
                },
                // {
                //     label: "Deny",
                //     onClick: () => console.log("Deny"),
                // },
                {
                    label: messages.close,
                    onClick: () => {},
                }
            ]
        });
    };

    const handleSubmitData = async () => {
        setIsLoading(true);
        try {
            await sendAllDataToServer();
            localStorage.removeItem("generalInfoData");
            localStorage.removeItem("measurementsTableData");
            localStorage.removeItem("sampleMeasurementTableData");
            localStorage.removeItem("siteInfoTableData");
            localStorage.removeItem("sourceTableData");
            localStorage.removeItem('activeStep');
        } catch {
            console.warn("Submission request failed");
            // Optionally, display an error message to the user
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`${styles.treeText} ${windowStyles.contentGroup}`}>

            <div style={{
                    justifyContent: 'center',
                    justifyItems: 'center',
                    fontFamily: 'Afacad_Flux !important',
                    alignItems: 'center',
                    textAlign: 'center',
                    fontSize: 'calc(var(--main-font-size) * 2.5)',
                    padding: '0.5rem'
                }}
            >
                {messages.input_read_title}
            </div>

            <CustomStepper handleClick={handleSomething} isLoading={isLoading} isEditable={false}/>
        </div>
    );
};

export default InputPageRead;















