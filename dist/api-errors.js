// Handles errors received or implied by the API responses.
// Renders the error message to the DOM when user needs to see it (say if no drinks were found).
export default class APIErrors {
    constructor(cocktailList) {
        this.errors = {};
        this.errorSpan = document.querySelector(".error-text");
        this.cocktailList = cocktailList;
    }
    // Stores the given error as a string, if the error is not a 200 response code.
    // Because the errors are stored as keys (with boolean values to indicate presence), the input error must be a string.
    storeError(error) {
        if (error !== "200")
            this.errors[error] = true;
    }
    // If no drink search results were found, we instead generate relevant error
    // messages as p tags within our container ".error-text".
    renderErrors() {
        // We don't need to show errors to the user received by multiple API endpoints if the end result
        // is that we still found some drinks with some requests.
        if (this.cocktailList.childElementCount === 0) {
            for (const error in this.errors)
                this.errorSpan.innerHTML += `<p>${error}</p>`;
        }
        else {
            for (const error in this.errors)
                console.log(error);
        }
    }
    clearErrors() {
        this.errors = {};
        this.errorSpan.innerHTML = '';
    }
}
