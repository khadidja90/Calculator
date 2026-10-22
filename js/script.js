
// ========================================
// 1. DOM elements and application state
// ========================================

const expressionDisplay = document.getElementById("expression");
const resultDisplay = document.getElementById("result");
const keypad = document.querySelector(".keypad");

let expression = "";
let justCalculated = false;
let errorDisplayed = false;

// ========================================
// 2. Display helpers
// ========================================

function formatExpression(value) {
    return value
        .replace(/\*/g, "×")
        .replace(/\//g, "÷")
        .replace(/-/g, "−");
}

function updateDisplay() {
    expressionDisplay.textContent = formatExpression(expression);
    resultDisplay.textContent = expression || "0";
}

function showError(message = "Error") {
    resultDisplay.textContent = message;
    errorDisplayed = true;
    justCalculated = false;
}

// ========================================
// 3. Input handling
// ========================================

function appendValue(value) {
    if (errorDisplayed) {
        clearCalculator();
    }

    if (justCalculated) {
        // A number or opening parenthesis starts a new calculation.
        // An operator continues from the previous result.
        if (/[0-9.(]/.test(value)) {
            expression = "";
        }

        justCalculated = false;
    }

    expression += value;
    updateDisplay();
}

function clearCalculator() {
    expression = "";
    justCalculated = false;
    errorDisplayed = false;

    expressionDisplay.textContent = "";
    resultDisplay.textContent = "0";
}

function deleteLast() {
    if (errorDisplayed) {
        clearCalculator();
        return;
    }

    if (justCalculated) {
        clearCalculator();
        return;
    }

    expression = expression.slice(0, -1);
    updateDisplay();
}

// ========================================
// 4. Tokenizer
// Converts input into numbers and operators.
// ========================================

function tokenize(input) {
    const tokens = [];
    let index = 0;

    while (index < input.length) {
        const char = input[index];

        // Ignore whitespace.
        if (/\s/.test(char)) {
            index++;
            continue;
        }

        // Read integer and decimal numbers.
        if (/[0-9.]/.test(char)) {
            let number = "";
            let decimalCount = 0;

            while (
                index < input.length &&
                /[0-9.]/.test(input[index])
            ) {
                if (input[index] === ".") {
                    decimalCount++;
                }

                number += input[index];
                index++;
            }

            if (decimalCount > 1 || number === ".") {
                throw new Error("Invalid number");
            }

            tokens.push(Number(number));
            continue;
        }

        // Allow only supported operators and parentheses.
        if ("+-*/()".includes(char)) {
            tokens.push(char);
            index++;
            continue;
        }

        throw new Error("Invalid character");
    }

    if (tokens.length === 0) {
        throw new Error("Empty expression");
    }

    return tokens;
}

// ========================================
// 5. Mathematical parser
//
// expression: addition and subtraction
// term:       multiplication and division
// factor:     numbers, signs, parentheses
// ========================================

function evaluate(input) {
    const tokens = tokenize(input);
    let position = 0;

    function parseExpression() {
        let value = parseTerm();

        while (
            tokens[position] === "+" ||
            tokens[position] === "-"
        ) {
            const operator = tokens[position++];
            const right = parseTerm();

            value = operator === "+"
                ? value + right
                : value - right;
        }

        return value;
    }

    function parseTerm() {
        let value = parseFactor();

        while (
            tokens[position] === "*" ||
            tokens[position] === "/"
        ) {
            const operator = tokens[position++];
            const right = parseFactor();

            if (operator === "/" && right === 0) {
                throw new Error("Division by zero");
            }

            value = operator === "*"
                ? value * right
                : value / right;
        }

        return value;
    }

    function parseFactor() {
        const token = tokens[position++];

        // Support unary positive and negative signs.
        if (token === "+") {
            return parseFactor();
        }

        if (token === "-") {
            return -parseFactor();
        }

        // Evaluate expressions inside parentheses.
        if (token === "(") {
            const value = parseExpression();

            if (tokens[position] !== ")") {
                throw new Error("Missing closing parenthesis");
            }

            position++;
            return value;
        }

        if (typeof token !== "number" || !Number.isFinite(token)) {
            throw new Error("Invalid expression");
        }

        return token;
    }

    const answer = parseExpression();

    // Reject incomplete expressions and extra tokens.
    if (position !== tokens.length) {
        throw new Error("Invalid expression");
    }

    if (!Number.isFinite(answer)) {
        throw new Error("Invalid result");
    }

    return answer;
}

// ========================================
// 6. Calculate and display the result
// ========================================

function calculate() {
    if (errorDisplayed || !expression.trim()) {
        return;
    }

    try {
        const answer = evaluate(expression);

        // Limit floating-point display noise.
        const formattedAnswer = Number(answer.toPrecision(12));

        expressionDisplay.textContent = formatExpression(expression);
        resultDisplay.textContent = String(formattedAnswer);

        expression = String(formattedAnswer);
        justCalculated = true;
    } catch (error) {
        showError(
            error.message === "Division by zero"
                ? "Cannot divide by zero"
                : "Invalid expression"
        );
    }
}

// ========================================
// 7. Mouse and touch interaction
// Event delegation handles all calculator keys.
// ========================================

keypad.addEventListener("click", (event) => {
    const button = event.target.closest("button");

    if (!button || !keypad.contains(button)) {
        return;
    }

    const { value, action } = button.dataset;

    if (value !== undefined) {
        appendValue(value);
        return;
    }

    switch (action) {
        case "clear":
            clearCalculator();
            break;

        case "delete":
            deleteLast();
            break;

        case "calculate":
            calculate();
            break;
    }
});

// ========================================
// 8. Keyboard support
// ========================================

document.addEventListener("keydown", (event) => {
    const { key } = event;

    // Numbers and decimal point.
    if (/^[0-9.]$/.test(key)) {
        event.preventDefault();
        appendValue(key);
        return;
    }

    // Mathematical operators and parentheses.
    if ("+-*/()".includes(key)) {
        event.preventDefault();
        appendValue(key);
        return;
    }

    switch (key) {
        case "Enter":
        case "=":
            event.preventDefault();
            calculate();
            break;

        case "Backspace":
            event.preventDefault();
            deleteLast();
            break;

        case "Escape":
        case "Delete":
            event.preventDefault();
            clearCalculator();
            break;
    }
});
