/**
 * 🔒 SESSION LOCKED MODAL
 *
 * Shown when another device has taken over the session.
 * User must refresh to reconnect (which will kick the other device).
 */

"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { SupportedLanguage } from "@/lib/translations";

interface SessionLockedModalProps {
  reason: string | null;
  onReconnect: () => void;
}

// Translations for session lock modal
const sessionLockTranslations: Record<SupportedLanguage, {
  title: string;
  sessionInvalidated: string;
  sessionExpired: string;
  noSession: string;
  sessionEnded: string;
  warning: string;
  howItWorks: string;
  explanation: string;
  reconnectButton: string;
  autoDisconnect: string;
}> = {
  'en': {
    title: 'Session Locked',
    sessionInvalidated: 'Another session was started on a different device.',
    sessionExpired: 'Your session expired due to inactivity.',
    noSession: 'No active session found.',
    sessionEnded: 'Your session has ended.',
    warning: 'Use only one device at a time to avoid conflicts.',
    howItWorks: 'How it works:',
    explanation: 'By clicking "Reconnect", the other session will be disconnected and you will take control of the account on this device.',
    reconnectButton: 'Reconnect Here',
    autoDisconnect: 'The other session will be disconnected automatically',
  },
  'pt-BR': {
    title: 'Sessão Bloqueada',
    sessionInvalidated: 'Outra sessão foi iniciada em outro dispositivo.',
    sessionExpired: 'Sua sessão expirou por inatividade.',
    noSession: 'Nenhuma sessão ativa encontrada.',
    sessionEnded: 'Sua sessão foi encerrada.',
    warning: 'Use apenas um dispositivo por vez para evitar conflitos.',
    howItWorks: 'Como funciona:',
    explanation: 'Ao clicar em "Reconectar", a outra sessão será desconectada e você assumirá o controle da conta neste dispositivo.',
    reconnectButton: 'Reconectar Aqui',
    autoDisconnect: 'A outra sessão será encerrada automaticamente',
  },
  'es': {
    title: 'Sesión Bloqueada',
    sessionInvalidated: 'Se inició otra sesión en otro dispositivo.',
    sessionExpired: 'Tu sesión expiró por inactividad.',
    noSession: 'No se encontró ninguna sesión activa.',
    sessionEnded: 'Tu sesión ha terminado.',
    warning: 'Usa solo un dispositivo a la vez para evitar conflictos.',
    howItWorks: 'Cómo funciona:',
    explanation: 'Al hacer clic en "Reconectar", la otra sesión se desconectará y tomarás el control de la cuenta en este dispositivo.',
    reconnectButton: 'Reconectar Aquí',
    autoDisconnect: 'La otra sesión se desconectará automáticamente',
  },
  'hi': {
    title: 'सत्र लॉक',
    sessionInvalidated: 'दूसरे डिवाइस पर एक और सत्र शुरू किया गया था।',
    sessionExpired: 'निष्क्रियता के कारण आपका सत्र समाप्त हो गया।',
    noSession: 'कोई सक्रिय सत्र नहीं मिला।',
    sessionEnded: 'आपका सत्र समाप्त हो गया है।',
    warning: 'संघर्षों से बचने के लिए एक समय में केवल एक डिवाइस का उपयोग करें।',
    howItWorks: 'यह कैसे काम करता है:',
    explanation: '"पुनः कनेक्ट करें" पर क्लिक करके, दूसरा सत्र डिस्कनेक्ट हो जाएगा और आप इस डिवाइस पर खाते का नियंत्रण ले लेंगे।',
    reconnectButton: 'यहाँ पुनः कनेक्ट करें',
    autoDisconnect: 'दूसरा सत्र स्वचालित रूप से डिस्कनेक्ट हो जाएगा',
  },
  'ru': {
    title: 'Сессия заблокирована',
    sessionInvalidated: 'На другом устройстве была начата другая сессия.',
    sessionExpired: 'Ваша сессия истекла из-за неактивности.',
    noSession: 'Активная сессия не найдена.',
    sessionEnded: 'Ваша сессия завершена.',
    warning: 'Используйте только одно устройство одновременно, чтобы избежать конфликтов.',
    howItWorks: 'Как это работает:',
    explanation: 'Нажав "Переподключиться", другая сессия будет отключена, и вы возьмёте контроль над аккаунтом на этом устройстве.',
    reconnectButton: 'Переподключиться здесь',
    autoDisconnect: 'Другая сессия будет отключена автоматически',
  },
  'zh-CN': {
    title: '会话已锁定',
    sessionInvalidated: '在另一个设备上启动了另一个会话。',
    sessionExpired: '由于不活动，您的会话已过期。',
    noSession: '未找到活动会话。',
    sessionEnded: '您的会话已结束。',
    warning: '一次只使用一个设备以避免冲突。',
    howItWorks: '工作原理：',
    explanation: '点击"重新连接"后，另一个会话将断开连接，您将在此设备上控制该帐户。',
    reconnectButton: '在此重新连接',
    autoDisconnect: '另一个会话将自动断开连接',
  },
  'id': {
    title: 'Sesi Terkunci',
    sessionInvalidated: 'Sesi lain dimulai di perangkat lain.',
    sessionExpired: 'Sesi Anda kedaluwarsa karena tidak aktif.',
    noSession: 'Tidak ada sesi aktif yang ditemukan.',
    sessionEnded: 'Sesi Anda telah berakhir.',
    warning: 'Gunakan hanya satu perangkat pada satu waktu untuk menghindari konflik.',
    howItWorks: 'Cara kerjanya:',
    explanation: 'Dengan mengklik "Hubungkan Kembali", sesi lain akan terputus dan Anda akan mengambil alih kendali akun di perangkat ini.',
    reconnectButton: 'Hubungkan Kembali Di Sini',
    autoDisconnect: 'Sesi lain akan terputus secara otomatis',
  },
  'fr': {
    title: 'Session Verrouillée',
    sessionInvalidated: 'Une autre session a été démarrée sur un autre appareil.',
    sessionExpired: 'Votre session a expiré en raison de l\'inactivité.',
    noSession: 'Aucune session active trouvée.',
    sessionEnded: 'Votre session s\'est terminée.',
    warning: 'Utilisez un seul appareil à la fois pour éviter les conflits.',
    howItWorks: 'Comment ça marche :',
    explanation: 'En cliquant sur "Reconnecter", l\'autre session sera déconnectée et vous prendrez le contrôle du compte sur cet appareil.',
    reconnectButton: 'Reconnecter Ici',
    autoDisconnect: 'L\'autre session sera déconnectée automatiquement',
  },
  'ja': {
    title: 'セッションロック',
    sessionInvalidated: '別のデバイスで別のセッションが開始されました。',
    sessionExpired: '非アクティブのため、セッションが期限切れになりました。',
    noSession: 'アクティブなセッションが見つかりません。',
    sessionEnded: 'セッションが終了しました。',
    warning: '競合を避けるため、一度に1つのデバイスのみを使用してください。',
    howItWorks: '仕組み：',
    explanation: '「再接続」をクリックすると、他のセッションが切断され、このデバイスでアカウントを制御できるようになります。',
    reconnectButton: 'ここで再接続',
    autoDisconnect: '他のセッションは自動的に切断されます',
  },
};

export function SessionLockedModal({
  reason,
  onReconnect,
}: SessionLockedModalProps) {
  const [mounted, setMounted] = useState(false);
  const { lang } = useLanguage();
  const t = sessionLockTranslations[lang] || sessionLockTranslations['en'];

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const getReasonText = () => {
    switch (reason) {
      case "session_invalidated":
        return t.sessionInvalidated;
      case "session_expired":
        return t.sessionExpired;
      case "no_session":
        return t.noSession;
      default:
        return t.sessionEnded;
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[99999] p-4">
      <div className="bg-vintage-charcoal rounded-2xl border-2 border-red-500/50 p-6 sm:p-8 max-w-md w-full shadow-2xl">
        {/* Warning Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-red-900/30 border-2 border-red-500 flex items-center justify-center">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              className="text-red-500"
            >
              <path
                d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-red-400 text-center mb-4">
          {t.title}
        </h2>

        {/* Message */}
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-6">
          <p className="text-vintage-ice text-center text-sm sm:text-base">
            {getReasonText()}
          </p>
          <p className="text-vintage-burnt-gold text-center text-xs mt-3">
            {t.warning}
          </p>
        </div>

        {/* Info */}
        <div className="bg-vintage-black/50 rounded-xl p-4 mb-6">
          <p className="text-vintage-burnt-gold text-xs text-center">
            <strong className="text-vintage-gold">{t.howItWorks}</strong>
            <br />
            {t.explanation}
          </p>
        </div>

        {/* Reconnect Button */}
        <button
          onClick={onReconnect}
          className="w-full px-6 py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-xl font-display font-bold text-lg shadow-lg hover:shadow-red-500/30 transition-all transform hover:scale-[1.02]"
        >
          {t.reconnectButton}
        </button>

        {/* Subtitle */}
        <p className="text-vintage-burnt-gold/50 text-xs text-center mt-4">
          {t.autoDisconnect}
        </p>
      </div>
    </div>,
    document.body
  );
}
