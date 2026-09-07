# Cli_musicPlayer
# 🎵 CLI Music Player

## Refinement Challenge

This project is a Node.js command-line music player. The purpose of the refinement challenge was to improve the basic CLI music player by applying concepts learned in class.

The application supports:

- Navigating songs using the Up and Down arrow keys
- Redrawing the song list in the same terminal position
- Playing a selected song using Enter
- Pausing and resuming playback
- Displaying the song duration
- Displaying elapsed and total playback duration
- Switching between songs
- Using VLC as the music player

---

# 1. Architecture Diagram

```text
                    ┌─────────────────────┐
                    │        USER         │
                    │    Keyboard Input   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      Node.js        │
                    │      CLI App        │
                    └──────────┬──────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
        ┌──────────────┐ ┌─────────────┐ ┌─────────────┐
        │  Up / Down   │ │ Enter / p   │ │   n / b     │
        │  Selection   │ │ Play/Pause  │ │ Next / Back │
        └──────┬───────┘ └──────┬──────┘ └──────┬──────┘
               │                │               │
               └────────────────┼───────────────┘
                                ▼
                    ┌─────────────────────┐
                    │    Song Selection   │
                    │     userChoice      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     VLC Process      │
                    │  child_process.spawn │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     Audio Output    │
                    │      Speakers       │
                    └─────────────────────┘


                    ┌─────────────────────┐
                    │       afinfo        │
                    │  Get song duration  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   totalDuration     │
                    │   elapsedDuration   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    CLI Display      │
                    │ Song List + Time    │
                    └─────────────────────┘