"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class BoardEditor {
    constructor() {
        this.cellSizePx = 0;
        this.boardState = {
            id: null,
            name: "My New Board",
            rows: 5,
            cols: 5,
            dots: []
        };
        this.availableColors = [
            "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF",
            "#FFA500", "#800080", "#A52A2A", "#008000"
        ];
        this.selectedColor = null;
        this.firstDotOfPair = null;
        this.MAX_GRID_DIMENSION_PX = 400;
        this.MIN_CELL_SIZE_PX = 10;
        this.gridContainer = document.getElementById('grid-container');
        this.numRowsInput = document.getElementById('numRows');
        this.numColsInput = document.getElementById('numCols');
        this.boardNameInput = document.getElementById('boardName');
        this.generateGridButton = document.getElementById('generateGridButton');
        this.saveBoardButton = document.getElementById('saveBoardButton');
        this.colorPaletteContainer = document.getElementById('color-palette');
        this.selectedColorDisplay = document.getElementById('selected-color-display');
        this.messagesDiv = document.getElementById('messages');
        this.boardIdInput = document.getElementById('boardId');
        this.saveAsImageButton = document.getElementById('saveAsImageButton');
        const csrfTokenElement = document.querySelector('[name=csrfmiddlewaretoken]');
        this.csrfToken = csrfTokenElement ? csrfTokenElement.value : '';
        this.loadInitialBoardData();
        this.initEventListeners();
        this.populateColorPalette();
        if (!this.boardState.id) {
            this.updateBoardStateFromInputs();
        }
        this.renderGrid();
    }
    loadInitialBoardData() {
        const initialDataScript = document.getElementById('initial-board-data');
        if (initialDataScript && initialDataScript.textContent) {
            try {
                const data = JSON.parse(initialDataScript.textContent);
                if (data && data.id) {
                    this.boardState.id = data.id;
                    this.boardState.name = data.name;
                    this.boardState.rows = data.rows;
                    this.boardState.cols = data.cols;
                    this.boardState.dots = data.dots_config || [];
                    this.boardNameInput.value = this.boardState.name;
                    this.numRowsInput.value = this.boardState.rows.toString();
                    this.numColsInput.value = this.boardState.cols.toString();
                }
            }
            catch (e) {
                console.error("Error parsing initial board data:", e);
            }
        }
    }
    initEventListeners() {
        this.saveAsImageButton.addEventListener('click', () => this.handleSaveAsImage());
        this.generateGridButton.addEventListener('click', () => {
            const oldRows = this.boardState.rows;
            const oldCols = this.boardState.cols;
            const newRows = parseInt(this.numRowsInput.value, 10);
            const newCols = parseInt(this.numColsInput.value, 10);
            if (this.boardState.rows !== newRows || this.boardState.cols !== newCols) {
                this.boardState.dots = this.boardState.dots.filter(dot => dot.row < newRows && dot.col < newCols);
                this.firstDotOfPair = null;
            }
            this.boardState.rows = newRows;
            this.boardState.cols = newCols;
            this.renderGrid();
        });
        this.saveBoardButton.addEventListener('click', () => this.saveBoard());
        this.boardNameInput.addEventListener('input', () => {
            this.boardState.name = this.boardNameInput.value;
            const titleDisplay = document.getElementById('board-title-display');
            if (titleDisplay)
                titleDisplay.textContent = this.boardState.name;
        });
    }
    updateBoardStateFromInputs() {
        this.boardState.name = this.boardNameInput.value;
        this.boardState.rows = parseInt(this.numRowsInput.value, 10) || 5;
        this.boardState.cols = parseInt(this.numColsInput.value, 10) || 5;
    }
    populateColorPalette() {
        this.availableColors.forEach(color => {
            const colorButton = document.createElement('div');
            colorButton.classList.add('color-button');
            colorButton.style.backgroundColor = color;
            colorButton.dataset.color = color;
            colorButton.addEventListener('click', () => this.selectColor(color, colorButton));
            this.colorPaletteContainer.appendChild(colorButton);
        });
    }
    selectColor(color, buttonElement) {
        this.selectedColor = color;
        this.firstDotOfPair = null;
        this.selectedColorDisplay.textContent = color;
        this.selectedColorDisplay.style.color = color;
        document.querySelectorAll('.color-button.selected').forEach(btn => btn.classList.remove('selected'));
        buttonElement.classList.add('selected');
    }
    renderGrid() {
        this.gridContainer.innerHTML = '';
        const numRows = this.boardState.rows;
        const numCols = this.boardState.cols;
        if (numRows <= 0 || numCols <= 0) {
            this.gridContainer.style.width = '0px';
            this.gridContainer.style.height = '0px';
            return;
        }
        let calculatedCellSizePx;
        const cellWidthIfLimitedByCols = this.MAX_GRID_DIMENSION_PX / numCols;
        const cellHeightIfLimitedByRows = this.MAX_GRID_DIMENSION_PX / numRows;
        calculatedCellSizePx = Math.floor(Math.min(cellWidthIfLimitedByCols, cellHeightIfLimitedByRows));
        calculatedCellSizePx = Math.max(calculatedCellSizePx, this.MIN_CELL_SIZE_PX);
        this.cellSizePx = calculatedCellSizePx;
        const totalGridWidth = this.cellSizePx * numCols;
        const totalGridHeight = this.cellSizePx * numRows;
        this.gridContainer.style.width = `${totalGridWidth}px`;
        this.gridContainer.style.height = `${totalGridHeight}px`;
        this.gridContainer.style.gridTemplateRows = `repeat(${numRows}, ${this.cellSizePx}px)`;
        this.gridContainer.style.gridTemplateColumns = `repeat(${numCols}, ${this.cellSizePx}px)`;
        for (let r = 0; r < numRows; r++) {
            for (let c = 0; c < numCols; c++) {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell');
                cell.dataset.row = r.toString();
                cell.dataset.col = c.toString();
                cell.addEventListener('click', () => this.handleCellClick(r, c));
                this.gridContainer.appendChild(cell);
            }
        }
        this.renderDots();
    }
    renderDots() {
        this.gridContainer.querySelectorAll('.dot-visual').forEach(dv => dv.remove());
        this.boardState.dots.forEach(dot => {
            const cell = this.gridContainer.querySelector(`.grid-cell[data-row='${dot.row}'][data-col='${dot.col}']`);
            if (cell) {
                const dotVisual = document.createElement('div');
                dotVisual.classList.add('dot-visual');
                dotVisual.style.backgroundColor = dot.color;
                cell.appendChild(dotVisual);
            }
        });
    }
    handleCellClick(row, col) {
        if (!this.selectedColor) {
            this.showMessage("Please select a color first.", "error");
            return;
        }
        const existingDotIndex = this.boardState.dots.findIndex(d => d.row === row && d.col === col);
        if (existingDotIndex !== -1) {
            const existingDot = this.boardState.dots[existingDotIndex];
            if (existingDot.color === this.selectedColor) {
                this.boardState.dots.splice(existingDotIndex, 1);
                if (this.firstDotOfPair && this.firstDotOfPair.row === row && this.firstDotOfPair.col === col) {
                    this.firstDotOfPair = null;
                }
                this.renderDots();
                this.showMessage(`Dot removed from (${row}, ${col}).`, "info");
            }
            else {
                this.showMessage("Cell is already occupied by a different color.", "error");
            }
            return;
        }
        const dotsOfSelectedColor = this.boardState.dots.filter(d => d.color === this.selectedColor);
        if (dotsOfSelectedColor.length >= 2) {
            this.showMessage(`Already placed two dots for color ${this.selectedColor}. Select a different color or remove existing dots of this color.`, "error");
            return;
        }
        const newDot = { row, col, color: this.selectedColor };
        if (!this.firstDotOfPair) {
            this.boardState.dots.push(newDot);
            this.firstDotOfPair = { row, col };
            this.showMessage(`First dot of color ${this.selectedColor} placed at (${row}, ${col}). Click another empty cell.`, "info");
        }
        else {
            if (this.firstDotOfPair.row === row && this.firstDotOfPair.col === col) { // Prevent placing second dot on the first dot's cell
                this.showMessage("Cannot place the second dot on the same cell as the first.", "error");
                return;
            }
            this.boardState.dots.push(newDot);
            this.showMessage(`Second dot of color ${this.selectedColor} placed at (${row}, ${col}). Pair complete.`, "success");
            this.firstDotOfPair = null;
        }
        this.renderDots();
    }
    saveBoard() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.boardNameInput.value.trim()) {
                this.showMessage("Board name cannot be empty.", "error");
                return;
            }
            this.boardState.name = this.boardNameInput.value.trim();
            const colorCounts = {};
            this.boardState.dots.forEach(dot => {
                colorCounts[dot.color] = (colorCounts[dot.color] || 0) + 1;
            });
            for (const color in colorCounts) {
                if (colorCounts[color] === 1) {
                    this.showMessage(`Color ${color} has only one dot. Please complete the pair or remove it.`, "error");
                    return;
                }
            }
            const payload = {
                id: this.boardState.id,
                name: this.boardState.name,
                rows: this.boardState.rows,
                cols: this.boardState.cols,
                dots_config: this.boardState.dots
            };
            try {
                const response = yield fetch('/board/api/save_board/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': this.csrfToken,
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify(payload)
                });
                const result = yield response.json();
                if (response.ok) {
                    this.showMessage(result.message || "Board saved successfully!", "success");
                    if (result.board_id) {
                        this.boardState.id = result.board_id;
                        this.boardIdInput.value = result.board_id.toString();
                        const titleDisplay = document.getElementById('board-title-display');
                        if (titleDisplay) {
                            titleDisplay.textContent = this.boardState.name;
                        }
                        else {
                            const h1 = document.querySelector('h1');
                            if (h1)
                                h1.innerHTML = `Edit Board: <span id="board-title-display">${this.boardState.name}</span>`;
                        }
                        if (this.boardState.id && !window.location.pathname.includes(this.boardState.id.toString())) {
                            window.history.pushState({}, '', `/board/${this.boardState.id}/edit/`);
                        }
                    }
                }
                else {
                    let errorMsg = result.message || "Failed to save board.";
                    if (result.errors) {
                        errorMsg += "<ul>";
                        for (const field in result.errors) {
                            result.errors[field].forEach((err) => {
                                errorMsg += `<li>${field}: ${err}</li>`;
                            });
                        }
                        errorMsg += "</ul>";
                    }
                    this.showMessage(errorMsg, "error", false);
                }
            }
            catch (error) {
                console.error("Error saving board:", error);
                this.showMessage("An unexpected error occurred while saving.", "error");
            }
        });
    }
    getBoardAsImageDataURL() {
        return __awaiter(this, arguments, void 0, function* (format = 'image/png') {
            const rows = this.boardState.rows;
            const cols = this.boardState.cols;
            const dots = this.boardState.dots;
            if (rows <= 0 || cols <= 0 || this.cellSizePx <= 0) {
                console.error("Board dimensions or cell size invalid for image generation.");
                return null;
            }
            const canvas = document.createElement('canvas');
            const canvasWidth = cols * this.cellSizePx;
            const canvasHeight = rows * this.cellSizePx;
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error("Could not get 2D context from canvas");
                return null;
            }
            // 1. Draw background (optional)
            ctx.fillStyle = "#FFFFFF"; // White background
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // 2. Draw grid lines
            ctx.strokeStyle = "#CCCCCC"; // Light grey for grid lines
            ctx.lineWidth = 1;
            for (let r = 0; r <= rows; r++) {
                ctx.beginPath();
                ctx.moveTo(0, r * this.cellSizePx);
                ctx.lineTo(canvas.width, r * this.cellSizePx);
                ctx.stroke();
            }
            for (let c = 0; c <= cols; c++) {
                ctx.beginPath();
                ctx.moveTo(c * this.cellSizePx, 0);
                ctx.lineTo(c * this.cellSizePx, canvas.height);
                ctx.stroke();
            }
            // 3. Draw the colored dots
            const dotRadius = this.cellSizePx * 0.35; // 35% of cell size for dot radius
            dots.forEach(dot => {
                const centerX = dot.col * this.cellSizePx + this.cellSizePx / 2;
                const centerY = dot.row * this.cellSizePx + this.cellSizePx / 2;
                ctx.beginPath();
                ctx.arc(centerX, centerY, dotRadius, 0, 2 * Math.PI, false);
                ctx.fillStyle = dot.color;
                ctx.fill();
                // Optional: add a border to dots
                // ctx.lineWidth = 1;
                // ctx.strokeStyle = '#333333';
                // ctx.stroke();
            });
            return canvas.toDataURL(format);
        });
    }
    handleSaveAsImage() {
        return __awaiter(this, void 0, void 0, function* () {
            this.showMessage("Generating image...", "info", false);
            const imageDataURL = yield this.getBoardAsImageDataURL();
            if (!imageDataURL) {
                this.showMessage("Failed to generate image data.", "error");
                return;
            }
            // Prepare data for backend
            const boardName = this.boardState.name || "Generated Grid Board";
            const fileName = `${boardName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`;
            const payload = {
                name: boardName, // Name for the UserImage
                image_data_url: imageDataURL,
                filename: fileName // Suggested filename
            };
            try {
                const response = yield fetch('/api/save_grid_as_image/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': this.csrfToken,
                    },
                    body: JSON.stringify(payload)
                });
                const result = yield response.json();
                if (response.ok && result.status === 'success') {
                    this.showMessage(`Board saved as image: ${result.image_name}. You can now use it for path editing.`, "success");
                    // Optionally redirect or update UI
                }
                else {
                    this.showMessage(result.message || "Failed to save board as image on server.", "error");
                }
            }
            catch (error) {
                console.error("Error saving board as image:", error);
                this.showMessage("An error occurred while sending image to server.", "error");
            }
        });
    }
    showMessage(message, type, autoClear = true) {
        this.messagesDiv.innerHTML = `<p class="${type}">${message}</p>`;
        if (autoClear) {
            setTimeout(() => {
                this.messagesDiv.innerHTML = '';
            }, 5000);
        }
    }
}
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('grid-container')) {
        new BoardEditor();
    }
});
//# sourceMappingURL=grid.js.map