const button = document.querySelector("button")
const input = document.querySelector("input")
const errorSpan = document.querySelector(".error-text")
const cocktailList = document.querySelector('.cocktails')


// -------------------------------------------------------------
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// -------------------------------------------------------------
function setupListeners() {
    button.addEventListener('click', getFetch)
    input.addEventListener('keypress', e => {
        if (e.key === 'Enter')
            getFetch()
    })
}

// -------------------------------------------------------------
function setupDrinkListeners() {
    const drinkButtons = document.querySelectorAll('.drink')
    drinkButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            toggleFocus(button)
        })
    })
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
    result = result.endsWith('s') ? result.slice(0, -1) : result
    return result
}

// -------------------------------------------------------------
function getFetch() {
    clearList()
    // TODO: Include ingredient searches.
    const choice = sanitizeInput(input.value)
    const ingredientURL = `https://www.thecocktaildb.com/api/json/v1/1/search.php?i=${choice}`
    const url = `https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${choice}`

    fetch(url)
        .then(res => {
            renderError(res.status)
            return res.json()
        })
        .then(data => {
            renderDrinks(data)
            setupDrinkListeners()
            console.log(data)
        })
        .catch(err => {
            console.log(`Caught this error: ${err}`)
        })
}

// -------------------------------------------------------------
function renderError(code) {
    if (code === 404){
        errorSpan.innerHTML = `Couldn't find a drink named ${input.value}.`
    }
    else {
        errorSpan.innerHTML = ''
    }
}

// -------------------------------------------------------------
function renderDrinks(data) {
    if (data['drinks']) {
        for (const drink of data['drinks']) {
            cocktailList.appendChild(createDrinkBlock(drink))
        }
    } else {
        renderError(404)
    }
    revealDrinks()
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
        if (key.includes('Ingredient') && drink[key] !== null) {
            measurementPairs[suffix] = drink[key]
        }
        if (key.includes('Measure') && drink[key] !== null && measurementPairs[suffix] !== null) {
            const measurement = drink[key]
            const ingredient = document.createElement('li')
            ingredient.textContent = `${measurementPairs[suffix]}: ${measurement}`
            ingredient.classList.add('ingredient')
            ingredients.appendChild(ingredient)
        }
    }
    return ingredients
}

// -------------------------------------------------------------
function clearList() {
    cocktailList.innerHTML = ''
}

// -------------------------------------------------------------
function formatInstructions(instructions) {
    const array = instructions.split('.')
    let result = ''

    for (const instruction of array) {
        if (instruction.length > 0) {
            result += `<p>${instruction}.</p>`
        }
    }
    return result
}


// -------------------------------------------------------------
window.onload = setupListeners