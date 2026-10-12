import windowStyles from '../mainWindow/windowStyles.module.scss';
import messages from '../../common/error_messages.json';
import React, {useState} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from '../menu.module.scss';
import userStyles from '../users/users.module.scss';
import pageStyles from './inputPage.module.scss';
import CustomStepper from '../inputData/stepper';

import {sendAllDataToServer} from '../inputData/steps';
import { useModal } from '../modal/modalContext';
import withRecaptcha from '../commonFeatures/withRecaptcha';
import type { WithRecaptchaProps } from '../commonFeatures/withRecaptcha';

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
            description: "Submitted datasets are reviewed for public publication. Publish only data you are entitled to share. Do not include private contact details, credentials, or sensitive personal information. Published information may be copied by others.",
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
        <div className={`${styles.treeText} ${windowStyles.contentGroup}`}>

            <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    fontFamily: 'Afacad_Flux',
                    fontSize: 'calc(var(--main-font-size) * 2.5)',
                    padding: '0.5rem',

                }}
            >
                {messages.input_page_title}
            </div>

            <CustomStepper handleClick={handleSomething} isLoading={isLoading} isEditable={true}/>
            <p className={pageStyles.submissionNotice}>
                {messages.dataset_submission_notice}{' '}
                <Link className={userStyles.policyLink} to="/user-agreement" target="_blank" rel="noopener noreferrer">{messages.user_agreement}</Link>
                {' '}{messages.legal_link_and}{' '}
                <Link className={userStyles.policyLink} to="/privacy-policy" target="_blank" rel="noopener noreferrer">{messages.privacy_policy}</Link>.
            </p>
        </div>
    );
};

export default withRecaptcha(InputPage);






