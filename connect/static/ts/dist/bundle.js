/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./static/ts/src/main.ts":
/*!*******************************!*\
  !*** ./static/ts/src/main.ts ***!
  \*******************************/
/***/ (function() {


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
        let cellSizePx;
        const cellWidthIfLimitedByCols = this.MAX_GRID_DIMENSION_PX / numCols;
        const cellHeightIfLimitedByRows = this.MAX_GRID_DIMENSION_PX / numRows;
        cellSizePx = Math.floor(Math.min(cellWidthIfLimitedByCols, cellHeightIfLimitedByRows));
        cellSizePx = Math.max(cellSizePx, this.MIN_CELL_SIZE_PX);
        const totalGridWidth = cellSizePx * numCols;
        const totalGridHeight = cellSizePx * numRows;
        this.gridContainer.style.width = `${totalGridWidth}px`;
        this.gridContainer.style.height = `${totalGridHeight}px`;
        this.gridContainer.style.gridTemplateRows = `repeat(${numRows}, ${cellSizePx}px)`;
        this.gridContainer.style.gridTemplateColumns = `repeat(${numCols}, ${cellSizePx}px)`;
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


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__["./static/ts/src/main.ts"]();
/******/ 	
/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUUsSUFBSSxDQUFDLENBQUM7UUFDYixDQUFDO0lBQ0wsQ0FBQztDQUNKO0FBRUQsUUFBUSxDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtJQUMvQyxJQUFJLFFBQVEsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDO1FBQzVDLElBQUksV0FBVyxFQUFFLENBQUM7SUFDdEIsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDOzs7Ozs7OztVRWpWSDtVQUNBO1VBQ0E7VUFDQTtVQUNBIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vY29ubmVjdC8uL3N0YXRpYy90cy9zcmMvbWFpbi50cyIsIndlYnBhY2s6Ly9jb25uZWN0L3dlYnBhY2svYmVmb3JlLXN0YXJ0dXAiLCJ3ZWJwYWNrOi8vY29ubmVjdC93ZWJwYWNrL3N0YXJ0dXAiLCJ3ZWJwYWNrOi8vY29ubmVjdC93ZWJwYWNrL2FmdGVyLXN0YXJ0dXAiXSwic291cmNlc0NvbnRlbnQiOlsiaW50ZXJmYWNlIERvdCB7XG4gICAgcm93OiBudW1iZXI7XG4gICAgY29sOiBudW1iZXI7XG4gICAgY29sb3I6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIEJvYXJkU3RhdGUge1xuICAgIGlkOiBudW1iZXIgfCBudWxsO1xuICAgIG5hbWU6IHN0cmluZztcbiAgICByb3dzOiBudW1iZXI7XG4gICAgY29sczogbnVtYmVyO1xuICAgIGRvdHM6IERvdFtdO1xufVxuXG5jbGFzcyBCb2FyZEVkaXRvciB7XG4gICAgcHJpdmF0ZSBncmlkQ29udGFpbmVyOiBIVE1MRWxlbWVudDtcbiAgICBwcml2YXRlIG51bVJvd3NJbnB1dDogSFRNTElucHV0RWxlbWVudDtcbiAgICBwcml2YXRlIG51bUNvbHNJbnB1dDogSFRNTElucHV0RWxlbWVudDtcbiAgICBwcml2YXRlIGJvYXJkTmFtZUlucHV0OiBIVE1MSW5wdXRFbGVtZW50O1xuICAgIHByaXZhdGUgZ2VuZXJhdGVHcmlkQnV0dG9uOiBIVE1MQnV0dG9uRWxlbWVudDtcbiAgICBwcml2YXRlIHNhdmVCb2FyZEJ1dHRvbjogSFRNTEJ1dHRvbkVsZW1lbnQ7XG4gICAgcHJpdmF0ZSBjb2xvclBhbGV0dGVDb250YWluZXI6IEhUTUxFbGVtZW50O1xuICAgIHByaXZhdGUgc2VsZWN0ZWRDb2xvckRpc3BsYXk6IEhUTUxFbGVtZW50O1xuICAgIHByaXZhdGUgbWVzc2FnZXNEaXY6IEhUTUxFbGVtZW50O1xuICAgIHByaXZhdGUgY3NyZlRva2VuOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBib2FyZElkSW5wdXQ6IEhUTUxJbnB1dEVsZW1lbnQ7XG5cbiAgICBwcml2YXRlIGJvYXJkU3RhdGU6IEJvYXJkU3RhdGUgPSB7XG4gICAgICAgIGlkOiBudWxsLFxuICAgICAgICBuYW1lOiBcIk15IE5ldyBCb2FyZFwiLFxuICAgICAgICByb3dzOiA1LFxuICAgICAgICBjb2xzOiA1LFxuICAgICAgICBkb3RzOiBbXVxuICAgIH07XG5cbiAgICBwcml2YXRlIGF2YWlsYWJsZUNvbG9yczogc3RyaW5nW10gPSBbXG4gICAgICAgIFwiI0ZGMDAwMFwiLCBcIiMwMEZGMDBcIiwgXCIjMDAwMEZGXCIsIFwiI0ZGRkYwMFwiLCBcIiNGRjAwRkZcIiwgXCIjMDBGRkZGXCIsXG4gICAgICAgIFwiI0ZGQTUwMFwiLCBcIiM4MDAwODBcIiwgXCIjQTUyQTJBXCIsIFwiIzAwODAwMFwiXG4gICAgXTtcbiAgICBwcml2YXRlIHNlbGVjdGVkQ29sb3I6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgZmlyc3REb3RPZlBhaXI6IHsgcm93OiBudW1iZXIsIGNvbDogbnVtYmVyIH0gfCBudWxsID0gbnVsbDtcbiAgICBwcml2YXRlIHJlYWRvbmx5IE1BWF9HUklEX0RJTUVOU0lPTl9QWCA9IDQwMDtcbiAgICBwcml2YXRlIHJlYWRvbmx5IE1JTl9DRUxMX1NJWkVfUFggPSAxMDtcblxuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuZ3JpZENvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdncmlkLWNvbnRhaW5lcicpITtcbiAgICAgICAgdGhpcy5udW1Sb3dzSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbnVtUm93cycpIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XG4gICAgICAgIHRoaXMubnVtQ29sc0lucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ251bUNvbHMnKSBhcyBIVE1MSW5wdXRFbGVtZW50O1xuICAgICAgICB0aGlzLmJvYXJkTmFtZUlucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JvYXJkTmFtZScpIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XG4gICAgICAgIHRoaXMuZ2VuZXJhdGVHcmlkQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dlbmVyYXRlR3JpZEJ1dHRvbicpIGFzIEhUTUxCdXR0b25FbGVtZW50O1xuICAgICAgICB0aGlzLnNhdmVCb2FyZEJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzYXZlQm9hcmRCdXR0b24nKSBhcyBIVE1MQnV0dG9uRWxlbWVudDtcbiAgICAgICAgdGhpcy5jb2xvclBhbGV0dGVDb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29sb3ItcGFsZXR0ZScpITtcbiAgICAgICAgdGhpcy5zZWxlY3RlZENvbG9yRGlzcGxheSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzZWxlY3RlZC1jb2xvci1kaXNwbGF5JykhO1xuICAgICAgICB0aGlzLm1lc3NhZ2VzRGl2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21lc3NhZ2VzJykhO1xuICAgICAgICB0aGlzLmJvYXJkSWRJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdib2FyZElkJykgYXMgSFRNTElucHV0RWxlbWVudDtcblxuICAgICAgICBjb25zdCBjc3JmVG9rZW5FbGVtZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW25hbWU9Y3NyZm1pZGRsZXdhcmV0b2tlbl0nKSBhcyBIVE1MSW5wdXRFbGVtZW50O1xuICAgICAgICB0aGlzLmNzcmZUb2tlbiA9IGNzcmZUb2tlbkVsZW1lbnQgPyBjc3JmVG9rZW5FbGVtZW50LnZhbHVlIDogJyc7XG5cbiAgICAgICAgdGhpcy5sb2FkSW5pdGlhbEJvYXJkRGF0YSgpO1xuICAgICAgICB0aGlzLmluaXRFdmVudExpc3RlbmVycygpO1xuICAgICAgICB0aGlzLnBvcHVsYXRlQ29sb3JQYWxldHRlKCk7XG4gICAgICAgIGlmICghdGhpcy5ib2FyZFN0YXRlLmlkKSB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUJvYXJkU3RhdGVGcm9tSW5wdXRzKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZW5kZXJHcmlkKCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBsb2FkSW5pdGlhbEJvYXJkRGF0YSgpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgaW5pdGlhbERhdGFTY3JpcHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaW5pdGlhbC1ib2FyZC1kYXRhJyk7XG4gICAgICAgIGlmIChpbml0aWFsRGF0YVNjcmlwdCAmJiBpbml0aWFsRGF0YVNjcmlwdC50ZXh0Q29udGVudCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZShpbml0aWFsRGF0YVNjcmlwdC50ZXh0Q29udGVudCk7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEgJiYgZGF0YS5pZCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmJvYXJkU3RhdGUuaWQgPSBkYXRhLmlkO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmJvYXJkU3RhdGUubmFtZSA9IGRhdGEubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ib2FyZFN0YXRlLnJvd3MgPSBkYXRhLnJvd3M7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYm9hcmRTdGF0ZS5jb2xzID0gZGF0YS5jb2xzO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmJvYXJkU3RhdGUuZG90cyA9IGRhdGEuZG90c19jb25maWcgfHwgW107XG5cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ib2FyZE5hbWVJbnB1dC52YWx1ZSA9IHRoaXMuYm9hcmRTdGF0ZS5uYW1lO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm51bVJvd3NJbnB1dC52YWx1ZSA9IHRoaXMuYm9hcmRTdGF0ZS5yb3dzLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubnVtQ29sc0lucHV0LnZhbHVlID0gdGhpcy5ib2FyZFN0YXRlLmNvbHMudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIkVycm9yIHBhcnNpbmcgaW5pdGlhbCBib2FyZCBkYXRhOlwiLCBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgaW5pdEV2ZW50TGlzdGVuZXJzKCk6IHZvaWQge1xuICAgICAgICB0aGlzLmdlbmVyYXRlR3JpZEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG9sZFJvd3MgPSB0aGlzLmJvYXJkU3RhdGUucm93cztcbiAgICAgICAgICAgIGNvbnN0IG9sZENvbHMgPSB0aGlzLmJvYXJkU3RhdGUuY29scztcbiAgICAgICAgICAgIGNvbnN0IG5ld1Jvd3MgPSBwYXJzZUludCh0aGlzLm51bVJvd3NJbnB1dC52YWx1ZSwgMTApO1xuICAgICAgICAgICAgY29uc3QgbmV3Q29scyA9IHBhcnNlSW50KHRoaXMubnVtQ29sc0lucHV0LnZhbHVlLCAxMCk7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLmJvYXJkU3RhdGUucm93cyAhPT0gbmV3Um93cyB8fCB0aGlzLmJvYXJkU3RhdGUuY29scyAhPT0gbmV3Q29scykge1xuICAgICAgICAgICAgICAgICB0aGlzLmJvYXJkU3RhdGUuZG90cyA9IHRoaXMuYm9hcmRTdGF0ZS5kb3RzLmZpbHRlcihkb3QgPT5cbiAgICAgICAgICAgICAgICAgICAgZG90LnJvdyA8IG5ld1Jvd3MgJiYgZG90LmNvbCA8IG5ld0NvbHNcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIHRoaXMuZmlyc3REb3RPZlBhaXIgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5ib2FyZFN0YXRlLnJvd3MgPSBuZXdSb3dzO1xuICAgICAgICAgICAgdGhpcy5ib2FyZFN0YXRlLmNvbHMgPSBuZXdDb2xzO1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJHcmlkKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuc2F2ZUJvYXJkQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gdGhpcy5zYXZlQm9hcmQoKSk7XG5cbiAgICAgICAgdGhpcy5ib2FyZE5hbWVJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuYm9hcmRTdGF0ZS5uYW1lID0gdGhpcy5ib2FyZE5hbWVJbnB1dC52YWx1ZTtcbiAgICAgICAgICAgICBjb25zdCB0aXRsZURpc3BsYXkgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYm9hcmQtdGl0bGUtZGlzcGxheScpO1xuICAgICAgICAgICAgIGlmKHRpdGxlRGlzcGxheSkgdGl0bGVEaXNwbGF5LnRleHRDb250ZW50ID0gdGhpcy5ib2FyZFN0YXRlLm5hbWU7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgdXBkYXRlQm9hcmRTdGF0ZUZyb21JbnB1dHMoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuYm9hcmRTdGF0ZS5uYW1lID0gdGhpcy5ib2FyZE5hbWVJbnB1dC52YWx1ZTtcbiAgICAgICAgdGhpcy5ib2FyZFN0YXRlLnJvd3MgPSBwYXJzZUludCh0aGlzLm51bVJvd3NJbnB1dC52YWx1ZSwgMTApIHx8IDU7XG4gICAgICAgIHRoaXMuYm9hcmRTdGF0ZS5jb2xzID0gcGFyc2VJbnQodGhpcy5udW1Db2xzSW5wdXQudmFsdWUsIDEwKSB8fCA1O1xuICAgIH1cblxuICAgIHByaXZhdGUgcG9wdWxhdGVDb2xvclBhbGV0dGUoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuYXZhaWxhYmxlQ29sb3JzLmZvckVhY2goY29sb3IgPT4ge1xuICAgICAgICAgICAgY29uc3QgY29sb3JCdXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIGNvbG9yQnV0dG9uLmNsYXNzTGlzdC5hZGQoJ2NvbG9yLWJ1dHRvbicpO1xuICAgICAgICAgICAgY29sb3JCdXR0b24uc3R5bGUuYmFja2dyb3VuZENvbG9yID0gY29sb3I7XG4gICAgICAgICAgICBjb2xvckJ1dHRvbi5kYXRhc2V0LmNvbG9yID0gY29sb3I7XG4gICAgICAgICAgICBjb2xvckJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHRoaXMuc2VsZWN0Q29sb3IoY29sb3IsIGNvbG9yQnV0dG9uKSk7XG4gICAgICAgICAgICB0aGlzLmNvbG9yUGFsZXR0ZUNvbnRhaW5lci5hcHBlbmRDaGlsZChjb2xvckJ1dHRvbik7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgc2VsZWN0Q29sb3IoY29sb3I6IHN0cmluZywgYnV0dG9uRWxlbWVudDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5zZWxlY3RlZENvbG9yID0gY29sb3I7XG4gICAgICAgIHRoaXMuZmlyc3REb3RPZlBhaXIgPSBudWxsO1xuICAgICAgICB0aGlzLnNlbGVjdGVkQ29sb3JEaXNwbGF5LnRleHRDb250ZW50ID0gY29sb3I7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRDb2xvckRpc3BsYXkuc3R5bGUuY29sb3IgPSBjb2xvcjtcblxuICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuY29sb3ItYnV0dG9uLnNlbGVjdGVkJykuZm9yRWFjaChidG4gPT4gYnRuLmNsYXNzTGlzdC5yZW1vdmUoJ3NlbGVjdGVkJykpO1xuICAgICAgICBidXR0b25FbGVtZW50LmNsYXNzTGlzdC5hZGQoJ3NlbGVjdGVkJyk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSByZW5kZXJHcmlkKCk6IHZvaWQge1xuICAgICAgICB0aGlzLmdyaWRDb250YWluZXIuaW5uZXJIVE1MID0gJyc7XG5cbiAgICAgICAgY29uc3QgbnVtUm93cyA9IHRoaXMuYm9hcmRTdGF0ZS5yb3dzO1xuICAgICAgICBjb25zdCBudW1Db2xzID0gdGhpcy5ib2FyZFN0YXRlLmNvbHM7XG5cbiAgICAgICAgaWYgKG51bVJvd3MgPD0gMCB8fCBudW1Db2xzIDw9IDApIHtcbiAgICAgICAgICAgIHRoaXMuZ3JpZENvbnRhaW5lci5zdHlsZS53aWR0aCA9ICcwcHgnO1xuICAgICAgICAgICAgdGhpcy5ncmlkQ29udGFpbmVyLnN0eWxlLmhlaWdodCA9ICcwcHgnO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGNlbGxTaXplUHg6IG51bWJlcjtcbiAgICAgICAgY29uc3QgY2VsbFdpZHRoSWZMaW1pdGVkQnlDb2xzID0gdGhpcy5NQVhfR1JJRF9ESU1FTlNJT05fUFggLyBudW1Db2xzO1xuICAgICAgICBjb25zdCBjZWxsSGVpZ2h0SWZMaW1pdGVkQnlSb3dzID0gdGhpcy5NQVhfR1JJRF9ESU1FTlNJT05fUFggLyBudW1Sb3dzO1xuXG4gICAgICAgIGNlbGxTaXplUHggPSBNYXRoLmZsb29yKE1hdGgubWluKGNlbGxXaWR0aElmTGltaXRlZEJ5Q29scywgY2VsbEhlaWdodElmTGltaXRlZEJ5Um93cykpO1xuICAgICAgICBjZWxsU2l6ZVB4ID0gTWF0aC5tYXgoY2VsbFNpemVQeCwgdGhpcy5NSU5fQ0VMTF9TSVpFX1BYKTtcblxuICAgICAgICBjb25zdCB0b3RhbEdyaWRXaWR0aCA9IGNlbGxTaXplUHggKiBudW1Db2xzO1xuICAgICAgICBjb25zdCB0b3RhbEdyaWRIZWlnaHQgPSBjZWxsU2l6ZVB4ICogbnVtUm93cztcblxuICAgICAgICB0aGlzLmdyaWRDb250YWluZXIuc3R5bGUud2lkdGggPSBgJHt0b3RhbEdyaWRXaWR0aH1weGA7XG4gICAgICAgIHRoaXMuZ3JpZENvbnRhaW5lci5zdHlsZS5oZWlnaHQgPSBgJHt0b3RhbEdyaWRIZWlnaHR9cHhgO1xuXG4gICAgICAgIHRoaXMuZ3JpZENvbnRhaW5lci5zdHlsZS5ncmlkVGVtcGxhdGVSb3dzID0gYHJlcGVhdCgke251bVJvd3N9LCAke2NlbGxTaXplUHh9cHgpYDtcbiAgICAgICAgdGhpcy5ncmlkQ29udGFpbmVyLnN0eWxlLmdyaWRUZW1wbGF0ZUNvbHVtbnMgPSBgcmVwZWF0KCR7bnVtQ29sc30sICR7Y2VsbFNpemVQeH1weClgO1xuXG4gICAgICAgIGZvciAobGV0IHIgPSAwOyByIDwgbnVtUm93czsgcisrKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IG51bUNvbHM7IGMrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNlbGwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICBjZWxsLmNsYXNzTGlzdC5hZGQoJ2dyaWQtY2VsbCcpO1xuICAgICAgICAgICAgICAgIGNlbGwuZGF0YXNldC5yb3cgPSByLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgY2VsbC5kYXRhc2V0LmNvbCA9IGMudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICBjZWxsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gdGhpcy5oYW5kbGVDZWxsQ2xpY2sociwgYykpO1xuICAgICAgICAgICAgICAgIHRoaXMuZ3JpZENvbnRhaW5lci5hcHBlbmRDaGlsZChjZWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlbmRlckRvdHMoKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHJlbmRlckRvdHMoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuZ3JpZENvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZG90LXZpc3VhbCcpLmZvckVhY2goZHYgPT4gZHYucmVtb3ZlKCkpO1xuXG4gICAgICAgIHRoaXMuYm9hcmRTdGF0ZS5kb3RzLmZvckVhY2goZG90ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNlbGwgPSB0aGlzLmdyaWRDb250YWluZXIucXVlcnlTZWxlY3RvcihgLmdyaWQtY2VsbFtkYXRhLXJvdz0nJHtkb3Qucm93fSddW2RhdGEtY29sPScke2RvdC5jb2x9J11gKTtcbiAgICAgICAgICAgIGlmIChjZWxsKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZG90VmlzdWFsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICAgICAgZG90VmlzdWFsLmNsYXNzTGlzdC5hZGQoJ2RvdC12aXN1YWwnKTtcbiAgICAgICAgICAgICAgICBkb3RWaXN1YWwuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gZG90LmNvbG9yO1xuICAgICAgICAgICAgICAgIGNlbGwuYXBwZW5kQ2hpbGQoZG90VmlzdWFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBoYW5kbGVDZWxsQ2xpY2socm93OiBudW1iZXIsIGNvbDogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGlmICghdGhpcy5zZWxlY3RlZENvbG9yKSB7XG4gICAgICAgICAgICB0aGlzLnNob3dNZXNzYWdlKFwiUGxlYXNlIHNlbGVjdCBhIGNvbG9yIGZpcnN0LlwiLCBcImVycm9yXCIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZXhpc3RpbmdEb3RJbmRleCA9IHRoaXMuYm9hcmRTdGF0ZS5kb3RzLmZpbmRJbmRleChkID0+IGQucm93ID09PSByb3cgJiYgZC5jb2wgPT09IGNvbCk7XG5cbiAgICAgICAgaWYgKGV4aXN0aW5nRG90SW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICBjb25zdCBleGlzdGluZ0RvdCA9IHRoaXMuYm9hcmRTdGF0ZS5kb3RzW2V4aXN0aW5nRG90SW5kZXhdO1xuICAgICAgICAgICAgaWYgKGV4aXN0aW5nRG90LmNvbG9yID09PSB0aGlzLnNlbGVjdGVkQ29sb3IpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmJvYXJkU3RhdGUuZG90cy5zcGxpY2UoZXhpc3RpbmdEb3RJbmRleCwgMSk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZmlyc3REb3RPZlBhaXIgJiYgdGhpcy5maXJzdERvdE9mUGFpci5yb3cgPT09IHJvdyAmJiB0aGlzLmZpcnN0RG90T2ZQYWlyLmNvbCA9PT0gY29sKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZmlyc3REb3RPZlBhaXIgPSBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnJlbmRlckRvdHMoKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dNZXNzYWdlKGBEb3QgcmVtb3ZlZCBmcm9tICgke3Jvd30sICR7Y29sfSkuYCwgXCJpbmZvXCIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgdGhpcy5zaG93TWVzc2FnZShcIkNlbGwgaXMgYWxyZWFkeSBvY2N1cGllZCBieSBhIGRpZmZlcmVudCBjb2xvci5cIiwgXCJlcnJvclwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGRvdHNPZlNlbGVjdGVkQ29sb3IgPSB0aGlzLmJvYXJkU3RhdGUuZG90cy5maWx0ZXIoZCA9PiBkLmNvbG9yID09PSB0aGlzLnNlbGVjdGVkQ29sb3IpO1xuXG4gICAgICAgIGlmIChkb3RzT2ZTZWxlY3RlZENvbG9yLmxlbmd0aCA+PSAyKSB7XG4gICAgICAgICAgICB0aGlzLnNob3dNZXNzYWdlKGBBbHJlYWR5IHBsYWNlZCB0d28gZG90cyBmb3IgY29sb3IgJHt0aGlzLnNlbGVjdGVkQ29sb3J9LiBTZWxlY3QgYSBkaWZmZXJlbnQgY29sb3Igb3IgcmVtb3ZlIGV4aXN0aW5nIGRvdHMgb2YgdGhpcyBjb2xvci5gLCBcImVycm9yXCIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbmV3RG90OiBEb3QgPSB7IHJvdywgY29sLCBjb2xvcjogdGhpcy5zZWxlY3RlZENvbG9yIH07XG5cbiAgICAgICAgaWYgKCF0aGlzLmZpcnN0RG90T2ZQYWlyKSB7XG4gICAgICAgICAgICB0aGlzLmJvYXJkU3RhdGUuZG90cy5wdXNoKG5ld0RvdCk7XG4gICAgICAgICAgICB0aGlzLmZpcnN0RG90T2ZQYWlyID0geyByb3csIGNvbCB9O1xuICAgICAgICAgICAgdGhpcy5zaG93TWVzc2FnZShgRmlyc3QgZG90IG9mIGNvbG9yICR7dGhpcy5zZWxlY3RlZENvbG9yfSBwbGFjZWQgYXQgKCR7cm93fSwgJHtjb2x9KS4gQ2xpY2sgYW5vdGhlciBlbXB0eSBjZWxsLmAsIFwiaW5mb1wiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmZpcnN0RG90T2ZQYWlyLnJvdyA9PT0gcm93ICYmIHRoaXMuZmlyc3REb3RPZlBhaXIuY29sID09PSBjb2wpIHsgLy8gUHJldmVudCBwbGFjaW5nIHNlY29uZCBkb3Qgb24gdGhlIGZpcnN0IGRvdCdzIGNlbGxcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dNZXNzYWdlKFwiQ2Fubm90IHBsYWNlIHRoZSBzZWNvbmQgZG90IG9uIHRoZSBzYW1lIGNlbGwgYXMgdGhlIGZpcnN0LlwiLCBcImVycm9yXCIpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuYm9hcmRTdGF0ZS5kb3RzLnB1c2gobmV3RG90KTtcbiAgICAgICAgICAgIHRoaXMuc2hvd01lc3NhZ2UoYFNlY29uZCBkb3Qgb2YgY29sb3IgJHt0aGlzLnNlbGVjdGVkQ29sb3J9IHBsYWNlZCBhdCAoJHtyb3d9LCAke2NvbH0pLiBQYWlyIGNvbXBsZXRlLmAsIFwic3VjY2Vzc1wiKTtcbiAgICAgICAgICAgIHRoaXMuZmlyc3REb3RPZlBhaXIgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVuZGVyRG90cygpO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc2F2ZUJvYXJkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoIXRoaXMuYm9hcmROYW1lSW5wdXQudmFsdWUudHJpbSgpKSB7XG4gICAgICAgICAgICB0aGlzLnNob3dNZXNzYWdlKFwiQm9hcmQgbmFtZSBjYW5ub3QgYmUgZW1wdHkuXCIsIFwiZXJyb3JcIik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5ib2FyZFN0YXRlLm5hbWUgPSB0aGlzLmJvYXJkTmFtZUlucHV0LnZhbHVlLnRyaW0oKTtcblxuICAgICAgICBjb25zdCBjb2xvckNvdW50czogeyBba2V5OiBzdHJpbmddOiBudW1iZXIgfSA9IHt9O1xuICAgICAgICB0aGlzLmJvYXJkU3RhdGUuZG90cy5mb3JFYWNoKGRvdCA9PiB7XG4gICAgICAgICAgICBjb2xvckNvdW50c1tkb3QuY29sb3JdID0gKGNvbG9yQ291bnRzW2RvdC5jb2xvcl0gfHwgMCkgKyAxO1xuICAgICAgICB9KTtcblxuICAgICAgICBmb3IgKGNvbnN0IGNvbG9yIGluIGNvbG9yQ291bnRzKSB7XG4gICAgICAgICAgICBpZiAoY29sb3JDb3VudHNbY29sb3JdID09PSAxKSB7XG4gICAgICAgICAgICAgICAgIHRoaXMuc2hvd01lc3NhZ2UoYENvbG9yICR7Y29sb3J9IGhhcyBvbmx5IG9uZSBkb3QuIFBsZWFzZSBjb21wbGV0ZSB0aGUgcGFpciBvciByZW1vdmUgaXQuYCwgXCJlcnJvclwiKTtcbiAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcGF5bG9hZCA9IHtcbiAgICAgICAgICAgIGlkOiB0aGlzLmJvYXJkU3RhdGUuaWQsXG4gICAgICAgICAgICBuYW1lOiB0aGlzLmJvYXJkU3RhdGUubmFtZSxcbiAgICAgICAgICAgIHJvd3M6IHRoaXMuYm9hcmRTdGF0ZS5yb3dzLFxuICAgICAgICAgICAgY29sczogdGhpcy5ib2FyZFN0YXRlLmNvbHMsXG4gICAgICAgICAgICBkb3RzX2NvbmZpZzogdGhpcy5ib2FyZFN0YXRlLmRvdHNcbiAgICAgICAgfTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCgnL2JvYXJkL2FwaS9zYXZlX2JvYXJkLycsIHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgICAgICAgICAgICdYLUNTUkZUb2tlbic6IHRoaXMuY3NyZlRva2VuLFxuICAgICAgICAgICAgICAgICAgICAnWC1SZXF1ZXN0ZWQtV2l0aCc6ICdYTUxIdHRwUmVxdWVzdCdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHBheWxvYWQpXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2Uub2spIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dNZXNzYWdlKHJlc3VsdC5tZXNzYWdlIHx8IFwiQm9hcmQgc2F2ZWQgc3VjY2Vzc2Z1bGx5IVwiLCBcInN1Y2Nlc3NcIik7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5ib2FyZF9pZCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmJvYXJkU3RhdGUuaWQgPSByZXN1bHQuYm9hcmRfaWQ7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYm9hcmRJZElucHV0LnZhbHVlID0gcmVzdWx0LmJvYXJkX2lkLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpdGxlRGlzcGxheSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdib2FyZC10aXRsZS1kaXNwbGF5Jyk7XG4gICAgICAgICAgICAgICAgICAgIGlmKHRpdGxlRGlzcGxheSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlRGlzcGxheS50ZXh0Q29udGVudCA9IHRoaXMuYm9hcmRTdGF0ZS5uYW1lO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaDEgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdoMScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoaDEpIGgxLmlubmVySFRNTCA9IGBFZGl0IEJvYXJkOiA8c3BhbiBpZD1cImJvYXJkLXRpdGxlLWRpc3BsYXlcIj4ke3RoaXMuYm9hcmRTdGF0ZS5uYW1lfTwvc3Bhbj5gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmJvYXJkU3RhdGUuaWQgJiYgIXdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5pbmNsdWRlcyh0aGlzLmJvYXJkU3RhdGUuaWQudG9TdHJpbmcoKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUoe30sICcnLCBgL2JvYXJkLyR7dGhpcy5ib2FyZFN0YXRlLmlkfS9lZGl0L2ApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsZXQgZXJyb3JNc2cgPSByZXN1bHQubWVzc2FnZSB8fCBcIkZhaWxlZCB0byBzYXZlIGJvYXJkLlwiO1xuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQuZXJyb3JzKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yTXNnICs9IFwiPHVsPlwiO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGZpZWxkIGluIHJlc3VsdC5lcnJvcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5lcnJvcnNbZmllbGRdLmZvckVhY2goKGVycjogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JNc2cgKz0gYDxsaT4ke2ZpZWxkfTogJHtlcnJ9PC9saT5gO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZXJyb3JNc2cgKz0gXCI8L3VsPlwiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnNob3dNZXNzYWdlKGVycm9yTXNnLCBcImVycm9yXCIsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBzYXZpbmcgYm9hcmQ6XCIsIGVycm9yKTtcbiAgICAgICAgICAgIHRoaXMuc2hvd01lc3NhZ2UoXCJBbiB1bmV4cGVjdGVkIGVycm9yIG9jY3VycmVkIHdoaWxlIHNhdmluZy5cIiwgXCJlcnJvclwiKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgc2hvd01lc3NhZ2UobWVzc2FnZTogc3RyaW5nLCB0eXBlOiAnc3VjY2VzcycgfCAnZXJyb3InIHwgJ2luZm8nLCBhdXRvQ2xlYXI6IGJvb2xlYW4gPSB0cnVlKTogdm9pZCB7XG4gICAgICAgIHRoaXMubWVzc2FnZXNEaXYuaW5uZXJIVE1MID0gYDxwIGNsYXNzPVwiJHt0eXBlfVwiPiR7bWVzc2FnZX08L3A+YDtcbiAgICAgICAgaWYgKGF1dG9DbGVhcikge1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5tZXNzYWdlc0Rpdi5pbm5lckhUTUwgPSAnJztcbiAgICAgICAgICAgIH0sIDUwMDApO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgKCkgPT4ge1xuICAgIGlmIChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ3JpZC1jb250YWluZXInKSkge1xuICAgICAgICBuZXcgQm9hcmRFZGl0b3IoKTtcbiAgICB9XG59KTsiLCIiLCIvLyBzdGFydHVwXG4vLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbi8vIFRoaXMgZW50cnkgbW9kdWxlIGlzIHJlZmVyZW5jZWQgYnkgb3RoZXIgbW9kdWxlcyBzbyBpdCBjYW4ndCBiZSBpbmxpbmVkXG52YXIgX193ZWJwYWNrX2V4cG9ydHNfXyA9IHt9O1xuX193ZWJwYWNrX21vZHVsZXNfX1tcIi4vc3RhdGljL3RzL3NyYy9tYWluLnRzXCJdKCk7XG4iLCIiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=