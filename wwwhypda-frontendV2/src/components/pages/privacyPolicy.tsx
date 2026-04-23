import React from "react";
import styles from "./policy.module.scss";

const PrivacyPolicy: React.FC = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Privacy Policy</h1>

      <p className={styles.text}>
        This Privacy Policy describes how personal data is collected, used, and processed
        when using this application, in accordance with Regulation (EU) 2016/679
        (General Data Protection Regulation, "GDPR") and applicable Italian data protection laws.
      </p>

      <h2 className={styles.sectionTitle}>1. Data Controller</h2>
      <p className={styles.text}>
        The data controllers are:
        <br />
        alessandro.comunian@unimi.it
        <br />
        gvozdikgeorge@gmail.com
        <br />
        (hereinafter referred to as "Controller", "we", "us").
      </p>

      <h2 className={styles.sectionTitle}>2. Categories of Personal Data</h2>
      <p className={styles.text}>
        We may process the following categories of personal data:
      </p>
      <ul className={styles.list}>
        <li className={styles.listItem}>Identification data (e.g. name, email address)</li>
        <li className={styles.listItem}>Technical data (e.g. IP address, browser, device information)</li>
        <li className={styles.listItem}>Usage data (e.g. interactions with the application)</li>
      </ul>

      <h2 className={styles.sectionTitle}>3. Purposes of Processing</h2>
      <p className={styles.text}>
        Personal data is processed for the following purposes:
      </p>
      <ul className={styles.list}>
        <li className={styles.listItem}>Provision and operation of the service</li>
        <li className={styles.listItem}>User account management and authentication</li>
        <li className={styles.listItem}>Communication with users</li>
        <li className={styles.listItem}>Improvement and security of the service</li>
        <li className={styles.listItem}>Compliance with legal obligations</li>
      </ul>

      <h2 className={styles.sectionTitle}>4. Legal Basis for Processing</h2>
      <p className={styles.text}>
        Processing of personal data is based on one or more of the following legal grounds:
      </p>
      <ul className={styles.list}>
        <li className={styles.listItem}>Article 6(1)(a) GDPR – consent</li>
        <li className={styles.listItem}>Article 6(1)(b) GDPR – performance of a contract</li>
        <li className={styles.listItem}>Article 6(1)(c) GDPR – compliance with legal obligations</li>
        <li className={styles.listItem}>Article 6(1)(f) GDPR – legitimate interests</li>
      </ul>

      <h2 className={styles.sectionTitle}>5. Data Retention</h2>
      <p className={styles.text}>
        Personal data is retained only for as long as necessary to achieve the purposes
        for which it was collected, or as required by applicable law.
      </p>

      <h2 className={styles.sectionTitle}>6. Data Recipients</h2>
      <p className={styles.text}>
        Personal data may be shared with third-party service providers acting as data processors,
        strictly for purposes related to the provision of the service (e.g. hosting, infrastructure).
        Data will not be sold or disclosed for unrelated purposes.
      </p>

      <h2 className={styles.sectionTitle}>7. International Data Transfers</h2>
      <p className={styles.text}>
        Where personal data is transferred outside the European Economic Area (EEA),
        such transfers will be carried out in compliance with GDPR requirements,
        including appropriate safeguards where necessary.
      </p>

      <h2 className={styles.sectionTitle}>8. Data Subject Rights</h2>
      <p className={styles.text}>
        Under the GDPR, users have the right to:
      </p>
      <ul className={styles.list}>
        <li className={styles.listItem}>Access their personal data</li>
        <li className={styles.listItem}>Request rectification or erasure</li>
        <li className={styles.listItem}>Restrict or object to processing</li>
        <li className={styles.listItem}>Data portability</li>
        <li className={styles.listItem}>Withdraw consent at any time</li>
        <li className={styles.listItem}>Lodge a complaint with a supervisory authority</li>
      </ul>

      <h2 className={styles.sectionTitle}>9. Data Security</h2>
      <p className={styles.text}>
        Appropriate technical and organizational measures are implemented to ensure
        a level of security appropriate to the risk.
      </p>

      <h2 className={styles.sectionTitle}>10. Changes to this Policy</h2>
      <p className={styles.text}>
        This Privacy Policy may be updated from time to time. The updated version
        will be made available within the application.
      </p>

      <h2 className={styles.sectionTitle}>11. Contact</h2>
      <p className={styles.text}>
        For any requests regarding personal data, please contact:
        <br />
        alessandro.comunian@unimi.it
        <br />
        gvozdikgeorge@gmail.com
      </p>
    </div>
  );
};

export default PrivacyPolicy;