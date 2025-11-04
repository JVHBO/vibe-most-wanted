# Background Music Files

Place your music files in this directory according to the following naming convention:

## Required Files:

- `default.mp3` or `default.m4a` - Default background music (plays when "Default Music" mode is selected)
- `pt-br.mp3` or `pt-br.m4a` - Portuguese (Brazil) music
- `en.mp3` or `en.m4a` - English music
- `es.mp3` or `es.m4a` - Spanish music
- `hi.mp3` or `hi.m4a` - Hindi music
- `ru.mp3` or `ru.m4a` - Russian music
- `zh-cn.mp3` or `zh-cn.m4a` - Chinese Simplified music

## Format:
- Files can be in MP3 or M4A (AAC) format
- System tries MP3 first, then M4A as fallback
- Recommended bitrate: 128-192 kbps (to keep file size reasonable)
- Files will loop automatically
- Transitions between tracks use 1.5 second fade in/fade out

## How it works:
1. When "Default Music" mode is selected, `default.mp3` (or .m4a) plays continuously
2. When "Language Music" mode is selected, the music changes based on the selected language
3. Volume is controlled by the existing music volume slider in Settings
4. When changing language or music mode, tracks crossfade smoothly

## Notes:
- Missing files will result in console warnings but won't break the app
- Files are loaded on demand when needed
- The system ensures only one track plays at a time

## ⚠️ COPYRIGHT WARNING:

**IMPORTANT:** You must use royalty-free music for all files!

### Current Status:
- ✅ `default.mp3` - OK (already included)
- ❌ Regional music files (en, es, hi, pt-br, ru, zh-cn) - **NOT INCLUDED** (copyright issues)

### Where to Find Royalty-Free Music:

1. **Pixabay Music** (https://pixabay.com/music/)
   - 100% free, no attribution required
   - Commercial use allowed
   - Search by language/style

2. **YouTube Audio Library** (https://www.youtube.com/audiolibrary/music)
   - Filter by "No attribution required"
   - Good selection of international music

3. **Free Music Archive** (https://freemusicarchive.org/)
   - Check license (CC0 or CC BY recommended)
   - Various international styles

4. **Incompetech** (https://incompetech.com/)
   - Free with attribution
   - Easy to credit in app

### Recommendations by Language:
- **English (en)**: Search for "country", "folk", "americana" on Pixabay
- **Spanish (es)**: Search for "flamenco", "latin", "acoustic spanish"
- **Hindi (hi)**: Search for "indian traditional", "sitar", "tabla"
- **Portuguese (pt-br)**: Search for "bossa nova", "brazilian", "samba"
- **Russian (ru)**: Search for "russian folk", "balalaika", "slavic"
- **Chinese (zh-cn)**: Search for "chinese traditional", "guzheng", "erhu"

### Legal Note:
Never use music downloaded from YouTube (unless from official royalty-free channels), Spotify, or other streaming services without proper licensing. This can result in DMCA takedowns or legal issues.
