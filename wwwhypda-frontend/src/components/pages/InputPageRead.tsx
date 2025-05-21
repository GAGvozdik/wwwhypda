import React from 'react';
import styles from '../menu.module.scss';
import CustomStepper from '../inputData/stepper';

import {sendAllDataToServer} from '../inputData/steps';
import { useModal } from '../modal/modalContext';

const InputPageRead: React.FC = () => {

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

    const handleSomething = () => {
        openModal({
            title: "Submit dataset?",
            description: "",
            buttons: [
                {
                    label: "Submit",
                    onClick: () => {
                        handleClick();
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

    const handleClick = () => {
        sendAllDataToServer();
        localStorage.removeItem("generalInfoData");
        localStorage.removeItem("measurementsTableData");
        localStorage.removeItem("sampleMeasurementTableData");
        localStorage.removeItem("siteInfoTableData");
        localStorage.removeItem("sourceTableData");
        localStorage.removeItem('activeStep');
    };

    return (
        <div className={styles.treeText}>

            <div style={{ justifyContent: 'center', justifyItems: 'center'}}>
                <h2>InputPageRead</h2>
            </div>

            <CustomStepper handleClick={handleSomething}/>
        </div>
    );
};

export default InputPageRead;















