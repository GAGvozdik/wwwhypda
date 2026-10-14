import React from "react";
import styles from "./policy.module.scss";
import messages from "../../common/error_messages.json";
import { USER_AGREEMENT_VERSION } from "../../common/userAgreementVersion";

const UserAgreement: React.FC = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{messages.user_agreement}</h1>
      <p className={styles.text}>{messages.agreement_version_label} {USER_AGREEMENT_VERSION}</p>

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
        Users retain their rights in submitted material. By submitting a dataset, you permit the service to store it and make it available to you and authorised administrators for review and operation of the scientific service. Uploaded submissions are not currently published for visitors. This permission does not transfer ownership or grant a blanket right to use personal data for unrelated purposes. Submit only material you are entitled to share; respect copyright, attribution and the rights of other people. Scientific references may contain necessary author names, but do not upload private contact details, confidential information, credentials or sensitive personal data. Any future public publication requires appropriate information and a lawful basis before it begins. Contact the operator about unlawful content or personal information requiring correction or removal.
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
        You can permanently delete your own account using Delete account, with your current password and verification. This removes its email address, username, verification codes and submission records directly linked to your account, and revokes existing sessions. Unconfirmed registrations are deleted manually within one month of registration. To request deletion of uploaded scientific data or personal information remaining in separate scientific records, email wwhypda@gmail.com and identify the relevant records. The controller currently handles these requests manually, without undue delay and within one month, subject to applicable legal exceptions and any legally permitted extension explained within the first month. You do not need to delete your account to make a request. Delivered emails and backup copies have separate handling described in the Privacy Policy.
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
        <a href="mailto:wwhypda@gmail.com">wwhypda@gmail.com</a>
      </p>
    </div>
  );
};

export default UserAgreement;