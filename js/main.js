import Drink from "./drink.js"
import APIErrors from "./api-errors.js"
// -------------------------------------------------------------
// TODO: Continue to encapsulate as much of these variables as possible.
let searchButton
let clearButton
let searchInput
let cocktailList
let searchSection
let errors
let drinkButtons
let drinksOnDisplay
let loadingIcon
let suggestions
let fetchedDrinks = []

// TODO: Base fade on screen width (so the edge is completely faded).
const SEARCH_HISTORY_LIMIT = 5
const DRINK_REVEAL_SPEED = 180  // milliseconds, lower is faster
const AUTOSCROLL_DELAY = 75


// -------------------------------------------------------------
// Create a promise to resolve after a given delay in ms.
// We can use this for animation-like effects or arbitrary delays.
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// Setup user input event listeners.
function setupListeners() {
    clearButton.addEventListener('click', () => {
        clearScreen()
        clearInput()
        errors.clearErrors()
    })
    searchButton.addEventListener('click', () => {
        getDrinks()
    })
    searchInput.addEventListener('keypress', e => {
        if (e.key === 'Enter')
            getDrinks()
    })
    searchInput.addEventListener('focus', () => {
        console.log('focus')
        suggestions.classList.remove('hidden')
    })
    searchInput.addEventListener('focusout', () => {
        console.log('focusout')
        suggestions.classList.add('hidden')
    })
    window.onscroll = () => {
        toggleOpacityOnScroll(searchSection)
    }
}

// Setup click event listeners for the drink buttons.
function setupDrinkListeners() {
    // TODO: Refactor for event delegation in parent element rather than a bunch of event listeners here.
    drinkButtons = document.querySelectorAll('.drink')
    drinkButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            // Search by ingredient just by clicking on the ingredient link.
            if (e.target.tagName === 'A') {
                searchInput.value = e.target.innerText
                getDrinks(searchInput.value)
            }
            else
                toggleDrinkFocus(button)
        })
    })
}

// Show and hide an element when scrolling.
// ie: Hide the search bar when scrolling down, but reveal it when trying to scroll back up to it.
function toggleOpacityOnScroll(element) {
    if (window.oldScroll > window.scrollY) {
        element.classList.remove('hidden')
    }
    // Fixes the search bar hiding when result window length does not require scrolling.
    // Example: When focused drink details are longer than a full page height,
    // but the search results are not, so the search bar is lost when unfocusing from drink.
    else if (window.scrollY !== 0) {
        element.classList.add('hidden')
    }
    window.oldScroll = window.scrollY
}

// Enter and exit focus on a drink button.
// Also scrolls to the drink button's current location on focus and unfocus.
async function toggleDrinkFocus(drink) {
    drink.classList.toggle('viewing')
    // Adding an arbitrary pause seems to eliminate most occurences of scrolling
    // occasionally stopping abruptly when the user clicks on a drink button.
    // TODO: Find a more programmatic solution to this :P
    await wait(AUTOSCROLL_DELAY)
    drink.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
    })
}

// Sanitize the user's search input for more consistent searches.
function sanitizeInput(stringInput) {
    const trimmed = stringInput.trim()
    // Good to remove accidental excess spaces on input and replace with single intended space.
    const excessSpaceRemoved = trimmed.replace(/\s+/g, ' ')
    // Keep dashes since drink and ingredient names can contain them.
    const alphaNumericOnly = excessSpaceRemoved.replace(/[^a-z\d\s\-]/gi,'')
    // Case insensitivity means we can remain agnostic to the whims of the API we're fetching.
    return alphaNumericOnly.toLowerCase()
}

// Get the drinks from the API and display them on screen.
// Clears any previously existing drinks on screen.
async function getDrinks(choice = null) {
    clearScreen()
    choice ??= sanitizeInput(searchInput.value)

    // Store choice in localStorage to display as history.
    addSearchToLocalHistory(choice)

    const drinkURL = `https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${choice}`
    const ingredientURL = `https://www.thecocktaildb.com/api/json/v1/1/filter.php?i=${choice}`

    errors.clearErrors()
    toggleLoadingIcon()
    const nameResponse = fetchDrinksByName(drinkURL)
    const ingredientResponse = await fetchDrinksByIngredient(ingredientURL)
    fetchedDrinks.push(nameResponse, ingredientResponse)
    // We should wait for all drink API fetches to complete successfully, otherwise
    // we run into issues where drinks are rendered before the API has responded,
    // resulting in empty spaces and missing drinks or information.
    Promise.allSettled(fetchedDrinks)
        .then(() => {
            setupDrinkListeners()
            revealDrinks()
            errors.renderErrors()
    })
}

// Retrieve drink data by name and render them on the screen.
// Returns the response object for managing Promises.
async function fetchDrinksByName(url) {
    try {
        console.log('Fetching drinks by name...')
        const response = await fetch(url)
        errors.storeError(response.status)

        const data = await response.json()
        console.log("Drink by name data:")
        console.log(data)
        if (data['drinks']) {
            await renderDrinks(data)
        }
        else {
            errors.storeError(`Couldn't find "${searchInput.value}" :(`)
        }
        return response
    }
    catch (err) {
        console.log(`Caught this error: ${err}`)
        if (!window.navigator.onLine) {
            errors.storeError('You are offline. Are you still connected to the internet?')
        }
    }
}

// Retrieve drink data by ingredient, then search by ID with name function to get full drink data.
// Returns the response object for managing Promises.
async function fetchDrinksByIngredient(idURL) {
    try {
        console.log('Fetching drinks by ingredient...')
        const response = await fetch(idURL)
        console.log(`Ingredient response: ${response.status}`)
        errors.storeError(response.status)
        const data = await response.json()
        console.log(data)
        if (data['drinks']) {
            for (const drink of data['drinks']) {
                if (!(drinkExists(drink))) {
                    const idNumber = drink['idDrink']
                    const drinkURL = `https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${idNumber}`
                    // If we were to await fetchDrinks here, each iteration of this loop will wait. May be useful in the future.
                    // We should return this fetch response here to be used in collecting all Promises for
                    // Promise.all() to wait for in getDrinks().
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
function renderDrinks(data) {
    for (const drinkData of data['drinks']) {
        if (!(drinkExists(drinkData))) {
            drinksOnDisplay[drinkData['strDrink']] = true
            // Note: createDrinkBlock() was replaced by Drink class here.
            const drink = new Drink(drinkData)
            cocktailList.appendChild(drink.getDrinkElement())
        }
    }
}

// Toggle the loading icon visibility.
function toggleLoadingIcon() {
    loadingIcon.classList.toggle('visible')
}

// Gradually reveal each drink in the list.
async function revealDrinks() {
    toggleLoadingIcon()
    for (const drink of document.querySelectorAll('.drink')) {
        await wait(DRINK_REVEAL_SPEED)
        drink.style.opacity = '1'
    }
}

// Check if the given drink is already on the page.
function drinkExists(drink) {
    const exists = drink['strDrink'] in drinksOnDisplay
    if (exists)
        console.log(`${drink['strDrink']} already exists on the page. Skipping.`)
    return exists
}


// Reset the page to its empty state.
async function clearScreen() {
    fadeOutAllDrinks()
    await wait(DRINK_REVEAL_SPEED)
    cocktailList.innerHTML = ''
    drinksOnDisplay = {}
}

// Fade out all drinks on the page.
function fadeOutAllDrinks() {
    for (const drink of document.querySelectorAll('.drink')) {
        drink.style.boxShadow = 'none'
        drink.style.opacity = '0'
    }
}

// Add search term to local history.
function addSearchToLocalHistory(search) {
    search = sanitizeInput(search)
    const history = JSON.parse(localStorage.getItem('searchHistory')) || []
    if (!(history.includes(search)) && search.length > 0) {
        history.push(search)

        if (history.length > SEARCH_HISTORY_LIMIT) {
            history.shift()
        }
        localStorage.setItem('searchHistory', JSON.stringify(history))
    }
    updateSearchHistoryDisplay(history)
}

function updateSearchHistoryDisplay(historyArray) {
    suggestions.innerHTML = ''
    let currentOpacity = 1
    const opacityIncrement = 1 / historyArray.length

    for (const searchTerm of historyArray.reverse()) {
        const historyItem = document.createElement('li')
        historyItem.addEventListener('click', () => {
            searchInput.value = searchTerm
            getDrinks(searchInput.value)
        })
        historyItem.innerHTML = `> ${searchTerm}`
        historyItem.style.opacity = currentOpacity
        currentOpacity -= opacityIncrement
        suggestions.appendChild(historyItem)
    }
}

function getSearchHistory() {
    return JSON.parse(localStorage.getItem('searchHistory')) || []
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
        const input = document.querySelector('input')
        input.classList.add('hide-placeholder')
        await wait(fadeDelay)
        input.placeholder = tempSuggestionsList[index % tempSuggestionsList.length]
        input.classList.remove('hide-placeholder')
        index++
    }, cycleDelay)
}


// -------------------------------------------------------------
window.onload = () => {
    // Add new property to window object for the sake of keeping track of previous scroll position.
    window.oldScroll = window.scrollY
    searchButton = document.querySelector("#getCocktails")
    clearButton = document.querySelector("#clearCocktails")
    searchInput = document.querySelector("input")
    suggestions = document.querySelector(".suggestions")
    cocktailList = document.querySelector('.cocktails')
    searchSection = document.querySelector('.search-section')
    loadingIcon = document.querySelector('.lds-ellipsis')
    errors = new APIErrors(cocktailList)
    drinksOnDisplay = {}
    setupListeners()
    updateSearchHistoryDisplay(getSearchHistory())
    cycleSuggestions()
}