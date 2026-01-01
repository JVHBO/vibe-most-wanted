/**
 * Claim Error Translator
 * Translates backend error codes to localized messages with clickable @jvhbo link
 */

import { translations, SupportedLanguage } from './translations';

// Support link component for toast messages
export const SupportLink = () => (
  <a
    href="https://warpcast.com/jvhbo"
    target="_blank"
    rel="noopener noreferrer"
    className="text-purple-400 hover:text-purple-300 underline font-medium"
    onClick={(e) => e.stopPropagation()}
  >
    @jvhbo
  </a>
);

// Parse error code and extract parameters
function parseErrorCode(message: string): { code: string; params: string[] } {
  // Format: [ERROR_CODE]param1|param2|param3
  const match = message.match(/^\[([A-Z_]+)\](.*)$/);
  if (match) {
    const code = match[1];
    const paramsStr = match[2];
    const params = paramsStr ? paramsStr.split('|') : [];
    return { code, params };
  }
  return { code: '', params: [] };
}

// Get translation key for error code
function getTranslationKey(code: string): string {
  const codeToKey: Record<string, string> = {
    'CLAIM_DAILY_LIMIT': 'claimErrorDailyLimit',
    'CLAIM_COOLDOWN': 'claimErrorCooldown',
    'CLAIM_WAIT_RECOVER': 'claimErrorWaitRecover',
    'CLAIM_BLOCKED_ALREADY_CLAIMED': 'claimErrorBlockedAlreadyClaimed',
    'CLAIM_FID_REQUIRED': 'claimErrorFidRequired',
    'CLAIM_FID_MISMATCH': 'claimErrorFidMismatch',
    'CLAIM_INSUFFICIENT_BALANCE': 'claimErrorInsufficientBalance',
    'CLAIM_MINIMUM_REQUIRED': 'claimErrorMinimumRequired',
    'CLAIM_BLACKLISTED': 'claimErrorBlacklisted',
    'CLAIM_SIGNATURE_FAILED_RESTORED': 'claimErrorSignatureFailed',
    'CLAIM_SIGNATURE_FAILED_MANUAL': 'claimErrorSignatureFailedManual',
    'CLAIM_NO_PENDING': 'claimErrorNoPending',
    'CLAIM_TX_RECORDED': 'claimErrorTxRecorded',
  };
  return codeToKey[code] || '';
}

// Errors that should show support contact
const errorsWithSupport = [
  'CLAIM_DAILY_LIMIT',
  'CLAIM_BLOCKED_ALREADY_CLAIMED',
  'CLAIM_FID_REQUIRED',
  'CLAIM_FID_MISMATCH',
  'CLAIM_BLACKLISTED',
  'CLAIM_SIGNATURE_FAILED_MANUAL',
];

/**
 * Translate a claim error message
 * @param errorMessage - The raw error message from backend
 * @param language - The user's language
 * @returns Object with translated message and whether to show support link
 */
export function translateClaimError(
  errorMessage: string,
  language: SupportedLanguage = 'en'
): { message: string; showSupport: boolean } {
  const { code, params } = parseErrorCode(errorMessage);

  // If not a recognized error code, return original message
  if (!code) {
    return { message: errorMessage, showSupport: false };
  }

  const translationKey = getTranslationKey(code);
  if (!translationKey) {
    return { message: errorMessage, showSupport: false };
  }

  // Get translation
  const langTranslations = translations[language] || translations['en'];
  let message = (langTranslations as any)[translationKey] || errorMessage;

  // Replace placeholders with params
  if (code === 'CLAIM_COOLDOWN' || code === 'CLAIM_WAIT_RECOVER') {
    message = message.replace('{seconds}', params[0] || '?');
  } else if (code === 'CLAIM_INSUFFICIENT_BALANCE') {
    message = message.replace('{balance}', params[0] || '?').replace('{amount}', params[1] || '?');
  } else if (code === 'CLAIM_MINIMUM_REQUIRED') {
    message = message.replace('{min}', params[0] || '?');
    if (message.includes('{balance}')) {
      message = message.replace('{balance}', params[1] || '?');
    }
  } else if (code === 'CLAIM_SIGNATURE_FAILED_RESTORED') {
    message = message.replace('{amount}', params[0] || '?');
  }

  const showSupport = errorsWithSupport.includes(code);

  return { message, showSupport };
}

/**
 * Get the support contact text for the current language
 */
export function getSupportText(language: SupportedLanguage = 'en'): string {
  const langTranslations = translations[language] || translations['en'];
  return (langTranslations as any).contactSupport || 'Issues? Contact';
}

/**
 * Check if an error message is a claim error code
 */
export function isClaimErrorCode(message: string): boolean {
  return message.startsWith('[CLAIM_');
}
