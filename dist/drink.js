// Check if given drink property key is not blank and not null.
function drinkPropertyIsValid(drink, key) {
    return drink[key] !== null && drink[key].length > 0;
}
// Create the HTML structure for the ingredients list.
// Match ingredients with ingredient measure amounts, and remove empty entries.
function getIngredients(drink) {
    const ingredients = document.createElement('ul');
    ingredients.classList.add('ingredients');
    const measurementPairs = {};
    // To match the ingredients with their measurements, we can check the last character of the key name
    // since each measurement and ingredient name have a matching number suffix.
    // This works so long as there isn't more than 10 ingredients.
    // TODO: If the API ever stops returning ingredients before measurements in the future, we'll need to refactor this.
    for (const key in drink) {
        const suffix = key.charAt(key.length - 1);
        if (key.includes('Ingredient') && drinkPropertyIsValid(drink, key)) {
            measurementPairs[suffix] = drink[key];
        }
        if (key.includes('Measure') && drinkPropertyIsValid(drink, key) && measurementPairs[suffix]) {
            const measurement = drink[key];
            const ingredient = document.createElement('li');
            // We're adding href links to ingredients for web crawlers, but since we're handling new searches
            // and results all client-side as SPA, we want to prevent the page from reloading, so
            // we won't actually navigate to the link (e.preventDefault()).
            const crawlerLink = `?drink=${measurementPairs[suffix]}`;
            ingredient.innerHTML = `<a class="ingredient-link" href=${crawlerLink}>${measurementPairs[suffix]}</a>: ${measurement}`;
            ingredient.classList.add('ingredient');
            ingredients.appendChild(ingredient);
        }
    }
    // If there are no ingredients, add a button for submitting new ingredients.
    if (ingredients.children.length === 0) {
        ingredients.innerHTML = '<li>No ingredients listed. Submit some!</li>';
        const submitIngredientButton = document.createElement('button');
        submitIngredientButton.innerHTML = 'Submit ingredient';
        ingredients.appendChild(submitIngredientButton);
    }
    return ingredients;
}
export default class Drink {
    constructor(apiData) {
        this.data = apiData;
        this.instructionsData = apiData['strInstructions'];
        this.ingredientsElement = getIngredients(apiData);
        this.drinkListItem = document.createElement('li');
        this.nameHeader = document.createElement('h3');
        this.instructionsDiv = document.createElement('div');
        this.imageElement = document.createElement('img');
        this.heart = this.setupHeart();
        // TODO: Check localStorage if drink matches a favorite.
        this.favorited = false;
        this.childElements = [
            this.imageElement,
            this.nameHeader,
            // this.heart,
            this.ingredientsElement,
            this.instructionsDiv
        ];
        this.setupDrink();
    }
    getFormattedInstructions() {
        let result = '';
        if (this.instructionsData) {
            const array = this.instructionsData.split('.');
            for (const instruction of array)
                if (instruction.length > 0)
                    result += `<p class="drink-instructions">${instruction}.</p>`;
        }
        return result;
    }
    addDrinkStyling() {
        this.drinkListItem.classList.add('drink');
    }
    addInstructions() {
        this.instructionsDiv.classList.add('instructions');
        this.instructionsDiv.innerHTML = this.getFormattedInstructions();
    }
    appendDrinkElements() {
        for (const element of this.childElements)
            this.drinkListItem.appendChild(element);
    }
    setupDrinkImage() {
        this.imageElement.classList.add('hidden');
        this.imageElement.classList.add('drink-image');
        // To prevent seeing the image loading in before it's fully loaded.
        this.imageElement.onload = () => {
            this.imageElement.classList.remove('hidden');
            this.nameHeader.classList.remove('loading');
            this.nameHeader.innerHTML = this.data['strDrink'] ?? 'No name found!';
        };
        // TODO: Display a placeholder image if no image is found.
        this.imageElement.src = this.data['strDrinkThumb'] ?? '';
        this.imageElement.alt = this.data['strDrink'] ?? 'Picture of a drink';
    }
    setDrinkName() {
        this.nameHeader.innerHTML = "Loading...";
        this.nameHeader.classList.add('loading');
        this.nameHeader.classList.add('drink-name');
    }
    setupDrink() {
        this.addDrinkStyling();
        this.addInstructions();
        this.setDrinkName();
        this.setupDrinkImage();
        this.appendDrinkElements();
    }
    getDrinkElement() {
        return this.drinkListItem;
    }
    setupHeart() {
        // TODO: Construct heart favorite icon
        const element = document.createElement('div');
        // element.type = 'checkbox'
        // if (this.favorited)
        //     element.checked = true
        return element;
    }
}
