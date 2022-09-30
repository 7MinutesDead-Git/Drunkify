export class UISettings {
}
// TODO: Base fade on screen width (so the edge is completely faded).
UISettings.searchHistoryLimit = 5;
// milliseconds, lower is faster
UISettings.drinkRevealSpeed = 140;
UISettings.autoScrollDelay = 75;
// For letting the user know the search results are already present.
UISettings.backgroundFlashDuration = 300;
// Prevents some bugs when typing too quickly, like event listeners
// not being prepared for the latest results.
UISettings.typingFetchDelay = 100;
UISettings.easterEggDelay = 2000;
UISettings.easterEggResetDelay = 750;
UISettings.easterEggThreshold = 17;
