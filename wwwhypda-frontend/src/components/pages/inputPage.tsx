import React from 'react';
import styles from '../menu.module.scss';
import CustomStepper from '../inputData/stepper';

import {sendAllDataToServer} from '../inputData/steps';
import { useModal } from '../modal/modalContext';


const InputPage: React.FC = () => {

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

            <div style={{ 
                    justifyContent: 'center', 
                    justifyItems: 'center',
                    fontFamily: 'Afacad_Flux !important',
                    fontSize: '5vh',
                    padding: '1vh'
                }}
            >
                InputPage
            </div>

            <CustomStepper handleClick={handleSomething}/>
        </div>
    );
};

export default InputPage;






