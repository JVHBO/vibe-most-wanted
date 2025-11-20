'use client';

import React from 'react';
import type { CriminalBackstory } from '@/lib/generateCriminalBackstory';
import type { SupportedLanguage } from '@/lib/translations';
import { fidTranslations } from '@/lib/fidTranslations';

interface CriminalBackstoryCardProps {
  backstory: CriminalBackstory;
  displayName: string;
  lang: SupportedLanguage;
}

export default function CriminalBackstoryCard({ backstory, displayName, lang }: CriminalBackstoryCardProps) {
  const t = fidTranslations[lang];

  return (
    <div className="bg-vintage-charcoal/80 rounded-xl border-2 border-vintage-gold/50 p-6 shadow-2xl">
      {/* Header */}
      <div className="text-center mb-6 pb-4 border-b-2 border-vintage-gold/30">
        <h2 className="text-3xl font-display font-bold text-vintage-gold mb-1">
          {t.criminalRecord}
        </h2>
        <p className="text-vintage-ice text-lg">
          {displayName}
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Left column - Details */}
        <div className="space-y-4">
          {/* Wanted For */}
          <div>
            <h3 className="text-sm font-bold text-vintage-burnt-gold uppercase tracking-wide mb-1">
              {t.wantedFor}
            </h3>
            <p className="text-vintage-ice text-base font-semibold">
              {backstory.wantedFor}
            </p>
          </div>

          {/* Danger Level */}
          <div>
            <h3 className="text-sm font-bold text-vintage-burnt-gold uppercase tracking-wide mb-1">
              {t.dangerLevel}
            </h3>
            <p className={`text-base font-bold ${
              backstory.dangerLevel.includes('EXTREM') || backstory.dangerLevel.includes('极端') ? 'text-red-500' :
              backstory.dangerLevel.includes('HIGH') || backstory.dangerLevel.includes('ALTO') || backstory.dangerLevel.includes('ВЫСО') || backstory.dangerLevel.includes('उच्च') || backstory.dangerLevel.includes('高') ? 'text-orange-500' :
              backstory.dangerLevel.includes('MEDIUM') || backstory.dangerLevel.includes('MÉDIO') || backstory.dangerLevel.includes('MEDIO') || backstory.dangerLevel.includes('СРЕДН') || backstory.dangerLevel.includes('मध्यम') || backstory.dangerLevel.includes('中') ? 'text-yellow-500' :
              'text-green-500'
            }`}>
              {backstory.dangerLevel}
            </p>
          </div>

          {/* Date of Crime */}
          <div>
            <h3 className="text-sm font-bold text-vintage-burnt-gold uppercase tracking-wide mb-1">
              {t.dateOfCrime}
            </h3>
            <p className="text-vintage-ice text-base">
              {backstory.dateOfCrime}
            </p>
          </div>
        </div>

        {/* Right column - Details */}
        <div className="space-y-4">
          {/* Known Associates */}
          <div>
            <h3 className="text-sm font-bold text-vintage-burnt-gold uppercase tracking-wide mb-1">
              {t.knownAssociates}
            </h3>
            <p className="text-vintage-ice text-base">
              {backstory.associates}
            </p>
          </div>

          {/* Last Seen */}
          <div>
            <h3 className="text-sm font-bold text-vintage-burnt-gold uppercase tracking-wide mb-1">
              {t.lastSeen}
            </h3>
            <p className="text-vintage-ice text-base">
              {backstory.lastSeen}
            </p>
          </div>
        </div>
      </div>

      {/* Story */}
      <div className="bg-vintage-black/40 rounded-lg p-4 border border-vintage-gold/20">
        <p className="text-vintage-ice leading-relaxed text-justify">
          {backstory.story}
        </p>
      </div>

      {/* Warning footer */}
      <div className="mt-4 text-center">
        <p className="text-vintage-burnt-gold text-xs font-bold uppercase tracking-wider">
          ⚠️ {lang === 'en' ? 'APPROACH WITH EXTREME CAUTION' : lang === 'pt-BR' ? 'APROXIME-SE COM EXTREMA CAUTELA' : lang === 'es' ? 'ACÉRCATE CON EXTREMA PRECAUCIÓN' : lang === 'hi' ? 'अत्यधिक सावधानी के साथ संपर्क करें' : lang === 'ru' ? 'ПОДХОДИТЕ С ЧРЕЗВЫЧАЙНОЙ ОСТОРОЖНОСТЬЮ' : '极度谨慎接近'} ⚠️
        </p>
      </div>
    </div>
  );
}
