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

// Enable raw mode so that keyboard buttons can be detected directly
process.stdin.setRawMode(true);

// Listen for keyboard input
process.stdin.on("data", (data) => {
  // Arrow keys send ANSI escape sequences starting with 0x1b
  if (data[0] === 0x1b) {
    if (data[1] === 0x5b) {
      // UP ARROW BUTTON
      // 0x41 represents the Up Arrow key
      if (data[2] === 0x41) {
        if (userChoice > 0) {
          userChoice -= 1;
          getTotalDuration(songMenu[userChoice]);
        }

        // DOWN ARROW BUTTON
        // 0x42 represents the Down Arrow key
      } else if (data[2] === 0x42) {
        if (userChoice < songMenu.length - 1) {
          userChoice += 1;
          getTotalDuration(songMenu[userChoice]);
        }
      }

      // Refresh the song list
      listSong();
    }
  }

  // CTRL + C BUTTON
  // 0x03 represents Ctrl + C
  if (data[0] == 0x03) {
    if (playerProcess != undefined) {
      playerProcess.kill("SIGKILL");
    }

    console.log("user pressed Ctrl+C, exiting...");
    process.exit(0);
  }

  // ENTER BUTTON
  // 0x0d represents the Enter key
  if (data[0] == 0x0d) {
    console.log("> user selected:   " + songMenu[userChoice]);

    // Stop the currently playing song
    if (playerProcess != undefined) {
      playerProcess.kill("SIGKILL");
    }

    // Start VLC with the selected song
    playerProcess = spawn("vlc", ["--intf", "rc", songMenu[userChoice]]);

    // Reset elapsed duration
    elapsedDuration = 0;

    // Get duration of selected song
    getTotalDuration(songMenu[userChoice]);

    // New song starts playing
    isPaused = false;
  }

  // PLAY / PAUSE BUTTON
  // "p" is used to play or pause the current song
  if (data[0] == 0x70) {
    // Do nothing if no song is currently running
    if (playerProcess == undefined) {
      return;
    }

    // Send pause command directly to VLC
    playerProcess.stdin.write("pause\n");

    // Toggle our own pause state
    isPaused = !isPaused;

    console.log(isPaused ? "user paused the song" : "user resumed the song");
  }

  // NEXT BUTTON
  // "n" is used to move to the next song
  if (data[0] == 0x6e) {
    // Only move if we are NOT already at the last song
    if (userChoice < songMenu.length - 1) {
      console.log("next");

      // Reset elapsed time
      elapsedDuration = 0;

      // Move to next song
      userChoice += 1;

      // Get duration of next song
      getTotalDuration(songMenu[userChoice]);

      // Stop currently playing song
      if (playerProcess != undefined) {
        playerProcess.kill("SIGINT");
      }

      // Start next song
      playerProcess = spawn("vlc", ["--intf", "rc", songMenu[userChoice]]);

      // New song starts playing
      isPaused = false;
    }

    return;
  }

  // BACK / PREVIOUS BUTTON
  // "b" is used to move to the previous song
  if (data[0] == 0x62) {
    // Only move if we are NOT already at the first song
    if (userChoice > 0) {
      console.log("back");

      // Reset elapsed time
      elapsedDuration = 0;

      // Move to previous song
      userChoice -= 1;

      // Get duration of previous song
      getTotalDuration(songMenu[userChoice]);

      // Stop currently playing song
      if (playerProcess != undefined) {
        playerProcess.kill("SIGKILL");
      }

      // Start previous song
      playerProcess = spawn("vlc", ["--intf", "rc", songMenu[userChoice]]);

      // New song starts playing
      isPaused = false;
    }

    return;
  }
});

// Function to display the song menu
function listSong() {
  // Move cursor to the starting position of the song list
  process.stdout.write("\x1b[2;0H");

  songMenu.forEach((song, index) => {
    // Display ">" next to the currently selected song
    if (index === userChoice) {
      process.stdout.write(`> ${index + 1}. ${song}\n`);
    } else {
      process.stdout.write(`  ${index + 1}. ${song}\n`);
    }
  });

  // Display current elapsed time and total song duration
  console.log(
    `Elapsed / Total Duration: ${elapsedDuration.toFixed(2)} / ${totalDuration}`,
  );

  // Display progress bar
  console.log(`Progress: ${progressBar()}`);
}

// Function to create the progress bar
function progressBar() {
  // If duration is not available yet
  if (totalDuration <= 0) {
    return "[░░░░░░░░░░░░░░░░░░░░] 0%";
  }

  // Calculate percentage
  let percentage = (elapsedDuration / totalDuration) * 100;

  // Don't allow percentage to go above 100
  if (percentage > 100) {
    percentage = 100;
  }

  // Total number of blocks in the progress bar
  const totalBars = 20;

  // Calculate how many blocks should be filled
  const filledBars = Math.floor((percentage / 100) * totalBars);

  // Create filled and empty sections
  const filled = "█".repeat(filledBars);
  const empty = "░".repeat(totalBars - filledBars);

  // Return the complete progress bar
  return `[${filled}${empty}] ${percentage.toFixed(0)}%`;
}

// Function to get the total duration of a song
function getTotalDuration(songPath) {
  console.log("Getting total duration for: " + songPath);

  // Use macOS "afinfo" command
  const afInfoProcess = spawn("afinfo", [songPath]);

  afInfoProcess.stdout.on("data", (data) => {
    const rawoutput = data.toString();

    // Get the part after "estimated duration:"
    const duration = rawoutput.split("estimated duration: ")[1];

    if (duration) {
      // Convert the duration into a number
      totalDuration = parseFloat(duration);
    }
  });
}

// Update the screen and elapsed duration every 50 milliseconds
setInterval(() => {
  // Refresh the song list
  listSong();

  // Increase elapsed time only when a song is playing
  if (isPaused === false && playerProcess != undefined) {
    elapsedDuration += 0.05;
  }
}, 50);
