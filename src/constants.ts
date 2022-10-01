export abstract class UISettings {
    // TODO: Base fade on screen width (so the edge is completely faded).
    public static searchHistoryLimit: number = 5
    // milliseconds, lower is faster
    public static drinkRevealSpeed = 140
    public static autoScrollDelay = 75
    // For letting the user know the search results are already present.
    public static backgroundFlashDuration = 300
    // Prevents some bugs when typing too quickly, like event listeners
    // not being prepared for the latest results.
    public static typingFetchDelay = 100

    public static easterEggDelay = 1000
    public static easterEggResetDelay = 750
    public static easterEggThreshold = 25
}