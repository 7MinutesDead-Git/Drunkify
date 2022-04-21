const button = document.querySelector("button")
const input = document.querySelector("input")
const errorSpan = document.querySelector(".error-text")
const cocktailList = document.querySelector('.cocktails')
const searchBar = document.querySelector('.searchbar')
window.oldScroll = window.scrollY

// -------------------------------------------------------------
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// -------------------------------------------------------------
function setupListeners() {
    button.addEventListener('click', () => {
        getFetch()
    })
    input.addEventListener('keypress', e => {
        if (e.key === 'Enter')
            getFetch()
    })
    window.onscroll = (e) => {
        toggleOpacityOnScroll(searchBar)
    }
}

// -------------------------------------------------------------
function setupDrinkListeners() {
    const drinkButtons = document.querySelectorAll('.drink')
    drinkButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') {
                input.value = e.target.innerText
                getFetch(e.target.innerText)
            }
            else
                toggleFocus(button)
        })
    })
}

// -------------------------------------------------------------
function toggleOpacityOnScroll(element) {
    if (window.oldScroll > window.scrollY) {
        element.classList.remove('hidden')
    } else {
        element.classList.add('hidden')
    }
    window.oldScroll = window.scrollY
}

// -------------------------------------------------------------
async function toggleFocus(drink) {
    drink.classList.toggle('viewing')
    drink.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    })
}

// -------------------------------------------------------------
function sanitizeInput(stringInput) {
    let result = stringInput.trim()
    return result
}

// -------------------------------------------------------------
async function getFetch(choice = null) {
    clearList()
    if (!choice)
        choice = sanitizeInput(input.value)
    const drinkURL = `https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${choice}`
    const ingredientURL = `https://www.thecocktaildb.com/api/json/v1/1/filter.php?i=${choice}`
    getDrinksByIngredient(ingredientURL)
    getDrinksByName(drinkURL)
    // A stopgap to allow time for elements to render before attaching listeners and revealing.
    await wait(1000)
    setupDrinkListeners()
    revealDrinks()
}

// -------------------------------------------------------------
function getDrinksByName(url) {
    fetch(url)
        .then(res => {
            renderError(res.status)
            return res.json()
        })
        .then(data => {
            console.log(data)
            renderDrinks(data)
        })
        .catch(err => {
            console.log(`Caught this error: ${err}`)
        })
}

// -------------------------------------------------------------
function getDrinksByIngredient(idURL) {
    fetch(idURL)
        .then(res => {
            renderError(res.status)
            return res.json()
        })
        .then(data => {
            // Since ingredients don't return full drink details,
            // we'll need to do a second fetch by the IDs we find.
            for (const id of data['drinks']) {
                const idNumber = id['idDrink']
                const drinkURL = `https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${idNumber}`
                getDrinksByName(drinkURL)
            }
        })
        .catch(err => {
            console.log(`Caught this error: ${err}`)
        })
}

// -------------------------------------------------------------
function renderError(code) {
    if (code === 404){
        errorSpan.innerHTML = `Couldn't find a drink or ingredient named ${input.value} :(`
    }
    else {
        errorSpan.innerHTML = ''
    }
}

// -------------------------------------------------------------
async function renderDrinks(data) {
    if (data['drinks']) {
        for (const drink of data['drinks']) {
            cocktailList.appendChild(createDrinkBlock(drink))
        }
    } else {
        renderError(404)
    }
}

// -------------------------------------------------------------
async function revealDrinks() {
    for (const drink of document.querySelectorAll('.drink')) {
        await wait(200)
        drink.style.opacity = '1'
    }
}

// -------------------------------------------------------------
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
        if (key.includes('Ingredient') && drinkKeyIsValid(drink, key)) {
            measurementPairs[suffix] = drink[key]
        }
        if (key.includes('Measure') && drinkKeyIsValid(drink, key) && measurementPairs[suffix].length > 0) {
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
function drinkKeyIsValid(drink, key) {
    return drink[key] !== null && drink[key].length > 0
}

// -------------------------------------------------------------
function clearList() {
    cocktailList.innerHTML = ''
}

// -------------------------------------------------------------
function formatInstructions(instructions) {
    let result = ''
    if (instructions) {
        const array = instructions.split('.')
        for (const instruction of array) {
            if (instruction.length > 0) {
                result += `<p>${instruction}.</p>`
            }
        }
    }
    return result
}


// -------------------------------------------------------------
window.onload = setupListeners