import React, {useState} from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../menu.module.scss';
import CustomStepper from '../inputData/stepper';

import {sendAllDataToServer} from '../inputData/steps';
import { useModal } from '../modal/modalContext';
import withRecaptcha, { WithRecaptchaProps } from '../commonFeatures/withRecaptcha';


const InputPage: React.FC<WithRecaptchaProps> = ({ executeRecaptcha }) => {

    const { openModal } = useModal();
    const navigate = useNavigate();
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
        if (!executeRecaptcha) {
            console.error('Recaptcha not available'); // Or show an error message to the user
            return;
        }

        const token = await executeRecaptcha('submit_data'); // Execute reCAPTCHA here

        openModal({
            title: "Submit dataset?",
            description: "",
            buttons: [
                {
                    label: "Submit",
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
        setIsLoading(true);
        try {
            await sendAllDataToServer(token); // Await the completion
            localStorage.removeItem("generalInfoData");
            localStorage.removeItem("measurementsTableData");
            localStorage.removeItem("sampleMeasurementTableData");
            localStorage.removeItem("siteInfoTableData");
            localStorage.removeItem("sourceTableData");
            localStorage.removeItem('activeStep');
            const isSuperuser = localStorage.getItem('isSuperuser') === 'true';
            if (isSuperuser) {
                navigate('/superaccount');
            } else {
                navigate('/account');
            }
        } catch (error) {
            console.error("Error submitting data:", error);
            // Optionally, display an error message to the user
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.treeText}>

            <div style={{ 
                    display: 'flex',
                    justifyContent: 'center', 
                    fontFamily: 'Afacad_Flux !important',
                    fontSize: '5vh',
                    padding: '1vh'
                }}
            >
                INPUT PAGE
            </div>

            <CustomStepper handleClick={handleSomething} isLoading={isLoading} isEditable={true}/>
        </div>
    );
};

export default withRecaptcha(InputPage);






