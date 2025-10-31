'use client';

import { useState } from 'react';
import DifficultyModal from '@/components/DifficultyModal';

export default function TestDifficultyPage() {
  const [isOpen, setIsOpen] = useState(true);
  const [tempSelected, setTempSelected] = useState<'gey' | 'goofy' | 'gooner' | 'gangster' | 'gigachad' | null>(null);
  const [currentDifficulty, setCurrentDifficulty] = useState<'gey' | 'goofy' | 'gooner' | 'gangster' | 'gigachad'>('gey');
  const [unlockedDifficulties, setUnlockedDifficulties] = useState<Set<'gey' | 'goofy' | 'gooner' | 'gangster' | 'gigachad'>>(
    new Set(['gey', 'goofy', 'gooner', 'gangster', 'gigachad'])
  );

  return (
    <div className="min-h-screen bg-vintage-black flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-vintage-gold mb-8">Teste do Modal de Dificuldade</h1>

        <button
          onClick={() => setIsOpen(true)}
          className="px-8 py-4 bg-vintage-neon-blue text-vintage-black rounded-xl font-bold text-xl hover:scale-105 transition-all"
        >
          Abrir Modal de Dificuldade
        </button>

        <div className="mt-8 text-vintage-white">
          <p>Dificuldade Atual: <span className="text-vintage-neon-blue font-bold">{currentDifficulty}</span></p>
          <p className="mt-2">Dificuldades Desbloqueadas: {Array.from(unlockedDifficulties).join(', ')}</p>
        </div>
      </div>

      <DifficultyModal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setTempSelected(null);
        }}
        onSelect={(difficulty) => {
          setTempSelected(difficulty);
        }}
        onBattle={(difficulty) => {
          setCurrentDifficulty(difficulty);
          setIsOpen(false);
          setTempSelected(null);
        }}
        unlockedDifficulties={unlockedDifficulties}
        currentDifficulty={currentDifficulty}
        tempSelected={tempSelected}
      />
    </div>
  );
}
