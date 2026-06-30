# Sound Assets

Place custom sound files in this folder.

Recommended formats:
- `.mp3`
- `.m4a`
- `.wav`

Suggested filenames:
- `success.mp3` - save/add success
- `fanfare.mp3` - goal completion
- `click.mp3` - normal tap
- `toggle.mp3` - switch/toggle
- `beep.mp3` - timer start/pause/beep
- `soft-stop.mp3` - timer stop
- `alarm.mp3` - pomodoro/work completion
- `delete.mp3` - delete action

After adding files, update `hooks/use-sound.ts` to require the local files instead of the current remote URLs.
