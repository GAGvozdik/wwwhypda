import React from "react";
import styles from "./policy.module.scss";

const UserAgreement: React.FC = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>User Agreement</h1>

      <p className={styles.text}>
        This User Agreement ("Agreement") governs access to and use of this application.
        By using the service, you agree to be bound by this Agreement.
      </p>

      <h2 className={styles.sectionTitle}>1. Use of the Service</h2>
      <p className={styles.text}>
        The service must be used in compliance with applicable laws and regulations.
        Any unlawful or abusive use is strictly prohibited.
      </p>

      <h2 className={styles.sectionTitle}>2. User Accounts</h2>
      <p className={styles.text}>
        Registration is available only to people aged 18 or over. Users are responsible for maintaining the confidentiality of their credentials
        and for all activities performed under their account.
      </p>

      <h2 className={styles.sectionTitle}>3. User Data</h2>
      <p className={styles.text}>
        Users retain their rights in submitted material. By submitting a dataset for publication, you permit the service to store, review and display that material for scientific sharing. This permission does not transfer ownership or grant a blanket right to use personal data for unrelated purposes. Submit only material you are entitled to share; respect copyright, attribution and the rights of other people. Do not upload confidential information, credentials or sensitive personal data. Reviewed datasets can become public, be indexed and be copied by others. Contact the operator about unlawful content or personal information requiring correction or removal.
      </p>

      <h2 className={styles.sectionTitle}>4. Prohibited Conduct</h2>
      <ul className={styles.list}>
        <li className={styles.listItem}>Violation of applicable laws</li>
        <li className={styles.listItem}>Unauthorized access to systems or data</li>
        <li className={styles.listItem}>Interference with service operation</li>
      </ul>

      <h2 className={styles.sectionTitle}>5. Service Availability</h2>
      <p className={styles.text}>
        The service is provided on an "as is" and "as available" basis without warranties
        of any kind, to the extent permitted by law. This does not exclude mandatory statutory rights or liability that cannot lawfully be excluded.
      </p>

      <h2 className={styles.sectionTitle}>6. Limitation of Liability</h2>
      <p className={styles.text}>
        To the maximum extent permitted by applicable law, the provider shall not be liable
        for any indirect, incidental, or consequential damages arising from the use of the service.
      </p>

      <h2 className={styles.sectionTitle}>7. Termination</h2>
      <p className={styles.text}>
        Access to the service may be suspended or terminated in case of violation of this Agreement.
      </p>

      <h2 className={styles.sectionTitle}>8. Governing Law and Jurisdiction</h2>
      <p className={styles.text}>
        This Agreement shall be governed by and construed in accordance with the laws of Italy.
        Mandatory protections and any rights to bring proceedings before other competent courts remain unaffected.
      </p>

      <h2 className={styles.sectionTitle}>9. Amendments</h2>
      <p className={styles.text}>
        This Agreement may be updated from time to time. Continued use of the service
        does not constitute consent to new processing of personal data. Material changes will be notified; any legally required acceptance or consent will be requested separately.
      </p>

      <h2 className={styles.sectionTitle}>10. Contact</h2>
      <p className={styles.text}>
        Georgii Gvozdik, Milan, Italy.
        <br />
        <a href="mailto:georgii.gvozdik@studenti.unimi.it">georgii.gvozdik@studenti.unimi.it</a>
        <br />
        Additional contact: <a href="mailto:alessandro.comunian@unimi.it">alessandro.comunian@unimi.it</a>
      </p>
    </div>
  );
};

export default UserAgreement;