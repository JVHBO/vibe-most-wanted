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

    // Story templates
    criminalStory1: 'iniciou suas atividades criminosas em {date}, rapidamente ganhando notoriedade na comunidade underground.',
    criminalStory2: 'Com uma rede de {followers} cúmplices espalhados pelo submundo digital, {username} se tornou uma das figuras mais temidas.',
    criminalStory3: 'Conhecido(a) por {bio}, este criminoso é extremamente perigoso e deve ser abordado com cautela.',
    criminalStory4: 'As autoridades oferecem uma recompensa de ${bounty} pela captura vivo ou morto.',
    criminalStory5: 'Foi visto pela última vez operando na região do Farcaster, deixando um rastro de caos.',

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

    // Story templates
    criminalStory1: 'began their criminal activities on {date}, quickly gaining notoriety in the underground community.',
    criminalStory2: 'With a network of {followers} accomplices spread across the digital underworld, {username} became one of the most feared figures.',
    criminalStory3: 'Known for {bio}, this criminal is extremely dangerous and should be approached with caution.',
    criminalStory4: 'Authorities offer a reward of ${bounty} for capture dead or alive.',
    criminalStory5: 'Last seen operating in the Farcaster region, leaving a trail of chaos.',

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

    // Story templates
    criminalStory1: 'comenzó sus actividades criminales en {date}, ganando rápidamente notoriedad en la comunidad clandestina.',
    criminalStory2: 'Con una red de {followers} cómplices esparcidos por el submundo digital, {username} se convirtió en una de las figuras más temidas.',
    criminalStory3: 'Conocido(a) por {bio}, este criminal es extremadamente peligroso y debe abordarse con precaución.',
    criminalStory4: 'Las autoridades ofrecen una recompensa de ${bounty} por la captura vivo o muerto.',
    criminalStory5: 'Visto por última vez operando en la región de Farcaster, dejando un rastro de caos.',

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

    // Story templates
    criminalStory1: 'ने {date} को अपनी आपराधिक गतिविधियां शुरू कीं, भूमिगत समुदाय में तेजी से कुख्याति प्राप्त की।',
    criminalStory2: 'डिजिटल अंडरवर्ल्ड में फैले {followers} साथियों के नेटवर्क के साथ, {username} सबसे डरावने आंकड़ों में से एक बन गया।',
    criminalStory3: '{bio} के लिए जाना जाता है, यह अपराधी अत्यंत खतरनाक है और सावधानी से संपर्क किया जाना चाहिए।',
    criminalStory4: 'अधिकारी जीवित या मृत पकड़ने के लिए ${bounty} का इनाम देते हैं।',
    criminalStory5: 'Farcaster क्षेत्र में काम करते हुए आखिरी बार देखा गया, अराजकता का निशान छोड़ते हुए।',

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

    // Story templates
    criminalStory1: 'начал преступную деятельность {date}, быстро завоевав печальную известность в подпольном сообществе.',
    criminalStory2: 'С сетью из {followers} сообщников, распространенных по цифровому подполью, {username} стал одной из самых страшных фигур.',
    criminalStory3: 'Известен {bio}, этот преступник чрезвычайно опасен, и к нему следует подходить с осторожностью.',
    criminalStory4: 'Власти предлагают награду в ${bounty} за поимку живым или мертвым.',
    criminalStory5: 'Последний раз видели действующим в регионе Farcaster, оставляя за собой след хаоса.',

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

    // Story templates
    criminalStory1: '在 {date} 开始犯罪活动，迅速在地下社区中声名狼藉。',
    criminalStory2: '拥有遍布数字黑社会的 {followers} 名同伙网络，{username} 成为最可怕的人物之一。',
    criminalStory3: '以 {bio} 闻名，这名罪犯极其危险，应谨慎接近。',
    criminalStory4: '当局悬赏 ${bounty} 抓捕活捉或击毙。',
    criminalStory5: '最后一次被发现在 Farcaster 地区活动，留下一片混乱。',

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
