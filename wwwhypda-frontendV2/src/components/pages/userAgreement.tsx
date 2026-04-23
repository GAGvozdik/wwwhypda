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
        Users are responsible for maintaining the confidentiality of their credentials
        and for all activities performed under their account.
      </p>

      <h2 className={styles.sectionTitle}>3. User Data</h2>
      <p className={styles.text}>
        Users retain ownership of their data. By using the service, users grant the right
        to process such data strictly for the purpose of providing and improving the service,
        in accordance with the Privacy Policy.
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
        of any kind, to the extent permitted by law.
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
        Any disputes arising out of or in connection with this Agreement shall be subject
        to the jurisdiction of the competent courts of Italy.
      </p>

      <h2 className={styles.sectionTitle}>9. Amendments</h2>
      <p className={styles.text}>
        This Agreement may be updated from time to time. Continued use of the service
        constitutes acceptance of the updated terms.
      </p>

      <h2 className={styles.sectionTitle}>10. Contact</h2>
      <p className={styles.text}>
        alessandro.comunian@unimi.it
        <br />
        gvozdikgeorge@gmail.com
      </p>
    </div>
  );
};

export default UserAgreement;