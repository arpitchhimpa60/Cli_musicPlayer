
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
  // console.log(data)

  // Arrow keys send ANSI escape sequences starting with 0x1b
  if (data[0] === 0x1b) {
    if (data[1] === 0x5b) {

      // UP ARROW BUTTON
      // 0x41 represents the Up Arrow key
      if (data[2] === 0x41) {
        if (userChoice > 0) {
          userChoice -= 1;
          totalDuration = getTotalDuration(songMenu[userChoice]);
        }

        // console.log("Up Arrow Key")

      // DOWN ARROW BUTTON
      // 0x42 represents the Down Arrow key
      } else if (data[2] === 0x42) {
        if (userChoice < songMenu.length - 1) {
          userChoice += 1;
          totalDuration = getTotalDuration(songMenu[userChoice]);
        }

        // console.log("Down Arrow Key")
      }

      // Refresh the song list after changing selection
      listSong();
    }
  }

  // CTRL + C BUTTON
  // 0x03 represents Ctrl + C
  if (data[0] == 0x03) {
    playerProcess.kill("SIGKILL");
    console.log("user pressed Ctrl+C, exiting...");
    process.exit(0);
  }

  // ENTER BUTTON
  // 0x0d represents the Enter key
  if (data[0] == 0x0d) {
    // 0x0d ka matlab hai ki user ne Enter key press kiya hai
    console.log("> user selected:   " + songMenu[userChoice]);

    // Stop the currently playing song before starting a new one
    if (playerProcess != undefined) {
      playerProcess.kill("SIGKILL");
    }

    // Start VLC with the selected song
    playerProcess = spawn("vlc", ["--intf", "rc", songMenu[userChoice]]);

    // Get the duration of the selected song
    totalDuration = getTotalDuration(songMenu[userChoice]);

    // Make sure the new song starts in playing state
    isPaused = false;
  }

  // PLAY / PAUSE BUTTON
  // "p" is used to play or pause the current song
  if (data[0] == 0x70) {
    playerProcess.stdin.write("pause\n");

    console.log("user pressed Play/Pause button");

    // Toggle between paused and playing state
    isPaused = !isPaused;

    // SIGSTOP pauses the process and SIGCONT resumes it
    playerProcess.kill(isPaused ? "SIGSTOP" : "SIGCONT");
  }

  // NEXT BUTTON
  // "n" is used to move to the next song
  if (data[0] == 0x6e) {
    console.log("next");

    // Reset elapsed time for the new song
    elapsedDuration = 0;

    // Get duration of the next song
    totalDuration = getTotalDuration(songMenu[userChoice + 1]);

    // Stop the currently playing song
    playerProcess.kill("SIGINT");

    // Move to the next song
    userChoice += 1;

    // Start the next song using VLC
    playerProcess = spawn("vlc", ["--intf", "rc", songMenu[userChoice]]);

    // Start the new song in playing state
    isPaused = false;

    return;
  }

  // BACK / PREVIOUS BUTTON
  // "b" is used to move to the previous song
  if (data[0] == 0x62) {
    console.log("back");

    // Reset elapsed time for the new song
    elapsedDuration = 0;

    // Get duration of the previous song
    totalDuration = getTotalDuration(songMenu[userChoice - 1]);

    // Stop the currently playing song
    playerProcess.kill("SIGKILL");

    // Move to the previous song
    userChoice -= 1;

    // Start the previous song using VLC
    playerProcess = spawn("vlc", ["--intf", "rc", songMenu[userChoice]]);

    // Start the new song in playing state
    isPaused = false;

    return;
  }
});


// Function to display the song menu
function listSong() {
  // console.clear();
  // process.stdout.write('\x1b[2J')

  // Move cursor to the starting position of the song list
  process.stdout.write("\x1b[2;0H");

  songMenu.forEach((song, index) => {

    // Display ">" next to the currently selected song
    if (index === userChoice) {
      process.stdout.write(`> ${index + 1}. ${song}\n`);

      // console.log(`> ${index + 1}. ${song}`);
    } else {
      // Display other songs without the selection indicator
      process.stdout.write(`  ${index + 1}. ${song}\n`);

      // console.log(`  ${index + 1}. ${song}`);
    }
  });

  // Display current elapsed time and total song duration
  console.log(
    `Elapsed / Total Duration: ${elapsedDuration.toFixed(2)} / ${totalDuration}`,
  );
}


// Function to get the total duration of a song
function getTotalDuration(songPath) {
  // Implementation for getting total duration
  console.log("Getting total duration for: " + songPath);

  // Use macOS "afinfo" command to get information about the audio file
  const afInfoProcess = spawn("afinfo", [songPath]);

  afInfoProcess.stdout.on("data", (data) => {
    const rawoutput = data.toString();

    // console.log("afinfo output: " + rawoutput);

    // Extract the estimated duration from afinfo output
    totalDuration = Number(
      rawoutput.split("estimated duration: ")[1].split(".")[0],
    );

    // const durationMatch = output.match(/estimated duration: (\d+\.\d+)/);
    // if (durationMatch) {
    //   totalDuration = parseFloat(durationMatch[1]);
    //   console.log("Total Duration: " + totalDuration);
    // }
  });
}


// Update the screen and elapsed duration every 50 milliseconds
setInterval(() => {
  // Refresh the song list
  listSong();

  // Increase elapsed duration only when a song is playing
  if (isPaused === false && playerProcess != undefined) {
    elapsedDuration += 0.05;
  }
}, 50);

