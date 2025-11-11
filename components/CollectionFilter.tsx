'use client';

import React, { useState } from 'react';
import { getEnabledCollections, type CollectionId } from '@/lib/collections';

interface CollectionFilterProps {
  selectedCollections: CollectionId[];
  onCollectionsChange: (collections: CollectionId[]) => void;
  className?: string;
}

/**
 * CollectionFilter Component
 *
 * Permite filtrar cartas por coleções NFT.
 * Suporta múltiplas seleções e "Todas" para mostrar tudo.
 */
export function CollectionFilter({
  selectedCollections,
  onCollectionsChange,
  className = '',
}: CollectionFilterProps) {
  const enabledCollections = getEnabledCollections();
  const [isOpen, setIsOpen] = useState(false);

  // Se não há coleções habilitadas, não mostra o filtro
  if (enabledCollections.length === 0) {
    return null;
  }

  // Verifica se todas estão selecionadas
  const allSelected = selectedCollections.length === 0 ||
                      selectedCollections.length === enabledCollections.length;

  const handleToggleCollection = (collectionId: CollectionId) => {
    if (selectedCollections.includes(collectionId)) {
      // Remove a coleção
      const newSelections = selectedCollections.filter(id => id !== collectionId);
      onCollectionsChange(newSelections);
    } else {
      // Adiciona a coleção
      onCollectionsChange([...selectedCollections, collectionId]);
    }
  };

  const handleSelectAll = () => {
    // Limpa a seleção (mostra todas)
    onCollectionsChange([]);
  };

  // Texto do botão
  const buttonText = allSelected
    ? '🎴 VBMS'
    : `🎴 ${selectedCollections.length} Collection${selectedCollections.length > 1 ? 's' : ''}`;

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Botão do filtro */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600/20 to-blue-600/20
                   border border-purple-500/30 rounded-lg hover:border-purple-400/50
                   transition-all duration-200 backdrop-blur-sm"
      >
        <span className="text-sm font-medium text-white">{buttonText}</span>
        <svg
          className={`w-4 h-4 text-purple-300 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          {/* Backdrop para fechar ao clicar fora */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-64 bg-gray-900/95 backdrop-blur-md border border-purple-500/30
                        rounded-lg shadow-2xl z-50 overflow-hidden">

            {/* Header */}
            <div className="px-4 py-3 border-b border-purple-500/20 bg-gradient-to-r from-purple-600/10 to-blue-600/10">
              <h3 className="text-sm font-semibold text-purple-200">Filter by Collection</h3>
            </div>

            {/* Options */}
            <div className="py-2 max-h-80 overflow-y-auto">
              {/* Opção "Todas" */}
              <button
                onClick={() => {
                  handleSelectAll();
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-left hover:bg-purple-600/20 transition-colors
                          ${allSelected ? 'bg-purple-600/30 border-l-2 border-purple-400' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center
                                ${allSelected
                                  ? 'bg-purple-500 border-purple-400'
                                  : 'border-gray-600 bg-gray-800'}`}
                  >
                    {allSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">VBMS</div>
                    <div className="text-xs text-gray-400">Show cards from all collections</div>
                  </div>
                </div>
              </button>

              {/* Separator */}
              <div className="my-2 border-t border-purple-500/20" />

              {/* Opções individuais */}
              {enabledCollections.map((collection) => {
                const isSelected = selectedCollections.includes(collection.id);

                return (
                  <button
                    key={collection.id}
                    onClick={() => handleToggleCollection(collection.id)}
                    className={`w-full px-4 py-2.5 text-left hover:bg-blue-600/20 transition-colors
                              ${isSelected && !allSelected ? 'bg-blue-600/30 border-l-2 border-blue-400' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center
                                    ${isSelected && !allSelected
                                      ? 'bg-blue-500 border-blue-400'
                                      : 'border-gray-600 bg-gray-800'}`}
                      >
                        {isSelected && !allSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{collection.displayName}</div>
                        {collection.description && (
                          <div className="text-xs text-gray-400 truncate">{collection.description}</div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer com ações */}
            {!allSelected && selectedCollections.length > 0 && (
              <div className="px-4 py-3 border-t border-purple-500/20 bg-gradient-to-r from-purple-600/10 to-blue-600/10">
                <button
                  onClick={() => {
                    handleSelectAll();
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-xs font-medium text-purple-300 hover:text-purple-200
                           border border-purple-500/30 rounded hover:border-purple-400/50 transition-colors"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Hook para gerenciar o estado do filtro de coleções
 */
export function useCollectionFilter() {
  const [selectedCollections, setSelectedCollections] = useState<CollectionId[]>([]);

  return {
    selectedCollections,
    setSelectedCollections,
    isFiltering: selectedCollections.length > 0,
  };
}
