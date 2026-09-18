const { spawn } = require("child_process");
const fs = require("fs");

let isPaused = false;
let playerProcess = undefined;

let elapsedDuration = 0;
let totalDuration = 0;

let userChoice = 0;
let volume = 100;

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

    updateStatus();
  });
}

// ================= SONG LIST =================

function updateSongList() {
  process.stdout.write("\x1b[5;0H");

  songMenu.forEach((song, index) => {
    process.stdout.write("\x1b[2K");

    if (index === userChoice) {
      process.stdout.write(`> ${index + 1}. ${song}\n`);
    } else {
      process.stdout.write(`  ${index + 1}. ${song}\n`);
    }
  });
}

// ================= STATUS =================

function updateStatus(status = null) {
  const statusLine = songMenu.length + 6;

  process.stdout.write(`\x1b[${statusLine};0H`);

  process.stdout.write("\x1b[2K");

  if (status) {
    process.stdout.write(`Status: ${status}\n`);
  } else if (playerProcess === undefined) {
    process.stdout.write("Status: No song playing\n");
  } else if (isPaused) {
    process.stdout.write(`Status: Paused - ${songMenu[userChoice]}\n`);
  } else {
    process.stdout.write(`Status: Playing - ${songMenu[userChoice]}\n`);
  }

  process.stdout.write("\x1b[2K");

  process.stdout.write(`Progress: ${progressBar()}\n`);

  process.stdout.write("\x1b[2K");

  process.stdout.write(
    `Time: ${elapsedDuration.toFixed(0)} / ${totalDuration.toFixed(0)} sec\n`,
  );
}

// ================= SCREEN =================

function setupScreen() {
  console.clear();

  console.log("══════════════════════════════════════════════════");

  console.log("              🎵 WELCOME TO CLI MUSIC PLAYER 🕺🏼");

  console.log("══════════════════════════════════════════════════");

  console.log("");

  updateSongList();

  console.log("──────────────────────────────────────────────────");

  console.log("Status: No song playing");

  console.log("Progress: [░░░░░░░░░░░░░░░░░░░░] 0%");

  console.log("Time: 0 / 0 sec");

  console.log("Controls: ↑ ↓ Select | Enter Play | P Pause");

  console.log("N Next | B Back | +/- Volume");

  console.log("S Shuffle | Q Quit");
}

// ================= PLAY SONG =================

function playSong(index) {
  if (index < 0 || index >= songMenu.length) {
    return;
  }

  // Stop currently playing song

  if (playerProcess !== undefined) {
    playerProcess.kill("SIGKILL");

    playerProcess = undefined;
  }

  // Change selection

  userChoice = index;

  // Reset timing

  elapsedDuration = 0;
  totalDuration = 0;

  isPaused = false;

  // Update screen

  updateSongList();

  updateStatus(`Playing - ${songMenu[userChoice]}`);

  // Get new song duration

  getTotalDuration(songMenu[userChoice]);

  // Start new VLC

  playerProcess = spawn("vlc", [
    "--intf",
    "rc",
    "--quiet",
    songMenu[userChoice],
  ]);

  // Set volume

  playerProcess.stdin.write(`volume ${volume}\n`);
}

// ================= PAUSE / PLAY =================

function togglePause() {
  if (playerProcess === undefined) {
    return;
  }

  playerProcess.stdin.write("pause\n");

  isPaused = !isPaused;

  updateStatus();
}

// ================= NEXT =================

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

  updateStatus(`Playing - ${songMenu[userChoice]}`);

  getTotalDuration(songMenu[userChoice]);

  playerProcess = spawn("vlc", [
    "--intf",
    "rc",
    "--quiet",
    songMenu[userChoice],
  ]);

  playerProcess.stdin.write(`volume ${volume}\n`);
}

// ================= BACK =================

function previousSong() {
  if (userChoice <= 0) {
    return;
  }

  elapsedDuration = 0;

  userChoice -= 1;

  if (playerProcess !== undefined) {
    playerProcess.kill("SIGKILL");

    playerProcess = undefined;
  }

  totalDuration = 0;

  isPaused = false;

  updateSongList();

  updateStatus(`Playing - ${songMenu[userChoice]}`);

  getTotalDuration(songMenu[userChoice]);

  playerProcess = spawn("vlc", [
    "--intf",
    "rc",
    "--quiet",
    songMenu[userChoice],
  ]);

  playerProcess.stdin.write(`volume ${volume}\n`);
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

  updateStatus(`Volume: ${volume}`);
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

  updateSongList();

  updateStatus("Playlist shuffled");
}

// ================= SONG FINISHED =================

function handleSongFinished() {
  if (userChoice < songMenu.length - 1) {
    playSong(userChoice + 1);
  } else {
    playerProcess = undefined;

    updateStatus("Playlist finished");
  }
}

// ================= KEYBOARD =================

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding("utf8");

process.stdin.on("data", (key) => {
  // ================= QUIT =================

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

  // ================= UP =================

  if (key === "\x1b[A") {
    if (userChoice > 0) {
      userChoice--;

      updateSongList();
    }

    return;
  }

  // ================= DOWN =================

  if (key === "\x1b[B") {
    if (userChoice < songMenu.length - 1) {
      userChoice++;

      updateSongList();
    }

    return;
  }

  // ================= ENTER =================

  if (key === "\r") {
    playSong(userChoice);

    return;
  }

  // ================= PAUSE / PLAY =================

  if (key === "p") {
    togglePause();

    return;
  }

  // ================= NEXT =================

  if (key === "n") {
    nextSong();

    return;
  }

  // ================= BACK =================

  if (key === "b") {
    previousSong();

    return;
  }

  // ================= VOLUME UP =================

  if (key === "+" || key === "=") {
    changeVolume(10);

    return;
  }

  // ================= VOLUME DOWN =================

  if (key === "-") {
    changeVolume(-10);

    return;
  }

  // ================= SHUFFLE =================

  if (key === "s") {
    shuffleSongs();

    return;
  }
});

// ================= TIMER =================

setInterval(() => {
  if (isPaused === false && playerProcess !== undefined) {
    elapsedDuration += 0.5;

    if (totalDuration > 0 && elapsedDuration > totalDuration) {
      elapsedDuration = totalDuration;
    }

    updateStatus();
  }
}, 500);

// ================= START =================

setupScreen();
