// -------------------------------------------------------------
// Variables.
const button = document.querySelector("button")
const input = document.querySelector("input")
const errorSpan = document.querySelector(".error-text")
const cocktailList = document.querySelector('.cocktails')
const searchBar = document.querySelector('.searchbar')

let drinkButtons
let drinksOnDisplay = {}

window.oldScroll = window.scrollY

// -------------------------------------------------------------
// Create a promise to resolve after a given delay in ms.
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// -------------------------------------------------------------
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

// -------------------------------------------------------------
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

// -------------------------------------------------------------
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

// -------------------------------------------------------------
// Enter and exit focus on a drink button.
// Also scrolls to the drink button's current location on focus and unfocus.
async function toggleDrinkFocus(drink) {
    drink.classList.toggle('viewing')
    drink.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    })
}

// -------------------------------------------------------------
// Sanitize the user's search input by only allowing alphanumeric characters and spaces between words.
function sanitizeInput(stringInput) {
    return stringInput.trim().replace(/[^a-z\d\s]/gi,'')
}

// -------------------------------------------------------------
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
    await fetchDrinksByName(drinkURL)
    await fetchDrinksByIngredient(ingredientURL)
    await wait(1000)
    await setupDrinkListeners()
    await revealDrinks()
}

// -------------------------------------------------------------
// Retrieve drink data by name and render them on the screen.
async function fetchDrinksByName(url) {
    try {
        console.log('Fetching drinks by name')
        const response = await fetch(url)
        await renderError(response.status)

        const data = await response.json()
        console.log(data)
        await renderDrinks(data)
    }
    catch (err) {
        console.log(`Caught this error: ${err}`)
    }
}

// -------------------------------------------------------------
// Retrieve drink data by ingredient, then search by ID with name function to get .
async function fetchDrinksByIngredient(idURL) {
    try {
        console.log('Fetching drinks by ingredient...')
        const response = await fetch(idURL)
        await renderError(response.status)

        const data = await response.json()

        for (const drink of data['drinks']) {
            if (!(drinkExists(drink))) {
                const idNumber = drink['idDrink']
                const drinkURL = `https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${idNumber}`
                fetchDrinksByName(drinkURL)
            }
        }
    }
    catch (err) {
        console.log(`Caught this error: ${err}`)
    }
}

// -------------------------------------------------------------
// Function for handling and rendering error codes.
// For now, it's a catchall for 404 when the given drink doesn't exist.
function renderError(code) {
    if (code === 404){
        errorSpan.innerHTML = `Couldn't find a drink or ingredient named ${input.value} :(`
    }
    else {
        errorSpan.innerHTML = ''
    }
}

// -------------------------------------------------------------
// Create each drink block and append them to the cocktail list to be displayed.
function renderDrinks(data) {
    if (data['drinks']) {
        for (const drink of data['drinks']) {
            if (!(drinkExists(drink))) {
                drinksOnDisplay[drink['strDrink']] = true
                cocktailList.appendChild(createDrinkBlock(drink))
            }
        }
    } else {
        renderError(404)
    }
    console.log(`${Object.keys(drinksOnDisplay).length} drinks on display.`)
    console.log(`${cocktailList.childElementCount} drinks in the list.`)
}

// -------------------------------------------------------------
// Gradually reveal each drink in the list.
async function revealDrinks() {
    for (const drink of document.querySelectorAll('.drink')) {
        await wait(200)
        drink.style.opacity = '1'
    }
}

// -------------------------------------------------------------
// Check if the given drink is already on the page.
function drinkExists(drink) {
    const exists = drink['strDrink'] in drinksOnDisplay
    if (exists)
        console.log(`${drink['strDrink']} already exists on the page. Skipping.`)
    return exists
}

// -------------------------------------------------------------
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

// -------------------------------------------------------------
// Create the HTML structure for the ingredients list.
// Match ingredients with ingredient measure amounts, and remove empty entries.
function getIngredients(drink) {
    const ingredients = document.createElement('ul')
    ingredients.classList.add('ingredients')
    const measurementPairs = {}
    // To match the ingredients with their measurements, we can check the last character of the key name
    // since each measurement and ingredient name have a matching number suffix.
    // This works so long as there isn't more than 10 ingredients.
    // TODO: If the API stops returning ingredients before measurements, we'll need to refactor this.
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

// -------------------------------------------------------------
// Check if given drink property key is not blank and not null.
function drinkPropertyIsValid(drink, key) {
    return drink[key] !== null && drink[key].length > 0
}

// -------------------------------------------------------------
// Reset the page to its empty state.
function clearCocktailList() {
    cocktailList.innerHTML = ''
    drinksOnDisplay = {}
}

// -------------------------------------------------------------
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
window.onload = setupListeners