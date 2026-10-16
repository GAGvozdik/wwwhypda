import { USER_AGREEMENT_VERSION } from './userAgreementVersion';

export const legalDocuments = [
  { slug: 'user-agreement', label: 'User Agreement', route: '/user-agreement' },
  { slug: 'privacy-policy', label: 'Privacy Policy', route: '/privacy-policy' },
  { slug: 'cookie-policy', label: 'Cookie Policy', route: '/cookie-policy' },
] as const;

export function legalPdfPath(slug: string, version = USER_AGREEMENT_VERSION) {
  return 'legal/' + slug + '-' + version + '.pdf';
}
