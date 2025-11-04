# Background Music Files

Place your music files in this directory according to the following naming convention:

## Required Files:

- `default.mp3` - Default background music (plays when "Default Music" mode is selected)
- `pt-br.mp3` - Portuguese (Brazil) music
- `en.mp3` - English music
- `es.mp3` - Spanish music
- `hi.mp3` - Hindi music
- `ru.mp3` - Russian music
- `zh-cn.mp3` - Chinese Simplified music

## Format:
- All files should be in MP3 format
- Recommended bitrate: 128-192 kbps (to keep file size reasonable)
- Files will loop automatically
- Transitions between tracks use 1.5 second fade in/fade out

## How it works:
1. When "Default Music" mode is selected, `default.mp3` plays continuously
2. When "Language Music" mode is selected, the music changes based on the selected language
3. Volume is controlled by the existing music volume slider in Settings
4. When changing language or music mode, tracks crossfade smoothly

## Notes:
- Missing files will result in console warnings but won't break the app
- Files are loaded on demand when needed
- The system ensures only one track plays at a time
