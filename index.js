
const { spawn } = require("child_process");
const fs = require("fs");
const { parseFile } = require("music-metadata");
const path = require("path");

let isPaused = false;
let playerProcess = undefined;

let elapsedDuration = 0;
let totalDuration = 0;

let userChoice = 0;
let volume = 100;
let playbackSpeed = 1.0;

let currentSongPath = "";

let repeatMode = "OFF";

let songMetadata = {
  title: "Loading...",
  artist: "Loading...",
  album: "Loading...",
  duration: 0,
};

let songMenu = [
  "songs/Avengers Doomsday New Trailer Breakdown_ [D7rqGuPYET0].mp3",
  "songs/Barsaat - Banjaare (Official Video).mp3",
  "songs/FULL MATCH_ Brock Lesnar vs. Roman Reigns vs. Samoa Joe vs. Braun Strowman_ SummerSlam 2017 [BS1-uFtE2QI] (1).mp3",
  "songs/suryanatta-the-shape-of-disorder-410788.mp3",
];

// ================= PLAYLIST =================
if (fs.existsSync("playlist.json")) {
  songMenu = JSON.parse(fs.readFileSync("playlist.json", "utf8"));
}

// ================= FORMAT DURATION =================
function formatDuration(seconds) {
  if (!seconds || seconds < 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

// ================= GET DURATION =================
function getTotalDuration(songPath) {
  const afInfoProcess = spawn("afinfo", [songPath]);
  let output = "";

  afInfoProcess.stdout.on("data", (data) => {
    output += data.toString();
  });

  afInfoProcess.on("close", () => {
    const duration = output.split("estimated duration: ")[1];

    if (duration) {
      totalDuration = parseFloat(duration);
    } else {
      totalDuration = 0;
    }

    updateScreen();
  });
}

// ================= GET SONG METADATA =================
async function getSongMetadata(songPath) {
  try {
    const metadata = await parseFile(songPath, {
      skipCovers: true,
    });

    if (currentSongPath !== songPath) {
      return;
    }

    songMetadata.title =
      metadata.common.title || path.basename(songPath);

    songMetadata.artist =
      metadata.common.artist || "Unknown Artist";

    songMetadata.album =
      metadata.common.album || "Unknown Album";

    songMetadata.duration = metadata.format.duration || 0;

    totalDuration = songMetadata.duration;

    updateScreen();
  } catch (error) {
    if (currentSongPath !== songPath) {
      return;
    }

    songMetadata.title = path.basename(songPath);
    songMetadata.artist = "Unknown Artist";
    songMetadata.album = "Unknown Album";
    songMetadata.duration = 0;

    totalDuration = 0;

    updateScreen("Could not read song metadata");
  }
}

// ================= PROGRESS BAR =================
function progressBar() {
  if (totalDuration <= 0) {
    return "[░░░░░░░░░░░░░░░░░░░░] 0%";
  }

  let percentage = (elapsedDuration / totalDuration) * 100;

  if (percentage > 100) {
    percentage = 100;
  }

  if (percentage < 0) {
    percentage = 0;
  }

  const totalBars = 20;
  const filledBars = Math.floor((percentage / 100) * totalBars);

  const filled = "█".repeat(filledBars);
  const empty = "░".repeat(totalBars - filledBars);

  return `[${filled}${empty}] ${percentage.toFixed(0)}%`;
}

// ================= SONG LIST =================
function showSongList() {
  songMenu.forEach((song, index) => {
    if (index === userChoice) {
      console.log(`> ${index + 1}. ${song}`);
    } else {
      console.log(`  ${index + 1}. ${song}`);
    }
  });
}

// ================= SONG METADATA =================
function showSongMetadata() {
  console.log("");
  console.log("--------------- NOW PLAYING ---------------");
  console.log(`Title:    ${songMetadata.title}`);
  console.log(`Artist:   ${songMetadata.artist}`);
  console.log(`Album:    ${songMetadata.album}`);
  console.log(`Duration: ${formatDuration(songMetadata.duration)}`);
}

// ================= STATUS =================
function showStatus(status = null) {
  if (status) {
    console.log(`Status: ${status}`);
  } else if (playerProcess === undefined) {
    console.log("Status: No song playing");
  } else if (isPaused) {
    console.log(`Status: Paused - ${songMenu[userChoice]}`);
  } else {
    console.log(`Status: Playing - ${songMenu[userChoice]}`);
  }

  console.log(`Progress: ${progressBar()}`);

  console.log(
    `Time: ${formatDuration(elapsedDuration)} / ${formatDuration(totalDuration)}`,
  );

  console.log(`Repeat Mode: ${repeatMode}`);
  console.log(`Playback Speed: ${playbackSpeed.toFixed(1)}x`);
}

// ================= CONTROLS =================
function showControls() {
  console.log("");
  console.log("Controls: ↑ ↓ Select | Enter Play | P Pause");
  console.log("N Next | B Back | R Restart | +/- Volume");
  console.log("M Repeat Mode | [ Slower | ] Faster");
  console.log("S Shuffle | Q Quit");
}

// ================= SCREEN =================
function updateScreen(status = null) {
  console.clear();

  console.log("══════════════════════════════════════════════════");
  console.log("              🎵 WELCOME TO CLI MUSIC PLAYER 🕺🏼");
  console.log("══════════════════════════════════════════════════");

  console.log("");

  showSongList();

  console.log("──────────────────────────────────────────────────");

  showSongMetadata();

  console.log("──────────────────────────────────────────────────");

  showStatus(status);

  showControls();
}

// ================= START VLC =================
function startVLC(songPath) {
  const currentProcess = spawn("vlc", [
    "--intf",
    "rc",
    "--quiet",
    "--play-and-exit",
    songPath,
  ]);

  playerProcess = currentProcess;

  if (currentProcess.stdin && currentProcess.stdin.writable) {
    currentProcess.stdin.write(`volume ${volume}\n`);
    currentProcess.stdin.write(`rate ${playbackSpeed}\n`);
  }

  currentProcess.on("error", () => {
    if (playerProcess !== currentProcess) {
      return;
    }

    playerProcess = undefined;
    updateScreen("Could not start VLC");
  });

  currentProcess.on("close", (code, signal) => {
    if (playerProcess !== currentProcess) {
      return;
    }

    playerProcess = undefined;

    if (code === 0 && signal === null) {
      handleSongFinished();
    } else {
      updateScreen("VLC stopped or exited with an error");
    }
  });
}

// ================= PLAY SONG =================
function playSong(index) {
  if (index < 0 || index >= songMenu.length) {
    return;
  }

  if (playerProcess !== undefined) {
    const oldProcess = playerProcess;
    playerProcess = undefined;
    oldProcess.kill("SIGKILL");
  }

  userChoice = index;

  elapsedDuration = 0;
  totalDuration = 0;
  isPaused = false;

  currentSongPath = songMenu[userChoice];

  songMetadata = {
    title: "Loading...",
    artist: "Loading...",
    album: "Loading...",
    duration: 0,
  };

  getSongMetadata(currentSongPath);

  startVLC(currentSongPath);

  updateScreen(`Playing - ${songMenu[userChoice]}`);
}

// ================= PAUSE / PLAY =================
function togglePause() {
  if (playerProcess === undefined) {
    return;
  }

  if (playerProcess.stdin.writable) {
    playerProcess.stdin.write("pause\n");
  }

  isPaused = !isPaused;

  updateScreen();
}

// ================= NEXT =================
function nextSong() {
  if (userChoice >= songMenu.length - 1) {
    return;
  }

  playSong(userChoice + 1);
}

// ================= BACK =================
function previousSong() {
  if (userChoice <= 0) {
    return;
  }

  playSong(userChoice - 1);
}

// ================= RESTART =================
function restartSong() {
  if (playerProcess === undefined) {
    return;
  }

  playSong(userChoice);
}

// ================= VOLUME =================
function changeVolume(amount) {
  volume += amount;

  if (volume > 200) {
    volume = 200;
  }

  if (volume < 0) {
    volume = 0;
  }

  if (playerProcess !== undefined && playerProcess.stdin.writable) {
    playerProcess.stdin.write(`volume ${volume}\n`);
  }

  updateScreen(`Volume: ${volume}`);
}

// ================= CHANGE SPEED =================
function changeSpeed(amount) {
  playbackSpeed = Math.round((playbackSpeed + amount) * 10) / 10;

  if (playbackSpeed > 2.0) {
    playbackSpeed = 2.0;
  }

  if (playbackSpeed < 0.5) {
    playbackSpeed = 0.5;
  }

  if (playerProcess !== undefined && playerProcess.stdin.writable) {
    playerProcess.stdin.write(`rate ${playbackSpeed}\n`);
  }

  updateScreen(`Playback Speed: ${playbackSpeed.toFixed(1)}x`);
}

// ================= SHUFFLE =================
function shuffleSongs() {
  for (let i = songMenu.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));

    const temp = songMenu[i];

    songMenu[i] = songMenu[randomIndex];
    songMenu[randomIndex] = temp;
  }

  fs.writeFileSync("playlist.json", JSON.stringify(songMenu, null, 2));

  userChoice = 0;

  updateScreen("Playlist shuffled");
}

// ================= CHANGE REPEAT MODE =================
function changeRepeatMode() {
  if (repeatMode === "OFF") {
    repeatMode = "ALL";
  } else if (repeatMode === "ALL") {
    repeatMode = "ONE";
  } else {
    repeatMode = "OFF";
  }

  updateScreen(`Repeat Mode: ${repeatMode}`);
}

// ================= SONG FINISHED =================
function handleSongFinished() {
  if (repeatMode === "ONE") {
    playSong(userChoice);
  } else if (userChoice < songMenu.length - 1) {
    playSong(userChoice + 1);
  } else if (repeatMode === "ALL") {
    playSong(0);
  } else {
    updateScreen("Playlist finished");
  }
}

// ================= KEYBOARD =================
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding("utf8");

process.stdin.on("data", (key) => {
  if (key === "q" || key === "\u0003") {
    if (playerProcess !== undefined) {
      playerProcess.kill("SIGKILL");
      playerProcess = undefined;
    }

    process.stdin.setRawMode(false);
    process.stdin.pause();

    console.clear();
    process.exit();
  }

  if (key === "\x1b[A") {
    if (userChoice > 0) {
      userChoice--;
      updateScreen();
    }

    return;
  }

  if (key === "\x1b[B") {
    if (userChoice < songMenu.length - 1) {
      userChoice++;
      updateScreen();
    }

    return;
  }

  if (key === "\r") {
    playSong(userChoice);
    return;
  }

  if (key === "p") {
    togglePause();
    return;
  }

  if (key === "n") {
    nextSong();
    return;
  }

  if (key === "b") {
    previousSong();
    return;
  }

  if (key === "r") {
    restartSong();
    return;
  }

  if (key === "m") {
    changeRepeatMode();
    return;
  }

  if (key === "]") {
    changeSpeed(0.1);
    return;
  }

  if (key === "[") {
    changeSpeed(-0.1);
    return;
  }

  if (key === "+" || key === "=") {
    changeVolume(10);
    return;
  }

  if (key === "-") {
    changeVolume(-10);
    return;
  }

  if (key === "s") {
    shuffleSongs();
    return;
  }
});

// ================= TIMER =================
setInterval(() => {
  if (isPaused === false && playerProcess !== undefined) {
    elapsedDuration += 0.5 * playbackSpeed;

    if (totalDuration > 0 && elapsedDuration > totalDuration) {
      elapsedDuration = totalDuration;
    }

    updateScreen();
  }
}, 500);

// ================= START =================
updateScreen();
