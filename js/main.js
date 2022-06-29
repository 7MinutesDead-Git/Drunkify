// -------------------------------------------------------------
// Variables.
// TODO: Continue to encapsulate as much of these variables as possible.
// -------------------------------------------------------------
let searchButton
let clearButton
let input
let cocktailList
let searchBar
let errors
let drinkButtons
let drinksOnDisplay
let loadingIcon

let fetchedDrinks = []

// -------------------------------------------------------------
// Classes.
// -------------------------------------------------------------

class Drink {
    constructor(apiData) {
        this.data = apiData
        this.instructionsData = apiData['strInstructions']
        this.ingredientsElement = getIngredients(apiData)

        this.drinkListItem = document.createElement('li')
        this.nameHeader = document.createElement('h3')
        this.instructionsDiv = document.createElement('div')
        this.imageElement = document.createElement('img')
        this.heart = this.setupHeart()
        // TODO: Check localStorage if drink matches a favorite.
        this.favorited = false

        this.childElements = [
            this.imageElement,
            this.nameHeader,
            // this.heart,
            this.ingredientsElement,
            this.instructionsDiv
        ]
        this.setupDrink()
    }
    getFormattedInstructions() {
        let result = ''
        if (this.instructionsData) {
            const array = this.instructionsData.split('.')
            for (const instruction of array)
                if (instruction.length > 0)
                    result += `<p>${instruction}.</p>`
        }
        return result
    }
    addDrinkStyling() {
        this.drinkListItem.classList.add('drink')
    }
    addInstructions() {
        this.instructionsDiv.classList.add('instructions')
        this.instructionsDiv.innerHTML = this.getFormattedInstructions()
    }
    appendDrinkElements() {
        for (const element of this.childElements)
            this.drinkListItem.appendChild(element)
    }
    setupDrinkImage() {
        this.imageElement.classList.add('hidden')

        // To prevent seeing the image loading in before it's fully loaded.
        this.imageElement.onload = () => {
            this.imageElement.classList.remove('hidden')
            this.nameHeader.classList.remove('loading')
            this.nameHeader.innerHTML = this.data['strDrink']
        }
        this.imageElement.src = this.data['strDrinkThumb']
    }
    setDrinkName() {
        this.nameHeader.innerHTML = "Loading..."
        this.nameHeader.classList.add('loading')
    }
    setupDrink() {
        this.addDrinkStyling()
        this.addInstructions()
        this.setDrinkName()
        this.setupDrinkImage()
        this.appendDrinkElements()
    }
    getDrinkElement() {
        return this.drinkListItem
    }
    setupHeart() {
        // TODO: Construct heart favorite icon
        const element = document.createElement('div')
        element.innerHTML = svgHeart
        // element.type = 'checkbox'
        // if (this.favorited)
        //     element.checked = true
        return element
    }
}

// Handles errors received or implied by the API responses.
// Renders the error message to the DOM when user needs to see it (say if no drinks were found).
class APIErrors {
    errors = {}
    errorSpan = document.querySelector(".error-text")

    storeError(error) {
        if (error !== 200)
            this.errors[error] = true
    }
    renderErrors() {
        // We don't need to show errors to the user received by multiple API endpoints if the end result
        // is that we still found some drinks with some of the requests.
        if (cocktailList.childElementCount === 0) {
            for (const error in this.errors)
                this.errorSpan.innerHTML += `<p>${error}</p>`
        } else {
            for (const error in this.errors)
                console.log(error)
        }
    }
    clearErrors() {
        this.errors = []
        this.errorSpan.innerHTML = ''
    }
}


// -------------------------------------------------------------
// Static functions.
// TODO: Encapsulate more of this behavior in new classes.
// -------------------------------------------------------------

// Create a promise to resolve after a given delay in ms.
// We can use this for animation-like effects or arbitrary delays.
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// Setup user input event listeners.
function setupListeners() {
    clearButton.addEventListener('click', () => {
        clearCocktailList()
        errors.clearErrors()
    })
    searchButton.addEventListener('click', () => {
        getDrinks()
    })
    input.addEventListener('keypress', e => {
        if (e.key === 'Enter')
            getDrinks()
    })
    window.onscroll = () => {
        toggleOpacityOnScroll(searchBar)
    }
}

// Setup click event listeners for the drink buttons.
function setupDrinkListeners() {
    drinkButtons = document.querySelectorAll('.drink')
    drinkButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            // Search by ingredient just by clicking on the ingredient link.
            if (e.target.tagName === 'A') {
                input.value = e.target.innerText
                getDrinks(input.value)
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
    // TODO: This makes the return transition a bit jittery. It would be better to base this on
    //  if there is a scroll bar present when drink is not focused.
    else if (window.scrollY !== 0) {
        element.classList.add('hidden')
    }
    window.oldScroll = window.scrollY
}

// Enter and exit focus on a drink button.
// Also scrolls to the drink button's current location on focus and unfocus.
async function toggleDrinkFocus(drink) {
    drink.classList.toggle('viewing')
    drink.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
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
    clearCocktailList()
    if (!choice)
        choice = sanitizeInput(input.value)

    const drinkURL = `https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${choice}`
    const ingredientURL = `https://www.thecocktaildb.com/api/json/v1/1/filter.php?i=${choice}`

    errors.clearErrors()
    toggleLoadingIcon()
    const nameResponse = await fetchDrinksByName(drinkURL)
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
            errors.storeError(`Couldn't find "${input.value}" :(`)
        }
        return response
    }
    catch (err) {
        console.log(`Caught this error: ${err}`)
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
            errors.storeError(`Couldn't find "${input.value}" :(`)
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
        await wait(200)
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


// Create the HTML structure for the ingredients list.
// Match ingredients with ingredient measure amounts, and remove empty entries.
function getIngredients(drink) {
    const ingredients = document.createElement('ul')
    ingredients.classList.add('ingredients')
    const measurementPairs = {}
    // To match the ingredients with their measurements, we can check the last character of the key name
    // since each measurement and ingredient name have a matching number suffix.
    // This works so long as there isn't more than 10 ingredients.
    // TODO: If the API ever stops returning ingredients before measurements in the future, we'll need to refactor this.
    for (const key in drink) {
        const suffix = key.charAt(key.length - 1)
        if (key.includes('Ingredient') && drinkPropertyIsValid(drink, key)) {
            measurementPairs[suffix] = drink[key]
        }
        if (key.includes('Measure') && drinkPropertyIsValid(drink, key) && measurementPairs[suffix].length > 0) {
            const measurement = drink[key]
            const ingredient = document.createElement('li')
            ingredient.innerHTML = `<a>${measurementPairs[suffix]}</a>: ${measurement}`
            ingredient.classList.add('ingredient')
            ingredients.appendChild(ingredient)
        }
    }
    // If there are no ingredients, add a button for submitting new ingredients.
    if (ingredients.children.length === 0) {
        ingredients.innerHTML = '<li>No ingredients listed. Submit some!</li>'
        const submitIngredientButton = document.createElement('button')
        submitIngredientButton.innerHTML = 'Submit ingredient'
        ingredients.appendChild(submitIngredientButton)
    }
    return ingredients
}

// Check if given drink property key is not blank and not null.
function drinkPropertyIsValid(drink, key) {
    return drink[key] !== null && drink[key].length > 0
}

// Reset the page to its empty state.
function clearCocktailList() {
    cocktailList.innerHTML = ''
    drinksOnDisplay = {}
}


// -------------------------------------------------------------
// Start here.
// -------------------------------------------------------------
window.onload = () => {
    // Add new property to window object for the sake of keeping track of previous scroll position.
    window.oldScroll = window.scrollY
    searchButton = document.querySelector("#getCocktails")
    clearButton = document.querySelector("#clearCocktails")
    input = document.querySelector("input")
    cocktailList = document.querySelector('.cocktails')
    searchBar = document.querySelector('.searchbar')
    loadingIcon = document.querySelector('.lds-ellipsis')
    errors = new APIErrors()
    drinksOnDisplay = {}
    setupListeners()
}