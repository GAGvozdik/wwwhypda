import React from 'react';
import styles from '../menu.module.scss';

const Home: React.FC = () => {
    return (
        <div className={`${styles.treeText} ${styles.clearPage}`}>
            <h2>Home</h2>
        </div>
    );
};

export default Home;

