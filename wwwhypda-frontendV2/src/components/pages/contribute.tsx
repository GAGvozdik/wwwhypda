import messages from '../../common/error_messages.json';
import React from 'react';
import styles from '../menu.module.scss';
// import axios from "axios";
// import { useState } from "react";

const Contribute: React.FC = () => {

    return (
        <div className={styles.treeText}>
            <h2>{messages.menu_contribute}</h2>

            <div style={{ color: 'var(--error-text)', fontSize:'var(--head-font-size)', fontFamily: 'Afacad_Flux !important;'}}>

            </div>

        </div>
    );
};

export default Contribute;