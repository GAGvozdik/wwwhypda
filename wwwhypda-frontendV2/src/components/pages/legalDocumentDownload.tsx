import messages from '../../common/error_messages.json';
import { legalPdfPath } from '../../common/legalDocuments';
import styles from './policy.module.scss';

export default function LegalDocumentDownload({ slug }: { slug: string }) {
  const filename = legalPdfPath(slug).split('/').pop();
  return <p className={styles.download} data-legal-download="true">
    <a href={import.meta.env.BASE_URL + legalPdfPath(slug)} download={filename}>
      {messages.legal_download_pdf}
    </a>
  </p>;
}
