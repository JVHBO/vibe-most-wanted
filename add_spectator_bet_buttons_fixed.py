with open('components/PokerBattleTable.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add bet buttons after opponent hand section
bet_buttons_html = """
                  {/* Spectator Bet Buttons - Opponent Side */}
                  {isSpectatorMode && room?.guestAddress && (
                    <div className="flex gap-2 justify-center mt-3">
                      <div className="text-xs text-vintage-gold/70 mr-2 flex items-center">Bet on {room.guestUsername}:</div>
                      {[10, 25, 50, 100].map((amount) => (
                        <button
                          key={amount}
                          onClick={() => handlePlaceBet(room.guestAddress!, amount)}
                          disabled={placingBet}
                          className="bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white font-bold rounded px-3 py-1.5 text-sm transition-all hover:scale-105 active:scale-95"
                        >
                          {amount}
                        </button>
                      ))}
                    </div>
                  )}
"""

# Find where to insert (after opponent hand grid closing div)
insert_pattern = """                  </div>
                </div>

                {/* CENTER - CARD BATTLE AREA */}"""

replacement1 = """                  </div>
""" + bet_buttons_html + """
                </div>

                {/* CENTER - CARD BATTLE AREA */}"""

content = content.replace(insert_pattern, replacement1, 1)

# Add bet buttons after player hand section
player_bet_buttons = """
                  {/* Spectator Bet Buttons - Player Side */}
                  {isSpectatorMode && room?.hostAddress && (
                    <div className="flex gap-2 justify-center mt-3">
                      <div className="text-xs text-vintage-gold/70 mr-2 flex items-center">Bet on {room.hostUsername}:</div>
                      {[10, 25, 50, 100].map((amount) => (
                        <button
                          key={amount}
                          onClick={() => handlePlaceBet(room.hostAddress!, amount)}
                          disabled={placingBet}
                          className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white font-bold rounded px-3 py-1.5 text-sm transition-all hover:scale-105 active:scale-95"
                        >
                          {amount}
                        </button>
                      ))}
                    </div>
                  )}
"""

# Find player hand closing
player_pattern = """                  </div>
                </div>

                {/* BOOST ACTIONS */}"""

replacement2 = """                  </div>
""" + player_bet_buttons + """
                </div>

                {/* BOOST ACTIONS */}"""

content = content.replace(player_pattern, replacement2, 1)

# Increase resolution phase time from 3s to 5s
content = content.replace('}, 3000);', '}, 5000);')

with open('components/PokerBattleTable.tsx', 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print("Added spectator bet buttons and increased resolution time!")
