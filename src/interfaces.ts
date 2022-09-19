// To be populated by drink names from the API, and a boolean to indicate whether they are presently displayed
// in the results.
export interface DrinksOnDisplay {
    [drinkName: string]: boolean
}

export interface IngredientMeasurements {
    [key: string]: string | null
}

export interface DrinkData {
    [key: string]: string | null
}