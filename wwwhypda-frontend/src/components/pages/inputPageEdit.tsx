import React from 'react';
import styles from '../menu.module.scss';
import CustomStepper from '../inputData/stepper';

import {sendAllDataToServer} from '../inputData/steps';
import { useModal } from '../modal/modalContext';
import withRecaptcha, { WithRecaptchaProps } from '../commonFeatures/withRecaptcha';

const InputPageEdit: React.FC<WithRecaptchaProps> = ({ executeRecaptcha }) => {

    const { openModal } = useModal();

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
        if (!executeRecaptcha) {
            console.error('Recaptcha not available'); // Or show an error message to the user
            return;
        }

        const token = await executeRecaptcha('submit_data'); // Execute reCAPTCHA here

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
                // {
                //     label: "Deny",
                //     onClick: () => console.log("Deny"),
                // },
                {
                    label: "Close",
                    onClick: () => {},
                }
            ]
        });
    };

    const handleSubmitData = async (token: string) => {
        sendAllDataToServer(token);
        localStorage.removeItem("generalInfoData");
        localStorage.removeItem("measurementsTableData");
        localStorage.removeItem("sampleMeasurementTableData");
        localStorage.removeItem("siteInfoTableData");
        localStorage.removeItem("sourceTableData");
        localStorage.removeItem('activeStep');
    };

    return (
        <div className={styles.treeText}>

            <div style={{ 

                    justifyContent: 'center', 
                    justifyItems: 'center',
                    fontFamily: 'Afacad_Flux !important',
                    fontSize: '5vh',
                    padding: '1vh'
                }}
            >
                InputPageEdit
            </div>

            <CustomStepper handleClick={handleSomething}/>
        </div>
    );
};

export default withRecaptcha(InputPageEdit);