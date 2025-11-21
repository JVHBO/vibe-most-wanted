/**
 * VibeFID Page Translations
 * Criminal backstory generation for 6 languages
 */

export const fidTranslations = {
  "pt-BR": {
    // Password screen
    fidAccessTitle: '🔒 Acesso VibeFID',
    fidAccessDesc: 'Digite a senha para acessar o sistema de mint VibeFID',
    enterPassword: 'Digite a senha',
    incorrectPassword: '❌ Senha incorreta',
    unlock: 'Desbloquear',

    // Main page
    fidPageTitle: 'VibeFID',
    fidPageDesc: 'Crie cartas jogáveis a partir de perfis do Farcaster',
    connectedAs: 'Conectado como',
    enterFid: 'Digite o FID do Farcaster',
    fetch: 'Buscar',
    loading: 'Carregando...',

    // User info
    bio: 'Bio',
    noBio: 'Sem bio',
    fid: 'FID',
    score: 'Pontuação',
    followers: 'Seguidores',
    rarity: 'Raridade',
    cardRange: 'Faixa de Carta',
    powerBadge: '⚡ Power Badge',

    // Actions
    generatePreview: 'Gerar Preview da Carta',
    generating: 'Gerando...',
    mintCard: 'Mintar Carta',
    minting: 'Mintando...',
    connectToMint: 'Conectar Carteira para Mintar',
    mintPrice: 'Preço do Mint',

    // Card preview
    cardPreview: 'Preview da Carta',
    generatedTraits: 'Traits Geradas',
    card: 'Carta',
    foil: 'Foil',
    wear: 'Desgaste',
    power: 'Poder',

    // My cards
    myCards: 'Minhas Cartas Farcaster',
    cardsCount: '{count} cartas',
    share: 'Compartilhar',

    // Success modal
    vibeFidMinted: 'VibeFID Mintado!',
    mintSuccess: '🎉',
    viewOnBaseScan: 'Ver no BaseScan',
    shareToFarcaster: 'Compartilhar no Farcaster',

    // Criminal backstory
    criminalRecord: 'FICHA CRIMINAL',
    wantedFor: 'PROCURADO POR',
    knownAssociates: 'ASSOCIADOS CONHECIDOS',
    dateOfCrime: 'DATA DO CRIME',
    dangerLevel: 'NÍVEL DE PERIGO',
    lastSeen: 'VISTO PELA ÚLTIMA VEZ',
    warningCaution: '⚠️ AVISO: Abordar com extrema cautela',
    viewCard: 'Ver Carta →',
    yourVibeFidCard: 'Sua Carta VibeFID',
    cardStats: 'Estatísticas da Carta',
    back: '← Voltar',

    // Story templates (multiple variants for randomization)
    criminalStory1: [
      'Iniciou suas atividades criminosas em {date}, rapidamente ganhando notoriedade na comunidade underground.',
      'Começou sua jornada no crime em {date}, construindo um império de ilegalidades.',
      'Surgiu no submundo em {date}, espalhando medo e caos por onde passou.',
      'Entrou para o mundo do crime em {date}, tornando-se lenda entre criminosos.',
      'Deu início ao seu reinado de terror em {date}, sem olhar para trás.',
      'Abandonou a legalidade em {date} e nunca mais foi o(a) mesmo(a).',
      'Estreou no crime organizado em {date}, superando todos os veteranos.',
    ],
    criminalStory2: [
      'Com uma rede de {followers} cúmplices espalhados pelo submundo digital, {username} se tornou uma das figuras mais temidas.',
      'Controlando {followers} criminosos leais, {username} domina territórios digitais inteiros.',
      'Lidera uma organização com {followers} membros, todos dispostos a fazer qualquer coisa por {username}.',
      'Comanda {followers} seguidores fanáticos, {username} é o terror das autoridades.',
      'Mantém {followers} aliados estratégicos, {username} é intocável no submundo.',
      'Com {followers} subordinados sob seu comando, {username} controla tudo nas sombras.',
      'Reuniu {followers} parceiros do crime, {username} é uma lenda viva.',
    ],
    criminalStory3: [
      'Conhecido(a) por {bio}, este criminoso é extremamente perigoso e deve ser abordado com cautela.',
      'Famoso(a) por {bio}, representa uma ameaça constante à ordem estabelecida.',
      'Identificado(a) como {bio}, suas táticas são imprevisíveis e brutais.',
      'Reconhecido(a) por {bio}, não demonstra piedade ou remorso.',
      'Descrito(a) como {bio}, seus métodos são cruéis e eficientes.',
      'Caracterizado(a) por {bio}, não deixa testemunhas para contar história.',
      'Notório(a) por {bio}, suas ações chocam até os criminosos mais experientes.',
    ],
    criminalStory4: [
      'As autoridades oferecem uma recompensa de ${bounty} pela captura vivo ou morto.',
      'Uma recompensa de ${bounty} foi estabelecida para quem conseguir capturá-lo(a).',
      'Procurado(a) com prêmio de ${bounty} - abordagem extremamente perigosa.',
      'Há um bounty de ${bounty} sobre sua cabeça, mas ninguém se atreve a caçá-lo(a).',
      'Recompensa de ${bounty} aguarda quem for corajoso (ou insano) o suficiente.',
      'Prêmio de ${bounty} foi oferecido, mas a lista de fracassados só aumenta.',
      'Vale ${bounty} para as autoridades, mas o preço pode ser a própria vida.',
    ],
    criminalStory5: [
      'Foi visto pela última vez operando na região do Farcaster, deixando um rastro de caos.',
      'Continua ativo(a) nas sombras do Farcaster, evadindo todas as tentativas de captura.',
      'Desapareceu no Farcaster após sua última operação, permanece foragido(a).',
      'Vaga livre pelo Farcaster, zombando das autoridades a cada dia.',
      'Esconde-se no Farcaster, planejando o próximo golpe devastador.',
      'Permanece à solta no Farcaster, mais perigoso(a) do que nunca.',
      'Circula pelo Farcaster sem ser detectado(a), um verdadeiro fantasma.',
    ],

    // Danger levels based on power
    dangerExtreme: 'EXTREMO - Evite confronto direto',
    dangerHigh: 'ALTO - Requer backup',
    dangerMedium: 'MÉDIO - Abordagem com cautela',
    dangerLow: 'BAIXO - Captura viável',

    // Crime types based on data
    crimeTypeFounder: 'Fundador de organização criminosa de alto escalão',
    crimeTypeEarly: 'Pioneiro em crimes cibernéticos',
    crimeTypeEstablished: 'Líder de gangue estabelecida',
    crimeTypeActive: 'Membro ativo de sindicato do crime',
    crimeTypeRecruit: 'Recruta recente em atividades ilícitas',
  },

  "en": {
    // Password screen
    fidAccessTitle: '🔒 VibeFID Access',
    fidAccessDesc: 'Enter password to access VibeFID minting system',
    enterPassword: 'Enter password',
    incorrectPassword: '❌ Incorrect password',
    unlock: 'Unlock',

    // Main page
    fidPageTitle: 'VibeFID',
    fidPageDesc: 'Create playable cards from Farcaster profiles',
    connectedAs: 'Connected as',
    enterFid: 'Enter Farcaster FID',
    fetch: 'Fetch',
    loading: 'Loading...',

    // User info
    bio: 'Bio',
    noBio: 'No bio',
    fid: 'FID',
    score: 'Score',
    followers: 'Followers',
    rarity: 'Rarity',
    cardRange: 'Card Range',
    powerBadge: '⚡ Power Badge',

    // Actions
    generatePreview: 'Generate Card Preview',
    generating: 'Generating...',
    mintCard: 'Mint Card',
    minting: 'Minting...',
    connectToMint: 'Connect Wallet to Mint',
    mintPrice: 'Mint Price',

    // Card preview
    cardPreview: 'Card Preview',
    generatedTraits: 'Generated Traits',
    card: 'Card',
    foil: 'Foil',
    wear: 'Wear',
    power: 'Power',

    // My cards
    myCards: 'My Farcaster Cards',
    cardsCount: '{count} cards',
    share: 'Share',

    // Success modal
    vibeFidMinted: 'VibeFID Minted!',
    mintSuccess: '🎉',
    viewOnBaseScan: 'View on BaseScan',
    shareToFarcaster: 'Share to Farcaster',

    // Criminal backstory
    criminalRecord: 'CRIMINAL RECORD',
    wantedFor: 'WANTED FOR',
    knownAssociates: 'KNOWN ASSOCIATES',
    dateOfCrime: 'DATE OF CRIME',
    dangerLevel: 'DANGER LEVEL',
    lastSeen: 'LAST SEEN',
    warningCaution: '⚠️ WARNING: Approach with extreme caution',
    viewCard: 'View Card →',
    yourVibeFidCard: 'Your VibeFID Card',
    cardStats: 'Card Stats',
    back: '← Back',

    // Story templates (multiple variants for randomization)
    criminalStory1: [
      'Began their criminal activities on {date}, quickly gaining notoriety in the underground community.',
      'Started their crime journey on {date}, building an empire of illegalities.',
      'Emerged in the underworld on {date}, spreading fear and chaos wherever they went.',
      'Entered the world of crime on {date}, becoming a legend among criminals.',
      'Initiated their reign of terror on {date}, never looking back.',
      'Abandoned legality on {date} and was never the same again.',
      'Debuted in organized crime on {date}, surpassing all veterans.',
    ],
    criminalStory2: [
      'With a network of {followers} accomplices spread across the digital underworld, {username} became one of the most feared figures.',
      'Controlling {followers} loyal criminals, {username} dominates entire digital territories.',
      'Leads an organization with {followers} members, all willing to do anything for {username}.',
      'Commands {followers} fanatic followers, {username} is the terror of authorities.',
      'Maintains {followers} strategic allies, {username} is untouchable in the underworld.',
      'With {followers} subordinates under their command, {username} controls everything from the shadows.',
      'Gathered {followers} crime partners, {username} is a living legend.',
    ],
    criminalStory3: [
      'Known for {bio}, this criminal is extremely dangerous and should be approached with caution.',
      'Famous for {bio}, represents a constant threat to the established order.',
      'Identified as {bio}, their tactics are unpredictable and brutal.',
      'Recognized for {bio}, shows no mercy or remorse.',
      'Described as {bio}, their methods are cruel and efficient.',
      'Characterized by {bio}, leaves no witnesses to tell the tale.',
      'Notorious for {bio}, their actions shock even the most experienced criminals.',
    ],
    criminalStory4: [
      'Authorities offer a reward of ${bounty} for capture dead or alive.',
      'A reward of ${bounty} has been established for whoever manages to capture them.',
      'Wanted with a ${bounty} bounty - extremely dangerous approach.',
      'There\'s a ${bounty} bounty on their head, but nobody dares to hunt them.',
      'Reward of ${bounty} awaits whoever is brave (or insane) enough.',
      'Prize of ${bounty} was offered, but the list of failures only grows.',
      'Worth ${bounty} to authorities, but the price may be your own life.',
    ],
    criminalStory5: [
      'Last seen operating in the Farcaster region, leaving a trail of chaos.',
      'Remains active in the shadows of Farcaster, evading all capture attempts.',
      'Disappeared into Farcaster after their last operation, remains at large.',
      'Roams free through Farcaster, mocking authorities every day.',
      'Hides in Farcaster, planning the next devastating strike.',
      'Remains at large in Farcaster, more dangerous than ever.',
      'Moves through Farcaster undetected, a true ghost.',
    ],

    // Danger levels
    dangerExtreme: 'EXTREME - Avoid direct confrontation',
    dangerHigh: 'HIGH - Requires backup',
    dangerMedium: 'MEDIUM - Approach with caution',
    dangerLow: 'LOW - Capture viable',

    // Crime types
    crimeTypeFounder: 'Founder of high-level criminal organization',
    crimeTypeEarly: 'Pioneer in cybercrime',
    crimeTypeEstablished: 'Leader of established gang',
    crimeTypeActive: 'Active member of crime syndicate',
    crimeTypeRecruit: 'Recent recruit in illicit activities',
  },

  "es": {
    // Password screen
    fidAccessTitle: '🔒 Acceso VibeFID',
    fidAccessDesc: 'Ingrese la contraseña para acceder al sistema de mint VibeFID',
    enterPassword: 'Ingrese la contraseña',
    incorrectPassword: '❌ Contraseña incorrecta',
    unlock: 'Desbloquear',

    // Main page
    fidPageTitle: 'VibeFID',
    fidPageDesc: 'Crear cartas jugables desde perfiles de Farcaster',
    connectedAs: 'Conectado como',
    enterFid: 'Ingrese el FID de Farcaster',
    fetch: 'Buscar',
    loading: 'Cargando...',

    // User info
    bio: 'Bio',
    noBio: 'Sin bio',
    fid: 'FID',
    score: 'Puntuación',
    followers: 'Seguidores',
    rarity: 'Rareza',
    cardRange: 'Rango de Carta',
    powerBadge: '⚡ Insignia de Poder',

    // Actions
    generatePreview: 'Generar Vista Previa',
    generating: 'Generando...',
    mintCard: 'Mintear Carta',
    minting: 'Minteando...',
    connectToMint: 'Conectar Billetera para Mintear',
    mintPrice: 'Precio de Mint',

    // Card preview
    cardPreview: 'Vista Previa de la Carta',
    generatedTraits: 'Rasgos Generados',
    card: 'Carta',
    foil: 'Foil',
    wear: 'Desgaste',
    power: 'Poder',

    // My cards
    myCards: 'Mis Cartas Farcaster',
    cardsCount: '{count} cartas',
    share: 'Compartir',

    // Success modal
    vibeFidMinted: '¡VibeFID Minteado!',
    mintSuccess: '🎉',
    viewOnBaseScan: 'Ver en BaseScan',
    shareToFarcaster: 'Compartir en Farcaster',

    // Criminal backstory
    criminalRecord: 'FICHA CRIMINAL',
    wantedFor: 'BUSCADO POR',
    knownAssociates: 'ASOCIADOS CONOCIDOS',
    dateOfCrime: 'FECHA DEL CRIMEN',
    dangerLevel: 'NIVEL DE PELIGRO',
    lastSeen: 'VISTO POR ÚLTIMA VEZ',
    warningCaution: '⚠️ ADVERTENCIA: Acérquese con extrema precaución',
    viewCard: 'Ver Carta →',
    yourVibeFidCard: 'Tu Carta VibeFID',
    cardStats: 'Estadísticas de la Carta',
    back: '← Atrás',

    // Story templates (multiple variants for randomization)
    criminalStory1: [
      'Comenzó sus actividades criminales en {date}, ganando rápidamente notoriedad en la comunidad clandestina.',
      'Inició su viaje en el crimen en {date}, construyendo un imperio de ilegalidades.',
      'Surgió en el submundo en {date}, sembrando miedo y caos por donde pasó.',
      'Entró al mundo del crimen en {date}, convirtiéndose en leyenda entre criminales.',
      'Dio inicio a su reinado de terror en {date}, sin mirar atrás.',
      'Abandonó la legalidad en {date} y nunca volvió a ser el(la) mismo(a).',
      'Debutó en el crimen organizado en {date}, superando a todos los veteranos.',
    ],
    criminalStory2: [
      'Con una red de {followers} cómplices esparcidos por el submundo digital, {username} se convirtió en una de las figuras más temidas.',
      'Controlando {followers} criminales leales, {username} domina territorios digitales enteros.',
      'Lidera una organización con {followers} miembros, todos dispuestos a hacer cualquier cosa por {username}.',
      'Comanda {followers} seguidores fanáticos, {username} es el terror de las autoridades.',
      'Mantiene {followers} aliados estratégicos, {username} es intocable en el submundo.',
      'Con {followers} subordinados bajo su mando, {username} controla todo desde las sombras.',
      'Reunió {followers} socios del crimen, {username} es una leyenda viva.',
    ],
    criminalStory3: [
      'Conocido(a) por {bio}, este criminal es extremadamente peligroso y debe abordarse con precaución.',
      'Famoso(a) por {bio}, representa una amenaza constante al orden establecido.',
      'Identificado(a) como {bio}, sus tácticas son impredecibles y brutales.',
      'Reconocido(a) por {bio}, no muestra piedad ni remordimiento.',
      'Descrito(a) como {bio}, sus métodos son crueles y eficientes.',
      'Caracterizado(a) por {bio}, no deja testigos para contar la historia.',
      'Notorio(a) por {bio}, sus acciones conmocionan hasta a los criminales más experimentados.',
    ],
    criminalStory4: [
      'Las autoridades ofrecen una recompensa de ${bounty} por la captura vivo o muerto.',
      'Una recompensa de ${bounty} ha sido establecida para quien logre capturarlo(a).',
      'Buscado(a) con recompensa de ${bounty} - acercamiento extremadamente peligroso.',
      'Hay una recompensa de ${bounty} sobre su cabeza, pero nadie se atreve a cazarlo(a).',
      'Recompensa de ${bounty} espera a quien sea valiente (o demente) suficiente.',
      'Premio de ${bounty} fue ofrecido, pero la lista de fracasados solo crece.',
      'Vale ${bounty} para las autoridades, pero el precio puede ser tu propia vida.',
    ],
    criminalStory5: [
      'Visto por última vez operando en la región de Farcaster, dejando un rastro de caos.',
      'Continúa activo(a) en las sombras de Farcaster, evadiendo todos los intentos de captura.',
      'Desapareció en Farcaster tras su última operación, permanece prófugo(a).',
      'Vaga libre por Farcaster, burlándose de las autoridades cada día.',
      'Se esconde en Farcaster, planeando el próximo golpe devastador.',
      'Permanece suelto(a) en Farcaster, más peligroso(a) que nunca.',
      'Circula por Farcaster sin ser detectado(a), un verdadero fantasma.',
    ],

    // Danger levels
    dangerExtreme: 'EXTREMO - Evite el confrontamiento directo',
    dangerHigh: 'ALTO - Requiere refuerzos',
    dangerMedium: 'MEDIO - Acérquese con precaución',
    dangerLow: 'BAJO - Captura viable',

    // Crime types
    crimeTypeFounder: 'Fundador de organización criminal de alto nivel',
    crimeTypeEarly: 'Pionero en delitos cibernéticos',
    crimeTypeEstablished: 'Líder de banda establecida',
    crimeTypeActive: 'Miembro activo del sindicato del crimen',
    crimeTypeRecruit: 'Recluta reciente en actividades ilícitas',
  },

  "hi": {
    // Password screen
    fidAccessTitle: '🔒 VibeFID पहुंच',
    fidAccessDesc: 'VibeFID मिंटिंग सिस्टम तक पहुंचने के लिए पासवर्ड दर्ज करें',
    enterPassword: 'पासवर्ड दर्ज करें',
    incorrectPassword: '❌ गलत पासवर्ड',
    unlock: 'अनलॉक करें',

    // Main page
    fidPageTitle: 'VibeFID',
    fidPageDesc: 'Farcaster प्रोफाइल से खेलने योग्य कार्ड बनाएं',
    connectedAs: 'के रूप में कनेक्ट किया गया',
    enterFid: 'Farcaster FID दर्ज करें',
    fetch: 'प्राप्त करें',
    loading: 'लोड हो रहा है...',

    // User info
    bio: 'बायो',
    noBio: 'कोई बायो नहीं',
    fid: 'FID',
    score: 'स्कोर',
    followers: 'अनुयायी',
    rarity: 'दुर्लभता',
    cardRange: 'कार्ड रेंज',
    powerBadge: '⚡ पावर बैज',

    // Actions
    generatePreview: 'कार्ड पूर्वावलोकन उत्पन्न करें',
    generating: 'उत्पन्न हो रहा है...',
    mintCard: 'कार्ड मिंट करें',
    minting: 'मिंट हो रहा है...',
    connectToMint: 'मिंट करने के लिए वॉलेट कनेक्ट करें',
    mintPrice: 'मिंट मूल्य',

    // Card preview
    cardPreview: 'कार्ड पूर्वावलोकन',
    generatedTraits: 'उत्पन्न विशेषताएं',
    card: 'कार्ड',
    foil: 'फॉयल',
    wear: 'घिसावट',
    power: 'शक्ति',

    // My cards
    myCards: 'मेरे Farcaster कार्ड',
    cardsCount: '{count} कार्ड',
    share: 'साझा करें',

    // Success modal
    vibeFidMinted: 'VibeFID मिंट हो गया!',
    mintSuccess: '🎉',
    viewOnBaseScan: 'BaseScan पर देखें',
    shareToFarcaster: 'Farcaster पर साझा करें',

    // Criminal backstory
    criminalRecord: 'आपराधिक रिकॉर्ड',
    wantedFor: 'के लिए वांछित',
    knownAssociates: 'ज्ञात सहयोगी',
    dateOfCrime: 'अपराध की तारीख',
    dangerLevel: 'खतरे का स्तर',
    lastSeen: 'अंतिम बार देखा गया',
    warningCaution: '⚠️ चेतावनी: अत्यधिक सावधानी से संपर्क करें',
    viewCard: 'कार्ड देखें →',
    yourVibeFidCard: 'आपका VibeFID कार्ड',
    cardStats: 'कार्ड आंकड़े',
    back: '← वापस',

    // Story templates (multiple variants for randomization)
    criminalStory1: [
      'ने {date} को अपनी आपराधिक गतिविधियां शुरू कीं, भूमिगत समुदाय में तेजी से कुख्याति प्राप्त की।',
      '{date} को अपराध की दुनिया में प्रवेश किया, अवैधता का साम्राज्य बनाते हुए।',
      '{date} को अंडरवर्ल्ड में उभरा, जहां भी गया भय और अराजकता फैलाते हुए।',
      '{date} को अपराध की दुनिया में शामिल हुआ, अपराधियों के बीच एक किंवदंती बन गया।',
      '{date} को अपने आतंक के शासन की शुरुआत की, कभी पीछे मुड़कर नहीं देखा।',
      '{date} को कानूनी रास्ता छोड़ दिया और फिर कभी वैसा नहीं रहा।',
      '{date} को संगठित अपराध में शुरुआत की, सभी दिग्गजों को पीछे छोड़ते हुए।',
    ],
    criminalStory2: [
      'डिजिटल अंडरवर्ल्ड में फैले {followers} साथियों के नेटवर्क के साथ, {username} सबसे डरावने आंकड़ों में से एक बन गया।',
      '{followers} वफादार अपराधियों को नियंत्रित करते हुए, {username} पूरे डिजिटल क्षेत्रों पर हावी है।',
      '{followers} सदस्यों के साथ एक संगठन का नेतृत्व करता है, सभी {username} के लिए कुछ भी करने को तैयार हैं।',
      '{followers} कट्टर अनुयायियों को कमांड करता है, {username} अधिकारियों के लिए आतंक है।',
      '{followers} रणनीतिक सहयोगियों को बनाए रखता है, {username} अंडरवर्ल्ड में अछूत है।',
      '{followers} अधीनस्थों के साथ अपनी कमान में, {username} छाया से सब कुछ नियंत्रित करता है।',
      '{followers} अपराध भागीदारों को इकट्ठा किया, {username} एक जीवित किंवदंती है।',
    ],
    criminalStory3: [
      '{bio} के लिए जाना जाता है, यह अपराधी अत्यंत खतरनाक है और सावधानी से संपर्क किया जाना चाहिए।',
      '{bio} के लिए प्रसिद्ध है, स्थापित व्यवस्था के लिए निरंतर खतरा का प्रतिनिधित्व करता है।',
      '{bio} के रूप में पहचाना जाता है, उनकी रणनीतियां अप्रत्याशित और क्रूर हैं।',
      '{bio} के लिए मान्यता प्राप्त है, कोई दया या पछतावा नहीं दिखाता है।',
      '{bio} के रूप में वर्णित है, उनके तरीके क्रूर और कुशल हैं।',
      '{bio} द्वारा विशेषता है, कहानी बताने के लिए कोई गवाह नहीं छोड़ता है।',
      '{bio} के लिए कुख्यात है, उनके कार्य सबसे अनुभवी अपराधियों को भी चौंका देते हैं।',
    ],
    criminalStory4: [
      'अधिकारी जीवित या मृत पकड़ने के लिए ${bounty} का इनाम देते हैं।',
      '${bounty} का इनाम स्थापित किया गया है जो भी उसे पकड़ने में सफल हो जाता है।',
      '${bounty} इनाम के साथ वांछित - अत्यंत खतरनाक दृष्टिकोण।',
      'उनके सिर पर ${bounty} का इनाम है, लेकिन कोई भी उन्हें शिकार करने की हिम्मत नहीं करता।',
      '${bounty} का इनाम उसका इंतजार कर रहा है जो बहादुर (या पागल) पर्याप्त है।',
      '${bounty} का पुरस्कार पेश किया गया था, लेकिन असफलताओं की सूची केवल बढ़ती है।',
      'अधिकारियों के लिए ${bounty} के लायक है, लेकिन कीमत आपकी अपनी जान हो सकती है।',
    ],
    criminalStory5: [
      'Farcaster क्षेत्र में काम करते हुए आखिरी बार देखा गया, अराजकता का निशान छोड़ते हुए।',
      'Farcaster की छाया में सक्रिय रहता है, सभी कैप्चर प्रयासों को चकमा देते हुए।',
      'अपने अंतिम ऑपरेशन के बाद Farcaster में गायब हो गया, फरार बना हुआ है।',
      'Farcaster के माध्यम से स्वतंत्र रूप से घूमता है, हर दिन अधिकारियों का मजाक उड़ाता है।',
      'Farcaster में छिपा हुआ है, अगले विनाशकारी हमले की योजना बना रहा है।',
      'Farcaster में फरार बना हुआ है, पहले से कहीं अधिक खतरनाक।',
      'Farcaster के माध्यम से अनदेखा चलता है, एक सच्चा भूत।',
    ],

    // Danger levels
    dangerExtreme: 'अत्यधिक - सीधे टकराव से बचें',
    dangerHigh: 'उच्च - बैकअप की आवश्यकता है',
    dangerMedium: 'मध्यम - सावधानी से संपर्क करें',
    dangerLow: 'निम्न - कैप्चर व्यवहार्य',

    // Crime types
    crimeTypeFounder: 'उच्च-स्तरीय आपराधिक संगठन के संस्थापक',
    crimeTypeEarly: 'साइबर अपराध में अग्रणी',
    crimeTypeEstablished: 'स्थापित गिरोह के नेता',
    crimeTypeActive: 'अपराध सिंडिकेट के सक्रिय सदस्य',
    crimeTypeRecruit: 'अवैध गतिविधियों में हाल ही में भर्ती',
  },

  "ru": {
    // Password screen
    fidAccessTitle: '🔒 Доступ к VibeFID',
    fidAccessDesc: 'Введите пароль для доступа к системе минтинга VibeFID',
    enterPassword: 'Введите пароль',
    incorrectPassword: '❌ Неверный пароль',
    unlock: 'Разблокировать',

    // Main page
    fidPageTitle: 'VibeFID',
    fidPageDesc: 'Создавайте игровые карты из профилей Farcaster',
    connectedAs: 'Подключен как',
    enterFid: 'Введите Farcaster FID',
    fetch: 'Получить',
    loading: 'Загрузка...',

    // User info
    bio: 'Био',
    noBio: 'Нет био',
    fid: 'FID',
    score: 'Счет',
    followers: 'Подписчики',
    rarity: 'Редкость',
    cardRange: 'Диапазон Карт',
    powerBadge: '⚡ Значок Силы',

    // Actions
    generatePreview: 'Создать Предпросмотр',
    generating: 'Генерация...',
    mintCard: 'Минтить Карту',
    minting: 'Минтинг...',
    connectToMint: 'Подключить Кошелек для Минтинга',
    mintPrice: 'Цена Минтинга',

    // Card preview
    cardPreview: 'Предпросмотр Карты',
    generatedTraits: 'Сгенерированные Характеристики',
    card: 'Карта',
    foil: 'Фольга',
    wear: 'Износ',
    power: 'Сила',

    // My cards
    myCards: 'Мои Карты Farcaster',
    cardsCount: '{count} карт',
    share: 'Поделиться',

    // Success modal
    vibeFidMinted: 'VibeFID Сминчен!',
    mintSuccess: '🎉',
    viewOnBaseScan: 'Посмотреть на BaseScan',
    shareToFarcaster: 'Поделиться в Farcaster',

    // Criminal backstory
    criminalRecord: 'КРИМИНАЛЬНАЯ ЗАПИСЬ',
    wantedFor: 'РАЗЫСКИВАЕТСЯ ЗА',
    knownAssociates: 'ИЗВЕСТНЫЕ СОУЧАСТНИКИ',
    dateOfCrime: 'ДАТА ПРЕСТУПЛЕНИЯ',
    dangerLevel: 'УРОВЕНЬ ОПАСНОСТИ',
    lastSeen: 'ПОСЛЕДНИЙ РАЗ ВИДЕН',
    warningCaution: '⚠️ ПРЕДУПРЕЖДЕНИЕ: Подходите с крайней осторожностью',
    viewCard: 'Посмотреть карту →',
    yourVibeFidCard: 'Ваша карта VibeFID',
    cardStats: 'Статистика карты',
    back: '← Назад',

    // Story templates (multiple variants for randomization)
    criminalStory1: [
      'Начал преступную деятельность {date}, быстро завоевав печальную известность в подпольном сообществе.',
      'Начал свой путь в преступном мире {date}, строя империю беззакония.',
      'Появился в преступном мире {date}, сея страх и хаос везде, где бы ни был.',
      'Вступил в мир преступности {date}, став легендой среди криминала.',
      'Начал свое царствование террора {date}, никогда не оглядываясь назад.',
      'Отказался от законности {date} и больше никогда не был прежним.',
      'Дебютировал в организованной преступности {date}, превзойдя всех ветеранов.',
    ],
    criminalStory2: [
      'С сетью из {followers} сообщников, распространенных по цифровому подполью, {username} стал одной из самых страшных фигур.',
      'Контролируя {followers} верных преступников, {username} доминирует над целыми цифровыми территориями.',
      'Возглавляет организацию с {followers} членами, все готовы сделать что угодно для {username}.',
      'Командует {followers} фанатичными последователями, {username} - ужас для властей.',
      'Поддерживает {followers} стратегических союзников, {username} неприкасаем в преступном мире.',
      'С {followers} подчиненными под его командованием, {username} контролирует все из тени.',
      'Собрал {followers} партнеров по преступлениям, {username} - живая легенда.',
    ],
    criminalStory3: [
      'Известен {bio}, этот преступник чрезвычайно опасен, и к нему следует подходить с осторожностью.',
      'Известен {bio}, представляет постоянную угрозу установленному порядку.',
      'Идентифицирован как {bio}, их тактика непредсказуема и жестока.',
      'Признан за {bio}, не проявляет ни милосердия, ни раскаяния.',
      'Описан как {bio}, их методы жестоки и эффективны.',
      'Характеризуется {bio}, не оставляет свидетелей, чтобы рассказать историю.',
      'Печально известен {bio}, их действия шокируют даже самых опытных преступников.',
    ],
    criminalStory4: [
      'Власти предлагают награду в ${bounty} за поимку живым или мертвым.',
      'Награда в ${bounty} установлена для того, кто сможет его поймать.',
      'Разыскивается с наградой ${bounty} - чрезвычайно опасный подход.',
      'На его голову назначена награда ${bounty}, но никто не осмеливается охотиться на него.',
      'Награда ${bounty} ждет того, кто достаточно смел (или безумен).',
      'Приз ${bounty} был предложен, но список неудачников только растет.',
      'Стоит ${bounty} для властей, но цена может быть вашей собственной жизнью.',
    ],
    criminalStory5: [
      'Последний раз видели действующим в регионе Farcaster, оставляя за собой след хаоса.',
      'Остается активным в тени Farcaster, уклоняясь от всех попыток поимки.',
      'Исчез в Farcaster после последней операции, остается на свободе.',
      'Свободно бродит по Farcaster, каждый день насмехаясь над властями.',
      'Прячется в Farcaster, планируя следующий разрушительный удар.',
      'Остается на свободе в Farcaster, более опасен, чем когда-либо.',
      'Перемещается по Farcaster незамеченным, настоящий призрак.',
    ],

    // Danger levels
    dangerExtreme: 'ЭКСТРЕМАЛЬНЫЙ - Избегайте прямой конфронтации',
    dangerHigh: 'ВЫСОКИЙ - Требуется поддержка',
    dangerMedium: 'СРЕДНИЙ - Подходите с осторожностью',
    dangerLow: 'НИЗКИЙ - Захват возможен',

    // Crime types
    crimeTypeFounder: 'Основатель преступной организации высокого уровня',
    crimeTypeEarly: 'Пионер в киберпреступности',
    crimeTypeEstablished: 'Лидер устоявшейся банды',
    crimeTypeActive: 'Активный член преступного синдиката',
    crimeTypeRecruit: 'Недавний новобранец в незаконной деятельности',
  },

  "zh-CN": {
    // Password screen
    fidAccessTitle: '🔒 VibeFID 访问',
    fidAccessDesc: '输入密码以访问 VibeFID 铸造系统',
    enterPassword: '输入密码',
    incorrectPassword: '❌ 密码错误',
    unlock: '解锁',

    // Main page
    fidPageTitle: 'VibeFID',
    fidPageDesc: '从 Farcaster 个人资料创建可玩卡片',
    connectedAs: '已连接为',
    enterFid: '输入 Farcaster FID',
    fetch: '获取',
    loading: '加载中...',

    // User info
    bio: '简介',
    noBio: '无简介',
    fid: 'FID',
    score: '分数',
    followers: '关注者',
    rarity: '稀有度',
    cardRange: '卡片范围',
    powerBadge: '⚡ 能量徽章',

    // Actions
    generatePreview: '生成卡片预览',
    generating: '生成中...',
    mintCard: '铸造卡片',
    minting: '铸造中...',
    connectToMint: '连接钱包以铸造',
    mintPrice: '铸造价格',

    // Card preview
    cardPreview: '卡片预览',
    generatedTraits: '生成的特征',
    card: '卡片',
    foil: '闪卡',
    wear: '磨损',
    power: '力量',

    // My cards
    myCards: '我的 Farcaster 卡片',
    cardsCount: '{count} 张卡片',
    share: '分享',

    // Success modal
    vibeFidMinted: 'VibeFID 已铸造！',
    mintSuccess: '🎉',
    viewOnBaseScan: '在 BaseScan 上查看',
    shareToFarcaster: '分享到 Farcaster',

    // Criminal backstory
    criminalRecord: '犯罪记录',
    wantedFor: '通缉原因',
    knownAssociates: '已知同伙',
    dateOfCrime: '犯罪日期',
    dangerLevel: '危险等级',
    lastSeen: '最后出现',
    warningCaution: '⚠️ 警告：请极度谨慎',
    viewCard: '查看卡片 →',
    yourVibeFidCard: '你的 VibeFID 卡片',
    cardStats: '卡片属性',
    back: '← 返回',

    // Story templates (multiple variants for randomization)
    criminalStory1: [
      '在 {date} 开始犯罪活动，迅速在地下社区中声名狼藉。',
      '在 {date} 开始犯罪之旅，建立非法帝国。',
      '在 {date} 出现在地下世界，所到之处散播恐惧和混乱。',
      '在 {date} 进入犯罪世界，成为罪犯中的传奇。',
      '在 {date} 开始恐怖统治，从未回头。',
      '在 {date} 抛弃合法性，从此再也不同。',
      '在 {date} 首次亮相有组织犯罪，超越所有老手。',
    ],
    criminalStory2: [
      '拥有遍布数字黑社会的 {followers} 名同伙网络，{username} 成为最可怕的人物之一。',
      '控制 {followers} 名忠诚的罪犯，{username} 主宰整个数字领域。',
      '领导一个拥有 {followers} 名成员的组织，所有人都愿意为 {username} 做任何事。',
      '指挥 {followers} 名狂热追随者，{username} 是当局的恐怖。',
      '维持 {followers} 名战略盟友，{username} 在地下世界不可触碰。',
      '在 {followers} 名下属的指挥下，{username} 从阴影中控制一切。',
      '聚集了 {followers} 名犯罪伙伴，{username} 是活着的传奇。',
    ],
    criminalStory3: [
      '以 {bio} 闻名，这名罪犯极其危险，应谨慎接近。',
      '以 {bio} 著称，对既定秩序构成持续威胁。',
      '被识别为 {bio}，他们的策略不可预测且残酷。',
      '因 {bio} 而闻名，不显示任何怜悯或悔恨。',
      '被描述为 {bio}，他们的方法残忍而高效。',
      '以 {bio} 为特征，不留证人讲述故事。',
      '以 {bio} 臭名昭著，他们的行为甚至震惊最有经验的罪犯。',
    ],
    criminalStory4: [
      '当局悬赏 ${bounty} 抓捕活捉或击毙。',
      '已设立 ${bounty} 的赏金，谁能抓住他们。',
      '悬赏 ${bounty} 通缉 - 极其危险的接近。',
      '他们头上有 ${bounty} 的赏金，但没人敢猎杀他们。',
      '${bounty} 的赏金等待着足够勇敢（或疯狂）的人。',
      '提供了 ${bounty} 的奖金，但失败者名单只增不减。',
      '对当局来说值 ${bounty}，但代价可能是你自己的生命。',
    ],
    criminalStory5: [
      '最后一次被发现在 Farcaster 地区活动，留下一片混乱。',
      '继续在 Farcaster 的阴影中活动，逃避所有抓捕尝试。',
      '在最后一次行动后消失在 Farcaster 中，仍然在逃。',
      '在 Farcaster 自由漫游，每天嘲笑当局。',
      '躲藏在 Farcaster 中，策划下一次毁灭性打击。',
      '仍然在 Farcaster 逃亡，比以往任何时候都更危险。',
      '在 Farcaster 中未被发现地移动，一个真正的幽灵。',
    ],

    // Danger levels
    dangerExtreme: '极端 - 避免直接对抗',
    dangerHigh: '高 - 需要支援',
    dangerMedium: '中 - 谨慎接近',
    dangerLow: '低 - 可捕获',

    // Crime types
    crimeTypeFounder: '高级犯罪组织创始人',
    crimeTypeEarly: '网络犯罪先驱',
    crimeTypeEstablished: '成熟帮派领导者',
    crimeTypeActive: '犯罪集团活跃成员',
    crimeTypeRecruit: '非法活动新招募成员',
  },
};
