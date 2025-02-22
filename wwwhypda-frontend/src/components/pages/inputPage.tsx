import React from 'react';
import styles from '../menu.module.scss';
import CustomStepper from '../inputData/stepper';


const InputPage: React.FC = () => {
    return (

        <div className={styles.treeText}>

            <div style={{ justifyContent: 'center', justifyItems: 'center'}}>
                <h2>InputPage</h2>
            </div>

            <CustomStepper />
        </div>

    );
};

export default InputPage;






