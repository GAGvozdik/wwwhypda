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

const InputPage: React.FC = () => {

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
        // CAPTCHA removed for this JWT/CSRF-protected operation; historical comments preserved.
        // Or show an error message to the user
        // Execute reCAPTCHA here

        openModal({
            title: messages.submit_dataset_title,
            description: "Your submission is accessible only to you and authorised site administrators and is not published for visitors. Submit only material you are entitled to share. Author entry is temporarily disabled; do not enter other people's names in other fields. Do not include private contact details, credentials, confidential material or sensitive personal data.",
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
            await sendAllDataToServer(); // Await the completion
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

export default InputPage;






