const { spawn } = require("child_process");
const fs = require("fs");

let isPaused = false;
let playerProcess = undefined;

const songMenu = [
  "songs/Anuv Jain X Lost Stories - Arz Kiya Hai (Official Video) _ Coke Studio Bharat.mp3",
  "songs/Barsaat - Banjaare (Official Video).mp3",
  "songs/Boom Shaka (Official Music Video) _ KR$NA _  Dhanda Nyoliwala.mp3",
  "songs/Dhanda Nyoliwala - Not Guilty (Official Music Video).mp3",
  "songs/KALYANI (with Shreya Ghoshal) OFFICIAL MUSIC VIDEO _ ARJN _ KDS _ FIFTY4 _ RONN _ SHREYA GHOSHAL _.mp3",
];

let elapsedDuration = 0;
let totalDuration = 0;

let userChoice = 0;


// Enable raw mode
process.stdin.setRawMode(true);


// Listen for keyboard input
process.stdin.on("data", (data) => {

  // =========================
  // UP / DOWN ARROW
  // =========================

  if (data[0] === 0x1b) {

    if (data[1] === 0x5b) {

      // UP ARROW
      if (data[2] === 0x41) {

        if (userChoice > 0) {
          userChoice -= 1;

          getTotalDuration(songMenu[userChoice]);
        }

      // DOWN ARROW
      } else if (data[2] === 0x42) {

        if (userChoice < songMenu.length - 1) {
          userChoice += 1;

          getTotalDuration(songMenu[userChoice]);
        }
      }

      listSong();
    }
  }


  // =========================
  // CTRL + C
  // =========================

  if (data[0] === 0x03) {

    if (playerProcess != undefined) {
      playerProcess.kill("SIGKILL");
    }

    console.log("user pressed Ctrl+C, exiting...");

    process.exit(0);
  }


  // =========================
  // ENTER
  // =========================

  if (data[0] === 0x0d) {

    console.log(
      "> user selected: " + songMenu[userChoice]
    );

    // Stop currently playing song
    if (playerProcess != undefined) {
      playerProcess.kill("SIGKILL");
    }

    // Start VLC
    playerProcess = spawn(
      "vlc",
      [
        "--intf",
        "rc",
        songMenu[userChoice]
      ]
    );

    // Get duration
    getTotalDuration(songMenu[userChoice]);

    // Reset playback state
    elapsedDuration = 0;
    isPaused = false;
  }


  // =========================
  // PLAY / PAUSE
  // =========================

  if (data[0] === 0x70) {

    if (playerProcess == undefined) {
      console.log("No song is currently playing.");
      return;
    }

    // Tell VLC to pause/resume
    playerProcess.stdin.write("pause\n");

    // Keep track of state for timer
    isPaused = !isPaused;

    console.log(
      isPaused
        ? "Song paused"
        : "Song resumed"
    );
  }


  // =========================
  // NEXT
  // =========================

  if (data[0] === 0x6e) {

    console.log("next");

    // Don't go beyond last song
    if (userChoice >= songMenu.length - 1) {

      console.log("Already at the last song.");

      return;
    }

    // Stop current song
    if (playerProcess != undefined) {
      playerProcess.kill("SIGKILL");
    }

    // Move to next song
    userChoice += 1;

    // Reset elapsed time
    elapsedDuration = 0;

    // Get duration
    getTotalDuration(songMenu[userChoice]);

    // Start next song
    playerProcess = spawn(
      "vlc",
      [
        "--intf",
        "rc",
        songMenu[userChoice]
      ]
    );

    // New song starts playing
    isPaused = false;

    listSong();

    return;
  }


  // =========================
  // BACK / PREVIOUS
  // =========================

  if (data[0] === 0x62) {

    console.log("back");

    // Don't go before first song
    if (userChoice <= 0) {

      console.log("Already at the first song.");

      return;
    }

    // Stop current song
    if (playerProcess != undefined) {
      playerProcess.kill("SIGKILL");
    }

    // Move to previous song
    userChoice -= 1;

    // Reset elapsed time
    elapsedDuration = 0;

    // Get duration
    getTotalDuration(songMenu[userChoice]);

    // Start previous song
    playerProcess = spawn(
      "vlc",
      [
        "--intf",
        "rc",
        songMenu[userChoice]
      ]
    );

    // New song starts playing
    isPaused = false;

    listSong();

    return;
  }
});


// =========================
// DISPLAY SONG MENU
// =========================

function listSong() {

  // Move cursor to starting position
  process.stdout.write("\x1b[2;0H");


  songMenu.forEach((song, index) => {

    if (index === userChoice) {

      process.stdout.write(
        `> ${index + 1}. ${song}\n`
      );

    } else {

      process.stdout.write(
        `  ${index + 1}. ${song}\n`
      );
    }
  });


  console.log(
    `Elapsed / Total Duration: ${elapsedDuration.toFixed(2)} / ${totalDuration}`
  );


  // Display progress bar
  console.log(progressBar());
}


// =========================
// PROGRESS BAR
// =========================

function progressBar() {

  if (totalDuration <= 0) {
    return "[░░░░░░░░░░░░░░░░░░░░] 0%";
  }


  let percentage =
    (elapsedDuration / totalDuration) * 100;


  // Keep percentage between 0 and 100
  if (percentage < 0) {
    percentage = 0;
  }

  if (percentage > 100) {
    percentage = 100;
  }


  const totalBars = 20;


  const filledBars =
    Math.floor(
      (percentage / 100) * totalBars
    );


  const filled =
    "█".repeat(filledBars);


  const empty =
    "░".repeat(
      totalBars - filledBars
    );


  return `[${filled}${empty}] ${percentage.toFixed(0)}%`;
}


// =========================
// GET SONG DURATION
// =========================

function getTotalDuration(songPath) {

  console.log(
    "Getting total duration for: " + songPath
  );


  const afInfoProcess = spawn(
    "afinfo",
    [songPath]
  );


  afInfoProcess.stdout.on("data", (data) => {

    const rawoutput = data.toString();


    const duration =
      rawoutput.split("estimated duration: ")[1];


    totalDuration = parseFloat(duration);
  });
}


// =========================
// UPDATE SCREEN
// =========================

setInterval(() => {

  // Refresh song list and progress bar
  listSong();


  // Increase elapsed time only when playing
  if (
    isPaused === false &&
    playerProcess != undefined
  ) {

    elapsedDuration += 0.05;
  }

}, 50);