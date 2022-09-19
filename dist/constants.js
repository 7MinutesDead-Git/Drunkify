export class UISettings {
}
// TODO: Base fade on screen width (so the edge is completely faded).
UISettings.searchHistoryLimit = 5;
// milliseconds, lower is faster
UISettings.drinkRevealSpeed = 180;
UISettings.autoScrollDelay = 75;
// For letting the user know the search results are already present.
UISettings.backgroundFlashDuration = 300;
// Prevents some bugs when typing too quickly, like event listeners
// not being prepared for the latest results.
UISettings.typingFetchDelay = 100;
