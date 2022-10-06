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
    public static debounceTimer = 250
    public static longLoadMessageDelay = 4000
    public static reallyLongLoadDelay = 12000

    public static clickAnimationDuration = 80

    public static easterEggDelay = 1000
    public static easterEggResetDelay = 750
    public static easterEggThreshold = 8
    public static rainbowColors = [
        "#f07878",
        "#f07892",
        "#f078b0",
        "#f078d6",
        "#de78f0",
        "#a678f0",
        "#a478f0",
        "#9278f0",
        "#8078f0",
        "#789cf0",
        "#78c4f0",
        "#78eaf0",
        "#78f0d6",
        "#78f0b2",
        "#78f08e",
        "#88f078",
        "#aaf078",
        "#d2f078",
        "#f0ec78",
        "#f0d078",
        "#f0b678",
        "#f09678",
        "#f08678"
    ]
}