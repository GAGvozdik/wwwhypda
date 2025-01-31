import React from 'react';
import styles from '../menu.module.scss';
import InputDataTable from '../inputData/inputDataTable'; 


const InputPage: React.FC = () => {
    return (

        <div className={styles.treeText}>

            <div style={{ justifyContent: 'center', justifyItems: 'center'}}>
                <h2>InputPage</h2>
            </div>

            <InputDataTable />
        </div>

    );
};

export default InputPage;






