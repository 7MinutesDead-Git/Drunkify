// Handles errors received or implied by the API responses.
// Renders the error message to the DOM when user needs to see it (say if no drinks were found).
export default class APIErrors {
    constructor(cocktailList) {
        this.cocktailList = cocktailList
    }

    errors = {}
    errorSpan = document.querySelector(".error-text")

    storeError(error) {
        if (error !== 200)
            this.errors[error] = true
    }
    renderErrors() {
        // We don't need to show errors to the user received by multiple API endpoints if the end result
        // is that we still found some drinks with some of the requests.
        if (this.cocktailList.childElementCount === 0) {
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
