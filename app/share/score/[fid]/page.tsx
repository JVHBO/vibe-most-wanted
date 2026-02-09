import { Metadata } from 'next';
import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ fid: string }>;
  searchParams: Promise<{ lang?: string; v?: string }>;
}

// Translations for metadata
const metaTranslations: Record<string, {
  description: string;
  buttonTitle: string;
}> = {
  en: {
    description: 'Check your Neynar Score and mint your VibeFID card!',
    buttonTitle: 'Check Your Score',
  },
  'pt-BR': {
    description: 'Confira seu Neynar Score e minte seu card VibeFID!',
    buttonTitle: 'Ver Seu Score',
  },
  es: {
    description: '¡Revisa tu Neynar Score y mintea tu carta VibeFID!',
    buttonTitle: 'Ver Tu Score',
  },
  ja: {
    description: 'Neynarスコアを確認してVibeFIDカードをミントしよう！',
    buttonTitle: 'スコアを確認',
  },
  'zh-CN': {
    description: '查看您的Neynar分数并铸造您的VibeFID卡！',
    buttonTitle: '查看分数',
  },
  ru: {
    description: 'Проверьте свой Neynar Score и создайте карточку VibeFID!',
    buttonTitle: 'Проверить счёт',
  },
  hi: {
    description: 'अपना Neynar Score देखें और अपना VibeFID कार्ड मिंट करें!',
    buttonTitle: 'स्कोर देखें',
  },
  fr: {
    description: 'Vérifiez votre Neynar Score et mintez votre carte VibeFID!',
    buttonTitle: 'Voir Votre Score',
  },
  id: {
    description: 'Cek Neynar Score kamu dan mint kartu VibeFID!',
    buttonTitle: 'Cek Skor',
  },
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { fid } = await params;
  const { lang = 'en', v = '2' } = await searchParams;

  // Get translations
  const t = metaTranslations[lang] || metaTranslations['en'];

  // Build GIF URL with language parameter
  const gifUrl = `https://vibefid.xyz/share/score/${fid}/opengraph-image.gif?lang=${lang}&v=${v}`;

  return {
    title: `VibeFID #${fid} - Neynar Score`,
    description: t.description,
    openGraph: {
      title: `VibeFID #${fid} - Neynar Score`,
      description: t.description,
      siteName: 'VibeFID',
      type: 'website',
      images: [gifUrl],
    },
    twitter: {
      card: 'summary_large_image',
      title: `VibeFID #${fid} - Neynar Score`,
      description: t.description,
      images: [gifUrl],
    },
    other: {
      'fc:frame': JSON.stringify({
        version: 'next',
        imageUrl: gifUrl,
        button: {
          title: t.buttonTitle,
          action: {
            type: 'launch_frame',
            name: 'VibeFID',
            url: 'https://vibefid.xyz/fid',
            splashImageUrl: 'https://vibefid.xyz/images/splash-200.png',
            splashBackgroundColor: '#1a1a1a',
          },
        },
      }),
    },
  };
}

export default async function ScoreSharePage({ params }: PageProps) {
  const { fid } = await params;

  // Redirect to the main fid page
  redirect(`/fid/${fid}`);
}
