import Drink from "./drink.js"
import APIErrors from "./api-errors.js"
import { UISettings } from "./constants.js"
import {DrinkData, DrinksOnDisplay} from "./interfaces.js"

// -------------------------------------------------------------
// TODO: Encapsulate as much of these type declarations as possible...
// Also really want to try to avoid globals.
let previousScroll: number = 0
let searchButton: HTMLButtonElement
let clearButton: HTMLButtonElement
let searchInput: HTMLInputElement
let cocktailList: HTMLUListElement
// When it comes to <section> or <article> or other semantic HTML5 tags, there is no particularly specific type.
// Everything at that point is an HTMLElement, which inherits from Element.
let searchSection: HTMLElement
let searchChoice: string
let errors: APIErrors
let drinkButtons: Element[]
let drinksOnDisplay: DrinksOnDisplay
let loadingIcon: HTMLButtonElement
let suggestions: HTMLUListElement
let fetchedDrinks: Promise<Response | undefined>[]
// Timer to prevent excessive API calls while typing in the search input.
let typingSearchTimer = setTimeout(() => {}, 0)
let requestURL = new URL(window.location.href)
let requestParams = new URLSearchParams(requestURL.searchParams)


// -------------------------------------------------------------
// Create a promise to resolve after a given delay in ms.
// We can use this for animation-like effects or arbitrary delays.
function wait(ms: number): Promise<Function> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// Setup user input event listeners.
function setupListeners() {
    clearButton.addEventListener('click', () => {
        clearScreen()
        clearInput()
        updateBrowserHistoryAndURL('')
        errors.clearErrors()
    })

    searchButton.addEventListener('click', () => {
        suggestions.classList.add('hidden')
        getDrinks()
    })

    searchInput.addEventListener('keyup', (e) => {
        clearTimeout(typingSearchTimer)
        // Since addEventListener results in an Event type and not a KeyboardEvent type,
        // we need to <cast>it (type assertion in ts terms).
        const keyboardEvent = <KeyboardEvent>e
        if (keyboardEvent.key === 'Enter') {
            suggestions.classList.add('hidden')
        }
        // Searching as we type is actually GREAT.
        typingSearchTimer = setTimeout(() => {
            getDrinks()
        }, UISettings.typingFetchDelay)
    })

    searchInput.addEventListener('focus', () => {
        suggestions.classList.remove('hidden')
    })

    searchInput.addEventListener('focusout', () => {
        suggestions.classList.add('hidden')
    })

    window.onscroll = () => {
        toggleOpacityOnScroll(searchSection)
    }
    // Allows faded out older suggestions to be more legible when mousing over.
    suggestions.addEventListener('mouseover', (e) => {
        const targetElement = <HTMLElement>e.target
        if (targetElement.tagName === "LI") {
            targetElement.style.opacity = "1"
        }
    })
    // Resets opacity when mouse leaves any one suggestion so fade is re-applied.
    // This is in lieu of keeping track of initial opacity state for each li element.
    // This is less efficient, but the array is tiny.
    suggestions.addEventListener('mouseout', (e) => {
        // We can typecast (technically type assertion) the event target to an HTMLLIElement
        // because we know it should be an LI element.
        const targetElement = <HTMLElement>e.target
        if (targetElement.tagName === "LI") {
            setSearchHistoryDisplayOpacity()
        }
    })
}

// Setup click event listeners for the drink buttons.
function setupDrinkListeners(): void {
    // TODO: Refactor for event delegation in parent element rather than a bunch of event listeners here.
    drinkButtons = [...document.querySelectorAll('.drink')]
    drinkButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const targetElement = <HTMLElement>e.target
            // Search by ingredient just by clicking on the ingredient link.
            if (targetElement.tagName === 'A') {
                searchInput.value = targetElement.innerText
                getDrinks(searchInput.value)
            }
            toggleDrinkFocus(<HTMLElement>button)
        })
    })
}

// Show and hide an element when scrolling.
// ie: Hide the search bar when scrolling down, but reveal it when trying to scroll back up to it.
function toggleOpacityOnScroll(element: Element): void {
    if (previousScroll > window.scrollY) {
        element.classList.remove('hidden')
    }
        // Fixes the search bar hiding when result window length does not require scrolling.
        // Example: When focused drink details are longer than a full page height,
    // but the search results are not, so the search bar is lost when unfocusing from drink.
    else if (window.scrollY !== 0) {
        element.classList.add('hidden')
    }
    previousScroll = window.scrollY
}

// Enter and exit focus on a drink button.
// Focusing a drink includes scrolling to and from drink.
async function toggleDrinkFocus(drink: HTMLElement) {
    drink.classList.toggle('viewing')

    // If the user has made a selection, then it's likely their search term is useful,
    // and thus should be added to the search history.
    addSearchToLocalHistory(searchChoice)

    // If we're focused on a drink, we want to set the URL to reflect the current drink
    // so this drink can be shared.
    if (drink.classList.contains('viewing')) {
        requestParams.set('focus', 'true')
        const drinkHeader = drink.querySelector('h3')
        if (!drinkHeader) {
            console.error("Drink rendered without a header!", drink)
            throw new Error("Drink rendered without a header. Check the Drink class!")
        }
        updateBrowserHistoryAndURL(drinkHeader.innerText)
    }
        // But since this is a toggle, if we're dropping focus, we should go back to the
    // search term so overall searches can be shared too.
    else {
        requestParams.delete('focus')
        updateBrowserHistoryAndURL(searchInput.value)
    }
    // TODO: Find a more programmatic solution to do the following :P
    // Adding an arbitrary pause seems to eliminate most occurences of scrolling
    // occasionally stopping abruptly when the user clicks on a drink button.
    await wait(UISettings.autoScrollDelay)
    drink.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
    })
}

// Sanitize the user's search input for more consistent searches.
function sanitizeInput(input: string) {
    const trimmed = input.trim()
    // Good to remove accidental excess spaces on input and replace with single intended space.
    const excessSpaceRemoved = trimmed.replace(/\s+/g, ' ')
    // Keep dashes since drink and ingredient names can contain them.
    const alphaNumericOnly = excessSpaceRemoved.replace(/[^a-z\d\s\-]/gi,'')
    // Case insensitivity means we can remain agnostic to the whims of the API we're fetching.
    return alphaNumericOnly.toLowerCase()
}

function updateBrowserHistoryAndURL(searchTerm: string) {
    requestParams.set('drink', searchTerm)
    // set page url to reflect the search params
    requestURL.search = requestParams.toString()
    window.history.pushState({}, '', requestURL.href)
}

// Get the drinks from the API and display them on screen.
// Clears any previously existing drinks on screen.
async function getDrinks(choice: string | null = null) {
    choice ??= sanitizeInput(searchInput.value)
    // Update global variable so this state can be used elsewhere.
    searchChoice = choice

    // If search term is identical to last, don't re-fetch.
    if (choice === requestParams.get('drink') && fetchedDrinks.length > 0) {
        flashScreen()
        return
    }
    clearScreen()
    updateBrowserHistoryAndURL(choice)

    const drinkURL = `https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${choice}`
    const ingredientURL = `https://www.thecocktaildb.com/api/json/v1/1/filter.php?i=${choice}`

    errors.clearErrors()
    toggleLoadingIcon()
    // Removed awaits here, so that fetchedDrinks array can be all pending Promises, rather than a
    // mix of Promises and Responses. Might break?
    const nameResponse = fetchDrinksByName(drinkURL)
    const ingredientResponse = fetchDrinksByIngredient(ingredientURL)
    fetchedDrinks.push(nameResponse, ingredientResponse)
    // We should wait for all drink API fetches to complete successfully, otherwise
    // we run into issues where drinks are rendered before the API has responded,
    // resulting in empty spaces and missing drinks or information.
    await Promise.allSettled(fetchedDrinks)
    setupDrinkListeners()
    await revealDrinks()
    errors.renderErrors()
}

// Momentarily flash the screen to indicate a successful search.
function flashScreen() {
    document.body.classList.add('flash')
    setTimeout(() => {
        document.body.classList.remove('flash')
    }, UISettings.backgroundFlashDuration)
}

// Retrieve drink data by name and render them on the screen.
// Returns the response object for managing Promises.
async function fetchDrinksByName(url: string): Promise<Response | undefined> {
    try {
        const response = await fetch(url)
        errors.storeError(response.status.toString())

        const data = await response.json()
        console.log("🦩Fetched drinks by name:🦩", data)
        if (data['drinks']) {
            renderDrinks(data)
        }
        else {
            errors.storeError(`Couldn't find "${searchInput.value}" :(`)
        }
        return response
    }
    catch (err) {
        if (!window.navigator.onLine) {
            errors.storeError('You are offline. Are you still connected to the internet?')
        }
    }
}

// Retrieve drink data by ingredient, then search by ID with name function to get full drink data.
// Returns the response object for managing Promises.
async function fetchDrinksByIngredient(idURL: string) {
    try {
        const response = await fetch(idURL)
        errors.storeError(response.status.toString())
        const data = await response.json()

        if (data['drinks']) {
            for (const drink of data['drinks']) {
                if (!(drinkExists(drink))) {
                    const idNumber = drink['idDrink']
                    const drinkURL = `https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${idNumber}`
                    // If we were to await fetchDrinks here, each iteration of this loop will wait making things slow.
                    // We should return this Promise here to be used in collecting all Promises for
                    // Promise.all(), to wait for in getDrinks().
                    fetchedDrinks.push(fetchDrinksByName(drinkURL))
                }
            }
        }
        else {
            errors.storeError(`Couldn't find "${searchInput.value}" :(`)
        }
        return response
    }
    catch (err) {
        console.log(`Caught this error: ${err}`)
    }
}

// Create each drink block and append them to the cocktail list to be displayed.
// TODO: Make an interface for json api response.
function renderDrinks(data: { [x: string]: any }) {
    for (const drinkData of data['drinks']) {
        console.log("Drink data from renderDrinks():", drinkData)
        if (!(drinkExists(drinkData))) {
            drinksOnDisplay[drinkData['strDrink']] = true
            // Note: createDrinkBlock() was replaced by Drink class here.
            const drink = new Drink(drinkData)
            console.log("🦩Rendering drink:🦩", drink)

            cocktailList.appendChild(drink.getDrinkElement())
            console.log("🦩New cocktail list:🦩", cocktailList)
        }
    }
}

// Toggle the loading icon visibility.
function toggleLoadingIcon() {
    loadingIcon.classList.toggle('visible')
}

// Gradually reveal each drink in the list.
async function revealDrinks(): Promise<void> {
    toggleLoadingIcon()
    for (const drink of document.querySelectorAll('.drink') as NodeListOf<HTMLElement>) {
        await wait(UISettings.drinkRevealSpeed)
        drink.style.opacity = '1'
    }
}

// Check if the given drink is already on the page.
function drinkExists(drink: DrinkData): boolean {
    const exists = drink['strDrink']! in drinksOnDisplay

    if (exists) {
        console.log(`${drink['strDrink']} already exists on the page. Skipping.`)
    }
    return exists
}


// Reset the page to its empty state.
function clearScreen() {
    cocktailList.innerHTML = ''
    drinksOnDisplay = {}
}


// Add search term to local history.
function addSearchToLocalHistory(search: string) {
    search = sanitizeInput(search)
    const history: string[] = getSearchHistory()

    if (!(history.includes(search)) && search.length > 0) {
        history.push(search)

        if (history.length > UISettings.searchHistoryLimit) {
            history.shift()
        }
        localStorage.setItem('searchHistory', JSON.stringify(history))
    }
    updateSearchHistoryDisplay(history)
}

function updateSearchHistoryDisplay(historyArray: string[]) {
    suggestions.innerHTML = ''

    for (const searchTerm of historyArray.reverse()) {
        const historyItem = document.createElement('li')
        historyItem.addEventListener('click', () => {
            searchInput.value = searchTerm
            getDrinks(searchInput.value)
        })
        historyItem.innerHTML = `> ${searchTerm}`
        suggestions.appendChild(historyItem)
    }
    setSearchHistoryDisplayOpacity()
}

// Creates a smooth fade out of the older search history display elements.
function setSearchHistoryDisplayOpacity() {
    const historyArray = suggestions.querySelectorAll('li')
    let currentOpacity = 1
    const opacityIncrement = 1 / historyArray.length

    for (const historyItem of historyArray) {
        historyItem.style.opacity = currentOpacity.toString()
        currentOpacity -= opacityIncrement
    }
}

function getSearchHistory() {
    return JSON.parse(localStorage.getItem('searchHistory') ?? '[]')
}

function clearInput() {
    searchInput.value = ''
}

// Cycle through suggestions on the input placeholder text.
function cycleSuggestions() {
    const cycleDelay = 3000
    const fadeDelay = 500
    // Cycles through placeholder suggestions.
    const tempSuggestionsList = [
        'coffee',
        'tequila',
        'banana milk shake',
        'espresso martini',
        'grenadine',
        'salt',
        'amaretto sunrise',
        'margarita',
        'orange juice',
        'strawberries',
        'daiquiri'
    ]

    let index = 0
    setInterval(async () => {
        const input = document.querySelector('input')!
        input.classList.add('hide-placeholder')
        await wait(fadeDelay)
        input.placeholder = tempSuggestionsList[index % tempSuggestionsList.length]
        input.classList.remove('hide-placeholder')
        index++
    }, cycleDelay)
}

// Called when a user visits a direct link to a drink, likely from sharing or
// bookmarking. Ensures asynchronous order of execution where the drink is fetched,
// then the element is created, then the focus logic runs once the image has loaded.
async function focusDrinkFromUrlRequest() {
    const searchTerm = requestParams.get('drink')
    if (searchTerm) {
        searchInput.value = searchTerm
        await getDrinks(searchTerm)
        // This allows us to share specific drinks directly from the URL,
        // so the drink is focused automatically (once fetched above).
        if (requestParams.get('focus')) {
            const drink = await getFocusedDrink()
            await getFocusedDrinkHeader(drink)
            await toggleDrinkFocus(drink)
        }
    }
}

// Returns a promise that resolves once the focused drink element is present.
// This is necessary for sharing drinks directly, where we want to focus immediately
// after an initial query from the URL.
// TODO: Check to ensure type assertion of return type works for both resolve cases.
function getFocusedDrink(): Promise<HTMLElement> {
    return new Promise((resolve) => {
        const drink = <HTMLElement>document.querySelector('.drink')
        if (drink) {
            resolve(drink)
        }
        else {
            setTimeout(() => {
                resolve(getFocusedDrink())
            }, 100)
        }
    })
}

// Returns a promise that resolves once the focused drink element is finished loa  ding,
// i.e. the image has completed loading and the the loading class is removed.
// This is necessary for sharing drinks directly, where we want to focus immediately
// after an initial query from the URL.
function getFocusedDrinkHeader(drink: HTMLElement) {
    return new Promise((resolve) => {
        const drinkHeader = drink.querySelector('h3')
        if (drinkHeader && !drinkHeader.classList.contains('loading')) {
            resolve(drinkHeader)
        }
        else {
            setTimeout(() => {
                resolve(getFocusedDrinkHeader(drink))
            }, 100)
        }
    })
}

// Checks to see if any crucial HTML elements are missing. Fail process gracefully if so.
function nullCheck(...elements: HTMLElement[]) {
    for (const element of elements) {
        if (!element) {
            console.error("Null or missing element: ", { element })
            throw new Error(`Element is null. Check your HTML!`)
        }
    }
}


// -------------------------------------------------------------
// TODO: Don't think onload is necessary anymore when we can instead defer the script.
window.onload = async () => {
    previousScroll = window.scrollY
    // https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-0.html#non-null-assertion-operator
    // All elements should be present as these are defined in the HTML, therefore querySelector should never return null.
    searchButton = document.querySelector("#getCocktails")!
    clearButton = document.querySelector("#clearCocktails")!
    searchInput = document.querySelector("input")!
    suggestions = document.querySelector(".suggestions")!
    cocktailList = document.querySelector('.cocktails')!
    searchSection = document.querySelector('.search-section')!
    loadingIcon = document.querySelector('.lds-ellipsis')!
    // So we'll throw an error if that happens (woops lol).
    nullCheck(searchButton, clearButton, searchInput, suggestions, cocktailList, searchSection, loadingIcon)

    errors = new APIErrors(cocktailList)
    fetchedDrinks = []
    drinksOnDisplay = {}
    setupListeners()
    updateSearchHistoryDisplay(getSearchHistory())
    cycleSuggestions()
    await focusDrinkFromUrlRequest()
}