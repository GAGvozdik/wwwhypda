import React from 'react';
import styles from './home.module.scss';
import AnimatedLogo from '../../logos/logo/AnimatedLogo';
import Button from '@mui/material/Button';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { UpdateOpenClose } from '../../redux/actions';
import type { UpdateOpenCloseAction } from '../../common/types';
const Home: React.FC = () => {

    const navigate = useNavigate();
    const dispatch = useDispatch();
    // let isOpenNow = useSelector((state: State) => state.open);  

    return (
        <div className={styles.treeText}>
            <AnimatedLogo></AnimatedLogo>

            <section className={styles.hero}>
            <div className={styles.heroInner}>
                <div className={styles.heroBadge}>
                Hydrogeological Data Platform
                </div>

                <h1 className={styles.heroTitle}>
                Build a shared database of hydrogeological sample data
                </h1>

                <p className={styles.heroSubtitle}>
                WWHYPDA helps researchers and engineers collect, organize, and expand
                structured datasets of hydrogeological samples and their physical
                parameters.
                </p>

                <div className={styles.heroActions}>
                <Button 
                    onClick={() => {dispatch<UpdateOpenCloseAction>(UpdateOpenClose(false)); navigate('/search')}} 
                    className={styles.primaryButton}
                >
                    Get Started
                </Button>
                
                {/* <Button className={styles.secondaryButton}>Explore</Button> */}
                </div>

                <div className={styles.heroGrid}>
                <article className={styles.featureCard}>
                    <h3 className={styles.featureTitle}>Structured samples</h3>
                    <p className={styles.featureText}>
                    Store hydrogeological samples in a consistent and reusable format.
                    </p>
                </article>

                <article className={styles.featureCard}>
                    <h3 className={styles.featureTitle}>Physical parameters</h3>
                    <p className={styles.featureText}>
                    Permeability, porosity, density and other key characteristics.
                    </p>
                </article>

                <article className={styles.featureCard}>
                    <h3 className={styles.featureTitle}>Collaboration</h3>
                    <p className={styles.featureText}>
                    Build and expand a shared scientific database together.
                    </p>
                </article>
                </div>
            </div>
            </section>

        </div>
    );
};

export default Home;

