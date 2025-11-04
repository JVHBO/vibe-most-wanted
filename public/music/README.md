# Background Music Files

Place your music files in this directory according to the following naming convention:

## Required Files:

- `default.m4a` - Default background music (plays when "Default Music" mode is selected)
- `pt-br.m4a` - Portuguese (Brazil) music
- `en.m4a` - English music
- `es.m4a` - Spanish music
- `hi.m4a` - Hindi music
- `ru.m4a` - Russian music
- `zh-cn.m4a` - Chinese Simplified music

## Format:
- All files should be in M4A (AAC) format
- Recommended bitrate: 128-192 kbps (to keep file size reasonable)
- Files will loop automatically
- Transitions between tracks use 1.5 second fade in/fade out

## How it works:
1. When "Default Music" mode is selected, `default.m4a` plays continuously
2. When "Language Music" mode is selected, the music changes based on the selected language
3. Volume is controlled by the existing music volume slider in Settings
4. When changing language or music mode, tracks crossfade smoothly

## Notes:
- Missing files will result in console warnings but won't break the app
- Files are loaded on demand when needed
- The system ensures only one track plays at a time
