import Drink from "./drink.js";
import APIErrors from "./api-errors.js";
import { UISettings } from "./constants.js";
// -------------------------------------------------------------
// TODO: Encapsulate as much of these type declarations as possible...
// Also really want to try to avoid globals.
const repoURL = 'https://github.com/7MinutesDead-Git/Drunkify';
let previousScroll = 0;
let searchButton;
let clearButton;
let searchInput;
let cocktailList;
// When it comes to <section> or <article> or other semantic HTML5 tags, there is no particularly specific type.
// Everything at that point is an HTMLElement, which inherits from Element.
let searchSection;
let searchChoice;
let errors;
let drinkButtons;
let drinksOnDisplay;
let loadingIcon;
let longLoadMessage;
let longerLoadMessage;
let longestLoadMessage;
let suggestions;
let fetchedDrinks;
// Timer to prevent excessive API calls while typing in the search input.
let typingSearchTimer = setTimeout(() => { }, 0);
let ingredientsMatrix;
let easterEggTimer = setTimeout(() => { }, 0);
let removeEasterEggTimer = setTimeout(() => { }, 0);
let easterEggTrigger = 0;
const rainbowColors = [
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
];
let rainbowIndex = 0;
const deadDatabaseMessage = "There was no response. We're sending a message to the guy trapped in the server room. Maybe try again later?";
const deadClientMessage = "This thing says you're offline. Are you still connected to the internet?";
let requestURL = new URL(window.location.href);
let requestParams = new URLSearchParams(requestURL.searchParams);
// -------------------------------------------------------------
// Create a promise to resolve after a given delay in ms.
// We can use this for animation-like effects or arbitrary delays.
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// Setup user input event listeners.
function setupListeners() {
    // Refreshes page when navigating forward or backward.
    window.addEventListener('popstate', () => {
        // TODO: Reloading causes a loss of browser history, so we can really only go back once.
        //  Store browser history in local storage and reload it on page load.
        window.location.reload();
    });
    clearButton.addEventListener('click', () => {
        clearScreen();
        clearInput();
        updateBrowserHistoryAndURL('');
        errors.clearErrors();
        animateClick(clearButton);
    });
    searchButton.addEventListener('click', () => {
        suggestions.classList.add('hidden');
        getDrinks();
    });
    searchInput.addEventListener('keyup', (e) => {
        clearTimeout(typingSearchTimer);
        // Since addEventListener results in an Event type and not a KeyboardEvent type,
        // we need to <cast>it (type assertion in ts terms).
        const keyboardEvent = e;
        if (keyboardEvent.key === 'Enter') {
            suggestions.classList.add('hidden');
        }
        // Searching as we type is actually GREAT.
        typingSearchTimer = setTimeout(() => {
            getDrinks();
        }, UISettings.typingFetchDelay);
    });
    searchInput.addEventListener('focus', () => {
        suggestions.classList.remove('hidden');
    });
    searchInput.addEventListener('focusout', () => {
        suggestions.classList.add('hidden');
    });
    window.onscroll = () => {
        toggleOpacityOnScroll(searchSection);
    };
    // Allows faded out older suggestions to be more legible when mousing over.
    suggestions.addEventListener('mouseover', (e) => {
        const targetElement = e.target;
        if (targetElement.tagName === "LI") {
            targetElement.style.opacity = "1";
        }
    });
    // Resets opacity when mouse leaves any one suggestion so fade is re-applied.
    // This is in lieu of keeping track of initial opacity state for each li element.
    // This is less efficient, but the array is tiny.
    suggestions.addEventListener('mouseout', (e) => {
        // We can typecast (technically type assertion) the event target to an HTMLLIElement
        // because we know it should be an LI element.
        const targetElement = e.target;
        if (targetElement.tagName === "LI") {
            setSearchHistoryDisplayOpacity();
        }
    });
}
// Setups up event listeners on drink ingredient elements.
// Should only be invoked once the drinks have been added to the DOM.
function setupIngredientsListeners() {
    ingredientsMatrix = document.querySelectorAll('.ingredients');
    ingredientsMatrix.forEach((ingredientsList) => {
        // ;)
        ingredientsList.addEventListener('mouseover', (e) => {
            const targetElement = e.target;
            if (targetElement.classList.contains('ingredient-link')) {
                manageEasterEggTimer(targetElement);
            }
        });
    });
}
// Ensures the Easter Egg event does not trigger unless the user is mousing over ingredients long enough to
// indicate playing around with the effects.
function manageEasterEggTimer(element) {
    clearTimeout(easterEggTimer);
    easterEggTrigger++;
    if (easterEggTrigger >= UISettings.easterEggThreshold) {
        createRainbows(element);
    }
    else {
        easterEggTimer = setTimeout(() => {
            easterEggTrigger = 0;
        }, UISettings.easterEggDelay);
    }
}
// Once the Easter Egg is triggered, this function assigns a new color with each mouse over.
// Given a long enough pause, the Easter Egg effect will be removed and reset.
function createRainbows(ingredientElement) {
    clearTimeout(removeEasterEggTimer);
    const selectedColor = rainbowColors[rainbowIndex % rainbowColors.length];
    ingredientElement.style.setProperty('--ingredient-link-hover-color', selectedColor);
    ingredientElement.style.setProperty('--ingredient-link-hover-glow', "0.5rem");
    rainbowIndex++;
    removeEasterEggTimer = setTimeout(() => {
        easterEggTrigger = 0;
        resetIngredientColors();
    }, UISettings.easterEggResetDelay);
}
// Resets ingredient link colors altered by easter egg to default values.
function resetIngredientColors() {
    ingredientsMatrix.forEach((ingredientsList) => {
        ingredientsList.querySelectorAll('.ingredient-link').forEach((ingredient) => {
            const ingredientElement = ingredient;
            ingredientElement.style.setProperty('--ingredient-link-hover-color', "white");
            ingredientElement.style.setProperty('--ingredient-link-hover-glow', "0");
        });
    });
}
// Setup click event listeners for the drink buttons.
function setupDrinkListeners() {
    // TODO: Refactor for event delegation in parent element rather than a bunch of event listeners here.
    drinkButtons = [...document.querySelectorAll('.drink')];
    drinkButtons.forEach(drink => {
        drink.addEventListener('click', (e) => {
            const targetElement = e.target;
            // Search by ingredient just by clicking on the ingredient link.
            if (targetElement.tagName === 'A') {
                searchInput.value = targetElement.innerText;
                getDrinks(searchInput.value);
            }
            toggleDrinkFocus(drink);
        });
    });
    setupIngredientsListeners();
}
// Show and hide an element when scrolling.
// ie: Hide the search bar when scrolling down, but reveal it when trying to scroll back up to it.
function toggleOpacityOnScroll(element) {
    if (previousScroll > window.scrollY) {
        element.classList.remove('hidden');
    }
    // Fixes the search bar hiding when result window length does not require scrolling.
    // Example: When focused drink details are longer than a full page height,
    // but the search results are not, so the search bar is lost when unfocusing from drink.
    else if (window.scrollY !== 0) {
        element.classList.add('hidden');
    }
    previousScroll = window.scrollY;
}
// Enter and exit focus on a drink button.
// Focusing a drink includes scrolling to and from drink.
async function toggleDrinkFocus(drink) {
    drink.classList.toggle('viewing');
    // If the user has made a selection, then it's likely their search term is useful,
    // and thus should be added to the search history.
    addSearchToLocalHistory(searchChoice);
    // If we're focused on a drink, we want to set the URL to reflect the current drink
    // so this drink can be shared.
    if (drink.classList.contains('viewing')) {
        requestParams.set('focus', 'true');
        const drinkHeader = drink.querySelector('.drink-name');
        if (!drinkHeader) {
            console.error("Drink rendered without a header!", drink);
            throw new Error("Drink rendered without a header. Check the Drink class!");
        }
        updateBrowserHistoryAndURL(drinkHeader.innerText);
    }
    // But since this is a toggle, if we're dropping focus, we should go back to the
    // search term so overall searches can be shared too.
    else {
        requestParams.delete('focus');
        updateBrowserHistoryAndURL(searchInput.value);
    }
    // TODO: Find a more programmatic solution to do the following :P
    // Adding an arbitrary pause seems to eliminate most occurences of scrolling
    // occasionally stopping abruptly when the user clicks on a drink button.
    await wait(UISettings.autoScrollDelay);
    drink.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
    });
}
// Sanitize the user's search input for more consistent searches.
function sanitizeInput(input) {
    const trimmed = input.trim();
    // Good to remove accidental excess spaces on input and replace with single intended space.
    const excessSpaceRemoved = trimmed.replace(/\s+/g, ' ');
    // Keep dashes since drink and ingredient names can contain them.
    const alphaNumericOnly = excessSpaceRemoved.replace(/[^a-z\d\s\-]/gi, '');
    // Case insensitivity means we can remain agnostic to the whims of the API we're fetching.
    return alphaNumericOnly.toLowerCase();
}
function updateBrowserHistoryAndURL(searchTerm) {
    requestParams.set('drink', searchTerm);
    // set page url to reflect the search params
    requestURL.search = requestParams.toString();
    window.history.pushState({}, '', requestURL.href);
}
// Get the drinks from the API and display them on screen.
// Clears any previously existing drinks on screen.
async function getDrinks(choice = null) {
    choice ?? (choice = sanitizeInput(searchInput.value));
    // Update global variable so this state can be used elsewhere.
    searchChoice = choice;
    // If search term is identical to last, don't re-fetch.
    if (choice === requestParams.get('drink') && fetchedDrinks.length > 0) {
        flashScreen();
        return;
    }
    clearScreen();
    updateBrowserHistoryAndURL(choice);
    const drinkURL = `https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${choice}`;
    const ingredientURL = `https://www.thecocktaildb.com/api/json/v1/1/filter.php?i=${choice}`;
    errors.clearErrors();
    showLoadingIcon();
    // Removed awaits here, so that fetchedDrinks array can be all pending Promises, rather than a
    // mix of Promises and Responses. Might break?
    fetchedDrinks.push(fetchDrinksByName(drinkURL));
    await fetchDrinksByIngredient(ingredientURL);
    // We should wait for all drink API fetches to complete successfully, otherwise
    // we run into issues where drinks are rendered before the API has responded,
    // resulting in empty spaces and missing drinks or information.
    await Promise.allSettled(fetchedDrinks);
    setupDrinkListeners();
    await revealDrinks();
    errors.renderErrors();
}
// Momentarily flash the screen to indicate a successful search.
function flashScreen() {
    document.body.classList.add('flash');
    setTimeout(() => {
        document.body.classList.remove('flash');
    }, UISettings.backgroundFlashDuration);
}
// Retrieve drink data by name and render them on the screen.
// Returns the response object for managing Promises.
async function fetchDrinksByName(url) {
    try {
        const response = await fetch(url);
        errors.storeError(response.status.toString());
        const data = await response.json();
        if (data['drinks']) {
            renderDrinks(data);
        }
        else {
            errors.storeError(`Couldn't find "${searchInput.value}" :(`);
        }
        return response;
    }
    catch (err) {
        if (!window.navigator.onLine) {
            errors.storeError(deadClientMessage);
        }
        else {
            errors.storeError(deadDatabaseMessage);
            console.error(deadDatabaseMessage);
        }
    }
}
// Fetches drink data from ingredient API, then adds subsequent drink API calls to the
// fetchedDrinks array to be resolved in parallel.
async function fetchDrinksByIngredient(idURL) {
    try {
        const response = await fetch(idURL);
        errors.storeError(response.status?.toString());
        const data = await response.json();
        if (data['drinks']) {
            for (const drink of data['drinks']) {
                if (!(drinkExists(drink))) {
                    const idNumber = drink['idDrink'];
                    const drinkURL = `https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${idNumber}`;
                    fetchedDrinks.push(fetchDrinksByName(drinkURL));
                }
            }
        }
        else {
            errors.storeError(`Couldn't find "${searchInput.value}" :(`);
        }
    }
    catch (err) {
        if (!window.navigator.onLine) {
            errors.storeError(deadClientMessage);
        }
        errors.storeError(deadDatabaseMessage);
        console.error(deadDatabaseMessage);
    }
}
// Create each drink block and append them to the cocktail list to be displayed.
// TODO: Make an interface for json api response and replace any.
function renderDrinks(data) {
    for (const drinkData of data['drinks']) {
        if (!(drinkExists(drinkData))) {
            try {
                drinksOnDisplay[drinkData['strDrink']] = true;
                // Note: createDrinkBlock() was replaced by Drink class here.
                const drink = new Drink(drinkData);
                cocktailList.appendChild(drink.getDrinkElement());
            }
            catch (err) {
                console.error(`Something went wrong during renderDrinks(): ${err} 🦩 🦩 🦩`, data);
            }
        }
    }
}
let longLoadTimer = setTimeout(() => { });
function showLongLoadMessage() {
    // lmao
    longLoadMessage.classList.add('show');
    setTimeout(() => {
        longerLoadMessage.classList.add('show');
        setTimeout(() => {
            longestLoadMessage.classList.add('show');
        }, UISettings.reallyLongLoadDelay);
    }, UISettings.reallyLongLoadDelay);
}
function hideLongLoadMessage() {
    longLoadMessage.classList.remove('show');
    longerLoadMessage.classList.remove('show');
    longestLoadMessage.classList.remove('show');
}
function showLoadingIcon() {
    clearTimeout(longLoadTimer);
    loadingIcon.classList.add('visible');
    longLoadTimer = setTimeout(showLongLoadMessage, UISettings.longLoadMessageDelay);
}
function hideLoadingIcon() {
    clearTimeout(longLoadTimer);
    loadingIcon.classList.remove('visible');
    hideLongLoadMessage();
}
// Gradually reveal each drink in the list.
async function revealDrinks() {
    clearTimeout(longLoadTimer);
    hideLoadingIcon();
    for (const drink of document.querySelectorAll('.drink')) {
        await wait(UISettings.drinkRevealSpeed);
        drink.style.opacity = '1';
    }
}
// Check if the given drink is already on the page.
function drinkExists(drink) {
    return drink['strDrink'] in drinksOnDisplay;
}
// Reset the page to its empty state.
function clearScreen() {
    cocktailList.innerHTML = '';
    drinksOnDisplay = {};
}
function animateClick(element) {
    element.classList.add('clicked');
    setTimeout(() => {
        element.classList.remove('clicked');
    }, UISettings.clickAnimationDuration);
}
// Add search term to local history.
function addSearchToLocalHistory(search) {
    search = sanitizeInput(search);
    const history = getSearchHistory();
    if (!(history.includes(search)) && search.length > 0) {
        history.push(search);
        if (history.length > UISettings.searchHistoryLimit) {
            history.shift();
        }
        localStorage.setItem('searchHistory', JSON.stringify(history));
    }
    updateSearchHistoryDisplay(history);
}
function updateSearchHistoryDisplay(historyArray) {
    suggestions.innerHTML = '';
    for (const searchTerm of historyArray.reverse()) {
        const historyItem = document.createElement('li');
        historyItem.addEventListener('click', () => {
            searchInput.value = searchTerm;
            getDrinks(searchInput.value);
        });
        historyItem.innerHTML = `> ${searchTerm}`;
        historyItem.classList.add('suggestions-item');
        suggestions.appendChild(historyItem);
    }
    setSearchHistoryDisplayOpacity();
}
// Creates a smooth fade out of the older search history display elements.
function setSearchHistoryDisplayOpacity() {
    const historyArray = suggestions.querySelectorAll('li');
    let currentOpacity = 1;
    const opacityIncrement = 1 / historyArray.length;
    for (const historyItem of historyArray) {
        historyItem.style.opacity = currentOpacity.toString();
        currentOpacity -= opacityIncrement;
    }
}
function getSearchHistory() {
    return JSON.parse(localStorage.getItem('searchHistory') ?? '[]');
}
function clearInput() {
    searchInput.value = '';
}
// Cycle through suggestions on the input placeholder text.
function cycleSuggestions() {
    const cycleDelay = 3000;
    const fadeDelay = 500;
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
    ];
    let index = 0;
    setInterval(async () => {
        const input = document.querySelector('input');
        input.classList.add('hide-placeholder');
        await wait(fadeDelay);
        input.placeholder = tempSuggestionsList[index % tempSuggestionsList.length];
        input.classList.remove('hide-placeholder');
        index++;
    }, cycleDelay);
}
// Called when a user visits a direct link to a drink, likely from sharing or
// bookmarking. Ensures asynchronous order of execution where the drink is fetched,
// then the element is created, then the focus logic runs once the image has loaded.
async function focusDrinkFromUrlRequest() {
    const searchTerm = requestParams.get('drink');
    if (searchTerm) {
        searchInput.value = searchTerm;
        await getDrinks(searchTerm);
        // This allows us to share specific drinks directly from the URL,
        // so the drink is focused automatically (once fetched above).
        if (requestParams.get('focus')) {
            const drink = await getFocusedDrink();
            await getFocusedDrinkHeader(drink);
            await toggleDrinkFocus(drink);
        }
    }
}
// Returns a promise that resolves once the focused drink element is present.
// This is necessary for sharing drinks directly, where we want to focus immediately
// after an initial query from the URL.
// TODO: Check to ensure type assertion of return type works for both resolve cases.
function getFocusedDrink() {
    return new Promise((resolve) => {
        const drink = document.querySelector('.drink');
        if (drink) {
            resolve(drink);
        }
        else {
            setTimeout(() => {
                resolve(getFocusedDrink());
            }, 100);
        }
    });
}
// Returns a promise that resolves once the focused drink element is finished loa  ding,
// i.e. the image has completed loading and the the loading class is removed.
// This is necessary for sharing drinks directly, where we want to focus immediately
// after an initial query from the URL.
function getFocusedDrinkHeader(drink) {
    return new Promise((resolve) => {
        const drinkHeader = drink.querySelector('h3');
        if (drinkHeader && !drinkHeader.classList.contains('loading')) {
            resolve(drinkHeader);
        }
        else {
            setTimeout(() => {
                resolve(getFocusedDrinkHeader(drink));
            }, 100);
        }
    });
}
// Checks to see if any crucial HTML elements are missing. Fail process gracefully if so.
function nullCheck(...elements) {
    for (const element of elements) {
        if (!element) {
            console.error("Null or missing element: ", { element });
            throw new Error(`Element is null. Check your HTML!`);
        }
    }
}
// -------------------------------------------------------------
// TODO: Don't think onload is necessary anymore when we can instead defer the script.
window.onload = async () => {
    console.log(`🦩 Oh, inspecting are we!? If you want to see some typescript, head over to ${repoURL} 🦩`);
    previousScroll = window.scrollY;
    // https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-0.html#non-null-assertion-operator
    // All elements should be present as these are defined in the HTML, therefore querySelector should never return null.
    searchButton = document.querySelector("#getCocktails");
    clearButton = document.querySelector("#clearCocktails");
    searchInput = document.querySelector("input");
    suggestions = document.querySelector(".suggestions");
    cocktailList = document.querySelector('.cocktails');
    searchSection = document.querySelector('.search-section');
    loadingIcon = document.querySelector('.lds-ellipsis');
    longLoadMessage = document.querySelector('.long-load-message');
    longerLoadMessage = document.querySelector('.longer-load-message');
    longestLoadMessage = document.querySelector('.longest-load-message');
    // So we'll throw an error if that happens (woops lol).
    nullCheck(searchButton, clearButton, searchInput, suggestions, cocktailList, searchSection, loadingIcon, longLoadMessage, longerLoadMessage, longestLoadMessage);
    errors = new APIErrors(cocktailList);
    fetchedDrinks = [];
    drinksOnDisplay = {};
    setupListeners();
    updateSearchHistoryDisplay(getSearchHistory());
    cycleSuggestions();
    await focusDrinkFromUrlRequest();
};
