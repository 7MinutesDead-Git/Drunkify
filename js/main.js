// -------------------------------------------------------------
// Variables.
// -------------------------------------------------------------
let button
let input
let cocktailList
let searchBar
let errors
let drinkButtons
let drinksOnDisplay
let loadingIcon

// -------------------------------------------------------------
// Classes.
// -------------------------------------------------------------

// TODO: Favorite system:
//  - Add favorites button to navigation.
//  - Add a favorite button to each drink.
//  - Click favorite button to store drink object? id? name? in localStorage.
//  - Store favorite drinks as.. array?
//  - Check favorite drinks array/list/etc when hitting display favorites button.

class Drink {
    constructor(apiData) {
        this.data = apiData
        this.instructionsData = apiData['strInstructions']
        this.ingredientsElement = getIngredients(apiData)

        this.drinkListItem = document.createElement('li')
        this.nameHeader = document.createElement('h3')
        this.instructionsDiv = document.createElement('div')
        this.imageElement = document.createElement('img')

        this.elements = [
            this.drinkListItem,
            this.nameHeader,
            this.instructionsDiv,
            this.imageElement,
            this.ingredientsElement
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
        for (const element of this.elements)
            this.drinkListItem.appendChild(element)
    }
    setDrinkImageSource() {
        this.imageElement.src = this.data['strDrinkThumb']
    }
    setDrinkName() {
        this.nameHeader.innerHTML = this.data['strDrink']
    }
    setupDrink() {
        this.addDrinkStyling()
        this.addInstructions()
        this.appendDrinkElements()
        this.setDrinkImageSource()
        this.setDrinkName()
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
    // We don't need to show errors to the user received by multiple API endpoints if the end result
    // is that we still found some drinks with some of the requests.
    renderErrors() {
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
// -------------------------------------------------------------

// Create a promise to resolve after a given delay in ms.
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// Setup user input event listeners.
function setupListeners() {
    button.addEventListener('click', () => {
        getDrinks()
    })
    input.addEventListener('keypress', e => {
        if (e.key === 'Enter')
            getDrinks()
    })
    window.onscroll = (e) => {
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
    } else {
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
    // For example, good to remove accidental double spaces on input.
    const excessSpaceRemoved = trimmed.replace(/\s+/g, ' ')
    // Also keep dashes since drink and ingredient names can contain them.
    const alphaNumericOnly = excessSpaceRemoved.replace(/[^a-z\d\s\-]/gi,'')
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
    console.log(choice)

    // TODO Setup promises here and get rid of arbitrary wait time.
    errors.clearErrors()
    toggleLoadingIcon()
    await fetchDrinksByName(drinkURL)
    await fetchDrinksByIngredient(ingredientURL)
    await wait(1000)
    await setupDrinkListeners()
    await revealDrinks()
    errors.renderErrors()
}

// Retrieve drink data by name and render them on the screen.
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
    }
    catch (err) {
        console.log(`Caught this error: ${err}`)
    }
}

// Retrieve drink data by ingredient, then search by ID with name function to get .
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
                    // If we await fetchDrinks here, each iteration of this loop will wait. May be useful in the future.
                    fetchDrinksByName(drinkURL)
                }
            }
        }
        else {
            errors.storeError(`Couldn't find "${input.value}" :(`)
        }
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
            // TODO: Ensure drink class works here.
            //  createDrinkBlock() was replaced here.
            const drink = new Drink(drinkData)
            cocktailList.appendChild(drink.drinkListItem)
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

// TODO: Remove once drink class confirmed working.
// Create the HTML structure for a drink block.
// This inclludes the name, image, ingredients, and instructions.
function createDrinkBlock(data) {
    const drink = document.createElement('li')
    const name = document.createElement('h3')
    const instructions = document.createElement('div')
    const image = document.createElement('img')
    const ingredients = getIngredients(data)

    drink.classList.add('drink')
    instructions.classList.add('instructions')

    name.textContent = data['strDrink']
    image.src = data['strDrinkThumb']

    instructions.innerHTML = formatInstructions(data['strInstructions'])
    const drinkInfo = [image, name, ingredients, instructions]

    for (const info of drinkInfo) {
        drink.appendChild(info)
    }
    return drink
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

// Structure the instructions into paragraph elements per sentence.
function formatInstructions(instructions) {
    let result = ''
    if (instructions) {
        const array = instructions.split('.')
        for (const instruction of array)
            if (instruction.length > 0)
                result += `<p>${instruction}.</p>`
    }
    return result
}


// -------------------------------------------------------------
// Start here.
// -------------------------------------------------------------
window.onload = () => {
    // Add new property to window object for the sake of keeping track of previous scroll position.
    window.oldScroll = window.scrollY
    button = document.querySelector("button")
    input = document.querySelector("input")
    cocktailList = document.querySelector('.cocktails')
    searchBar = document.querySelector('.searchbar')
    loadingIcon = document.querySelector('.lds-ellipsis')
    errors = new APIErrors()
    drinksOnDisplay = {}
    setupListeners()
}