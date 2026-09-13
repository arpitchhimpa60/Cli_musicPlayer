# Cli_musicPlayer

# 🎵 CLI Music Player

## Refinement Challenge

This project is a **Node.js command-line music player** developed as part of a refinement challenge. The purpose of the project was to improve a basic CLI music player by applying concepts learned in class, including Node.js, child processes, file handling, keyboard input, and terminal control.

The application uses **VLC** for audio playback and **`afinfo`** to retrieve the duration of audio files.

---

# Features

The application supports:

* 🎵 Displaying a list of songs
* ⬆️⬇️ Navigating songs using Up and Down arrow keys
* ▶️ Playing a selected song using Enter
* ⏸️ Pausing and resuming playback using `P`
* ⏭️ Moving to the next song using `N`
* ⏮️ Moving to the previous song using `B`
* 🔊 Increasing and decreasing volume using `+` and `-`
* 🔀 Shuffling the playlist using `S`
* ⏱️ Displaying elapsed and total playback duration
* 📊 Displaying a playback progress bar
* 📋 Storing the playlist in `playlist.json`
* 🖥️ Updating the terminal interface without continuously scrolling
* ❌ Exiting the application using `Q`

---

# Controls

```text
↑ ↓       Select Song
Enter     Play Selected Song
P         Play / Pause
N         Next Song
B         Previous Song
+         Increase Volume
-         Decrease Volume
S         Shuffle Playlist
Q         Quit
```

The Left and Right arrow keys are not used by the application.

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
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
   │   ↑ / ↓      │     │   Enter / P  │     │    N / B     │
   │   Selection  │     │ Play / Pause │     │  Next / Back │
   └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
          │                    │                    │
          └────────────────────┼────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    Song Selection   │
                    │     userChoice      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     VLC Process     │
                    │  child_process.spawn│
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
                    │    Progress Bar     │
                    │    CLI Status       │
                    └─────────────────────┘


                    ┌─────────────────────┐
                    │    playlist.json    │
                    │   Playlist Storage  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      songMenu       │
                    │    Song List Data   │
                    └─────────────────────┘
```

---

# 2. Technologies Used

## Node.js

Node.js is used to build the command-line application and handle keyboard input, file operations, processes, and terminal output.

## `child_process`

The Node.js `child_process` module is used to run external programs.

The project uses:

```js
const { spawn } = require("child_process");
```

It is used to start:

* VLC for playing music
* `afinfo` for retrieving song duration

Example:

```js
playerProcess = spawn(
  "vlc",
  [
    "--intf",
    "rc",
    "--quiet",
    songMenu[userChoice]
  ]
);
```

---

# 3. VLC Integration

VLC is used as the actual audio playback engine.

The Node.js application starts VLC as a child process:

```js
playerProcess = spawn(
  "vlc",
  [
    "--intf",
    "rc",
    "--quiet",
    songMenu[userChoice]
  ]
);
```

The application can also communicate with VLC through its standard input.

For example, Play/Pause is implemented using:

```js
playerProcess.stdin.write("pause\n");
```

Volume is controlled using:

```js
playerProcess.stdin.write(`volume ${volume}\n`);
```

---

# 4. Song Selection

The variable:

```js
let userChoice = 0;
```

stores the index of the currently selected song.

The Up and Down arrow keys modify this value.

For example:

```text
> Song 1
  Song 2
  Song 3
```

After pressing Down:

```text
  Song 1
> Song 2
  Song 3
```

The selected song is displayed using the `>` symbol.

The application prevents the selection from going outside the playlist.

Therefore:

```text
First Song + Up
```

stays on the first song, and:

```text
Last Song + Down
```

stays on the last song.

---

# 5. Playing a Song

When the user presses Enter, the selected song is played.

The application first stops the currently running VLC process if one exists:

```js
if (playerProcess !== undefined) {
  playerProcess.kill("SIGKILL");
  playerProcess = undefined;
}
```

Then it starts VLC with the selected song.

This prevents multiple VLC processes from playing simultaneously.

---

# 6. Next and Previous Songs

The `N` key moves to the next song.

```js
function nextSong() {

  if (userChoice >= songMenu.length - 1) {
    return;
  }

  elapsedDuration = 0;

  userChoice += 1;

  if (playerProcess !== undefined) {
    playerProcess.kill("SIGKILL");
    playerProcess = undefined;
  }

  totalDuration = 0;
  isPaused = false;

  updateSongList();

  getTotalDuration(
    songMenu[userChoice]
  );

  playerProcess = spawn(
    "vlc",
    [
      "--intf",
      "rc",
      "--quiet",
      songMenu[userChoice]
    ]
  );
}
```

The `B` key performs the opposite operation and moves to the previous song.

The application also checks the boundaries so the user cannot move before the first song or beyond the last song.

---

# 7. Play / Pause

The `P` key is used to pause or resume the currently playing song.

```js
function togglePause() {

  if (playerProcess === undefined) {
    return;
  }

  playerProcess.stdin.write("pause\n");

  isPaused = !isPaused;

  updateStatus();
}
```

The variable:

```js
let isPaused = false;
```

keeps track of the current playback state.

The application does not use `SIGSTOP` or `SIGCONT` for pausing. VLC's own `pause` command is used instead.

---

# 8. Song Duration

The macOS `afinfo` command is used to obtain the duration of an audio file.

Node.js starts `afinfo` using:

```js
const afInfoProcess = spawn(
  "afinfo",
  [songPath]
);
```

The output is processed using:

```js
const duration =
  output.split("estimated duration: ")[1];

if (duration) {
  totalDuration =
    parseFloat(duration);
}
```

`totalDuration` stores the total length of the song.

---

# 9. Playback Progress

The application keeps track of:

```js
let elapsedDuration = 0;
let totalDuration = 0;
```

`elapsedDuration` represents the approximate amount of time the song has been playing.

The progress bar is generated using:

```text
[██████████░░░░░░░░░░] 50%
```

The progress bar is updated while a song is playing.

---

# 10. Volume Control

The volume can be changed using:

```text
+  Increase Volume
-  Decrease Volume
```

The volume value is stored in:

```js
let volume = 100;
```

The application keeps the volume within the supported range:

```js
if (volume > 200) {
  volume = 200;
}

if (volume < 0) {
  volume = 0;
}
```

The value is then sent to VLC:

```js
playerProcess.stdin.write(
  `volume ${volume}\n`
);
```

---

# 11. Shuffle

The `S` key randomly rearranges the playlist.

The Fisher-Yates style approach is used:

```js
for (
  let i = songMenu.length - 1;
  i > 0;
  i--
) {

  const randomIndex =
    Math.floor(Math.random() * (i + 1));

  const temp = songMenu[i];

  songMenu[i] =
    songMenu[randomIndex];

  songMenu[randomIndex] =
    temp;
}
```

After shuffling, the updated playlist is stored in:

```text
playlist.json
```

---

# 12. Playlist Persistence

The project uses a `playlist.json` file to store the playlist.

When the application starts, it checks whether the file exists:

```js
if (fs.existsSync("playlist.json")) {
  songMenu = JSON.parse(
    fs.readFileSync(
      "playlist.json",
      "utf8"
    )
  );
}
```

This allows the playlist order to remain available between program runs.

The `fs` module is used for reading and writing the playlist:

```js
const fs = require("fs");
```

---

# 13. Terminal UI

Instead of continuously printing new song lists, ANSI escape sequences are used to move the cursor and update specific sections of the terminal.

For example:

```js
process.stdout.write("\x1b[5;0H");
```

moves the cursor to the song-list area.

The following escape sequence clears the current line:

```js
process.stdout.write("\x1b[2K");
```

This allows the application to update the selected song and playback status without filling the terminal with repeated output.

---

# 14. Final Terminal Interface

The application provides a clean interface similar to:

```text
══════════════════════════════════════════════════
              🎵 WELCOME TO CLI MUSIC PLAYER 🕺🏼
══════════════════════════════════════════════════

> 1. Song 1
  2. Song 2
  3. Song 3
  4. Song 4
──────────────────────────────────────────────────
Status: No song playing
Progress: [░░░░░░░░░░░░░░░░░░░░] 0%
Time: 0 / 0 sec
Controls: ↑ ↓ Select | Enter Play | P Pause
N Next | B Back | +/- Volume
S Shuffle | Q Quit
```

The terminal is updated in-place instead of repeatedly printing the entire interface.

---

# 15. Project Flow

The overall flow of the application is:

```text
Start Application
       │
       ▼
Load playlist.json
       │
       ▼
Display Song List
       │
       ▼
Wait for Keyboard Input
       │
       ├───────────────┐
       │               │
       ▼               ▼
   ↑ / ↓            Enter
Select Song        Play Song
       │               │
       │               ▼
       │             VLC
       │               │
       └───────┬───────┘
               │
               ▼
          Playback
               │
       ┌───────┼────────┐
       │       │        │
       ▼       ▼        ▼
       P       N        B
     Pause    Next     Back
       │       │        │
       └───────┼────────┘
               │
               ▼
         Update CLI UI
               │
               ▼
          Continue Playing
```

---

# 16. Key Node.js Concepts Demonstrated

This project demonstrates the following concepts:

### 1. Child Processes

Using:

```js
spawn()
```

to run VLC and `afinfo`.

### 2. File System

Using:

```js
fs.existsSync()
fs.readFileSync()
fs.writeFileSync()
```

to manage `playlist.json`.

### 3. Event Handling

Using events such as:

```js
process.stdin.on("data", ...)
```

and:

```js
process.on("close", ...)
```

to respond to user input and process events.

### 4. Raw Terminal Input

The terminal is placed into raw mode:

```js
process.stdin.setRawMode(true);
```

This allows the application to detect individual key presses.

### 5. ANSI Escape Sequences

ANSI escape sequences are used to move the cursor and update specific areas of the terminal.

### 6. Arrays and Array Manipulation

The playlist is stored in an array:

```js
let songMenu = [];
```

and manipulated for selection and shuffling.

### 7. JSON

The playlist is persisted using a JSON file:

```text
playlist.json
```

---

# 17. Conclusion

The CLI Music Player started as a basic command-line application and was refined into a more interactive music player.

The project demonstrates how **Node.js can interact with external programs, process keyboard input, manipulate files, and control terminal output**.

The main learning outcomes from this project are:

* Working with Node.js child processes
* Communicating with external applications
* Handling keyboard input in raw terminal mode
* Managing application state
* Working with JSON files
* Using file-system operations
* Creating an interactive terminal interface
* Updating terminal content without continuous scrolling

The project provides a practical example of combining multiple Node.js concepts into a single command-line application.
