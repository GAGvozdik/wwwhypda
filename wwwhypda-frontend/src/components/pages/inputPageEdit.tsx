import React from 'react';
import styles from '../menu.module.scss';
import CustomStepper from '../inputData/stepper';

import {sendAllDataToServer} from '../inputData/steps';

const InputPageEdit: React.FC = () => {

    const handleReset = () => {
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
                <h2>InputPageEdit</h2>
            </div>

            <CustomStepper handleClick={handleReset}/>
        </div>
    );
};

export default InputPageEdit;






