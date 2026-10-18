import LegalDocumentDownload from './legalDocumentDownload';
import React from "react";
import styles from "./policy.module.scss";
import messages from "../../common/error_messages.json";
import { USER_AGREEMENT_VERSION } from "../../common/userAgreementVersion";

const UserAgreement: React.FC = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{messages.user_agreement}</h1>
      <LegalDocumentDownload slug="user-agreement" />
      <p className={styles.text}>Updated: 18 October 2026. {messages.agreement_version_label} {USER_AGREEMENT_VERSION}</p>

      <p className={styles.text}>
        This User Agreement ("Agreement") governs access to and use of this application.
        Account registration and explicit acceptance of an updated edition bind your account use to this Agreement. The Privacy Policy and Cookie Policy explain data processing and browser storage; acknowledging them is not blanket consent to unrelated processing.
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
        You can permanently delete your own account using Delete account, with your current password and verification. This removes its email address, username, verification codes and submission records directly linked to your account, and revokes existing sessions.
      </p>
      <p className={styles.text}>
        Unfinished registrations with a reliable original registration time and a record that registration was never completed are automatically deleted after one calendar month in UTC, together with the account details, recorded agreement acceptance, verification codes and linked submissions. Duplicate registration and new codes do not extend the period. Previously confirmed accounts remain outside this schedule even after administrative disabling. Older accounts with unknown dates or completion history and superuser accounts require operator review and are excluded from automatic account deletion. Private submissions of any review status are automatically deleted after six calendar months from their original submission time; reviewing or editing does not extend this period, and scheduled submission deletion does not delete your account. Calendar periods preserve the UTC time of day and use the last day of the target month when the original day does not exist. The worker runs immediately on startup and then hourly; deletion occurs at the first successful pass after the period, normally within the next hour plus processing time. Failures may delay physical deletion and require operator action. Earlier self-deletion and lawful requests remain available. The separate public scientific catalogue and drafts on other devices are outside this automatic cleanup.
      </p>
      <p className={styles.text}>
        To request deletion of uploaded scientific data or personal information remaining in separate scientific records, email support@wwhypdatestdeployversion.it and identify the relevant records. The controller currently handles these requests manually, without undue delay and within one month, subject to applicable legal exceptions and any legally permitted extension explained within the first month. You do not need to delete your account to make a request. Delivered emails and backup copies have separate handling described in the Privacy Policy.
      </p>

      <p className={styles.text}>
        Requested account codes and support correspondence use OVHcloud Zimbra Starter at support@wwhypdatestdeployversion.it. No Sent copy of the tested SMTP code message was observed; the application does not create extra copies. Delivered emails and provider technical records are separate from code expiry in the database. Ordinary completed support enquiries are manually erased no later than six calendar months after recorded closure, which starts at the first complete observation of the whole chain in the manually designated Closed folder. New replies or reopening cancel that date. Automatic support erasure is not enabled; the operator reviews and handles due or ambiguous correspondence manually. Retaining ordinary support context serves related follow-ups or verification of the answer; six months is a maximum, not a minimum, and unnecessary material or valid earlier erasure requests are handled sooner. Rights-request evidence and sensitive information receive a separate necessity review. The prepared daily task uses 01:30 Europe/Rome for eligible service-message copies when enabled, with their separate one-calendar-month period; it does not automatically erase support chains. Technical skips do not authorise indefinite retention. Necessary limited legal exceptions and legacy Gmail handling are explained in the Privacy Policy.
      </p>

      <h2 className={styles.sectionTitle}>8. Governing Law and Jurisdiction</h2>
      <p className={styles.text}>
        This Agreement shall be governed by and construed in accordance with the laws of Italy.
        Mandatory protections and any rights to bring proceedings before other competent courts remain unaffected.
      </p>

      <h2 className={styles.sectionTitle}>9. Amendments</h2>
      <p className={styles.text}>
        The User Agreement, Privacy Policy and Cookie Policy share one document-package version. The current full texts and their PDFs are publicly available. If any document changes, the next sign-in requires explicit acceptance of the current User Agreement and acknowledgement of both policies before ordinary account access is granted. An unchecked checkbox and the displayed version identify that choice; continued use or opening the page does not replace it. Existing sessions cannot bypass this requirement. If you decline, ordinary protected features remain unavailable, but your account is not automatically deleted: public documents, privacy contact, logout and authenticated self-deletion remain available. Acceptance records the version and server time and preserves known earlier acceptance facts. New processing that requires separate consent still requires that separate choice.
      </p>

      <h2 className={styles.sectionTitle}>10. Contact</h2>
      <p className={styles.text}>
        Georgii Gvozdik, Milan, Italy.
        <br />
        <a href="mailto:support@wwhypdatestdeployversion.it">support@wwhypdatestdeployversion.it</a>
      </p>
    </div>
  );
};

export default UserAgreement;