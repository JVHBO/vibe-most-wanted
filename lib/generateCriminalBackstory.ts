/**
 * Generate criminal backstory from Farcaster user data
 * Uses multilingual templates to create dynamic crime stories
 */

import { fidTranslations } from './fidTranslations';
import type { SupportedLanguage } from './translations';

export interface CriminalBackstoryData {
  username: string;
  displayName: string;
  bio: string;
  fid: number;
  followerCount: number;
  createdAt: Date | null;
  power: number;
  bounty: number;
  rarity: string;
}

export interface CriminalBackstory {
  wantedFor: string;
  crimeType: string;
  dangerLevel: string;
  story: string;
  dateOfCrime: string;
  associates: string;
  lastSeen: string;
}

/**
 * Generate criminal backstory based on user data
 */
export function generateCriminalBackstory(
  data: CriminalBackstoryData,
  lang: SupportedLanguage = 'en'
): CriminalBackstory {
  const t = fidTranslations[lang];

  // Determine crime type based on FID (account age)
  let crimeType = t.crimeTypeRecruit;
  if (data.fid <= 5000) {
    crimeType = t.crimeTypeFounder;
  } else if (data.fid <= 20000) {
    crimeType = t.crimeTypeEarly;
  } else if (data.fid <= 100000) {
    crimeType = t.crimeTypeEstablished;
  } else if (data.fid <= 500000) {
    crimeType = t.crimeTypeActive;
  }

  // Determine danger level based on power
  let dangerLevel = t.dangerLow;
  if (data.power >= 5000) {
    dangerLevel = t.dangerExtreme;
  } else if (data.power >= 1000) {
    dangerLevel = t.dangerHigh;
  } else if (data.power >= 200) {
    dangerLevel = t.dangerMedium;
  }

  // Format date of crime (account creation date)
  let dateOfCrime = 'Unknown';
  if (data.createdAt) {
    // Convert to Date object if it's a string (from localStorage/JSON)
    const createdAtDate = data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt);

    const monthNames: Record<string, string[]> = {
      'en': ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
      'pt-BR': ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"],
      'es': ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
      'hi': ["जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"],
      'ru': ["Января", "Февраля", "Марта", "Апреля", "Мая", "Июня", "Июля", "Августа", "Сентября", "Октября", "Ноября", "Декабря"],
      'zh-CN': ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
      'id': ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"],
      'fr': ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"],
    };

    const months = monthNames[lang] || monthNames['en'];
    const month = months[createdAtDate.getMonth()];
    const day = createdAtDate.getDate();
    const year = createdAtDate.getFullYear();

    if (lang === 'zh-CN') {
      dateOfCrime = `${year}年${month}${day}日`;
    } else if (lang === 'en') {
      dateOfCrime = `${month} ${day}, ${year}`;
    } else {
      dateOfCrime = `${day} de ${month} de ${year}`;
    }
  } else {
    // Use FID range as fallback
    if (data.fid <= 5000) dateOfCrime = '2021';
    else if (data.fid <= 20000) dateOfCrime = '2022';
    else if (data.fid <= 100000) dateOfCrime = '2023';
    else if (data.fid <= 500000) dateOfCrime = '2024';
    else dateOfCrime = '2025';
  }

  // Helper function to randomly select from array
  const getRandomVariant = (variants: string | string[]): string => {
    if (Array.isArray(variants)) {
      return variants[Math.floor(Math.random() * variants.length)];
    }
    return variants;
  };

  // Build story from templates with random variants
  const followerCount = data.followerCount ?? 0;
  const bounty = data.bounty ?? 0;

  const storyParts = [
    getRandomVariant(t.criminalStory1).replace('{date}', dateOfCrime).replace('{username}', `@${data.username || 'unknown'}`),
    getRandomVariant(t.criminalStory2).replace('{followers}', followerCount.toLocaleString()).replace('{username}', `@${data.username || 'unknown'}`),
    getRandomVariant(t.criminalStory3).replace('{bio}', data.bio || t.noBio),
    getRandomVariant(t.criminalStory4).replace('{bounty}', bounty.toLocaleString()),
    getRandomVariant(t.criminalStory5),
  ];

  const story = storyParts.join(' ');

  // Associates (followers)
  const associatesLabels: Record<SupportedLanguage, string> = {
    'en': 'known accomplices',
    'pt-BR': 'cúmplices conhecidos',
    'es': 'cómplices conocidos',
    'hi': 'ज्ञात सहयोगी',
    'ru': 'известных сообщников',
    'zh-CN': '已知同伙',
    'id': 'kaki tangan yang dikenal',
    'fr': 'complices connus',
    'ja': '既知の共犯者',
    'it': 'complici noti',
  };
  const associates = `${followerCount.toLocaleString()} ${associatesLabels[lang] || associatesLabels['en']}`;

  // Last seen (Farcaster region)
  const lastSeenLabels: Record<SupportedLanguage, string> = {
    'en': 'Farcaster Network',
    'pt-BR': 'Rede Farcaster',
    'es': 'Red Farcaster',
    'hi': 'Farcaster नेटवर्क',
    'ru': 'Сеть Farcaster',
    'zh-CN': 'Farcaster 网络',
    'id': 'Jaringan Farcaster',
    'fr': 'Réseau Farcaster',
    'ja': 'Farcasterネットワーク',
    'it': 'Rete Farcaster',
  };
  const lastSeen = lastSeenLabels[lang] || lastSeenLabels['en'];

  return {
    wantedFor: crimeType,
    crimeType,
    dangerLevel,
    story,
    dateOfCrime,
    associates,
    lastSeen,
  };
}
