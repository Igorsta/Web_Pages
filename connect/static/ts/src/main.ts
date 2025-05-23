interface Dot {
    row: number;
    col: number;
    color: string;
}

interface BoardState {
    id: number | null;
    name: string;
    rows: number;
    cols: number;
    dots: Dot[];
}

class BoardEditor {
    private gridContainer: HTMLElement;
    private numRowsInput: HTMLInputElement;
    private numColsInput: HTMLInputElement;
    private boardNameInput: HTMLInputElement;
    private generateGridButton: HTMLButtonElement;
    private saveBoardButton: HTMLButtonElement;
    private colorPaletteContainer: HTMLElement;
    private selectedColorDisplay: HTMLElement;
    private messagesDiv: HTMLElement;
    private csrfToken: string;
    private boardIdInput: HTMLInputElement;

    private boardState: BoardState = {
        id: null,
        name: "My New Board",
        rows: 5,
        cols: 5,
        dots: []
    };

    private availableColors: string[] = [
        "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF",
        "#FFA500", "#800080", "#A52A2A", "#008000"
    ];
    private selectedColor: string | null = null;
    private firstDotOfPair: { row: number, col: number } | null = null;
    private readonly MAX_GRID_DIMENSION_PX = 400;
    private readonly MIN_CELL_SIZE_PX = 10;


    constructor() {
        this.gridContainer = document.getElementById('grid-container')!;
        this.numRowsInput = document.getElementById('numRows') as HTMLInputElement;
        this.numColsInput = document.getElementById('numCols') as HTMLInputElement;
        this.boardNameInput = document.getElementById('boardName') as HTMLInputElement;
        this.generateGridButton = document.getElementById('generateGridButton') as HTMLButtonElement;
        this.saveBoardButton = document.getElementById('saveBoardButton') as HTMLButtonElement;
        this.colorPaletteContainer = document.getElementById('color-palette')!;
        this.selectedColorDisplay = document.getElementById('selected-color-display')!;
        this.messagesDiv = document.getElementById('messages')!;
        this.boardIdInput = document.getElementById('boardId') as HTMLInputElement;

        const csrfTokenElement = document.querySelector('[name=csrfmiddlewaretoken]') as HTMLInputElement;
        this.csrfToken = csrfTokenElement ? csrfTokenElement.value : '';

        this.loadInitialBoardData();
        this.initEventListeners();
        this.populateColorPalette();
        if (!this.boardState.id) {
            this.updateBoardStateFromInputs();
        }
        this.renderGrid();
    }

    private loadInitialBoardData(): void {
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
            } catch (e) {
                console.error("Error parsing initial board data:", e);
            }
        }
    }

    private initEventListeners(): void {
        this.generateGridButton.addEventListener('click', () => {
            const oldRows = this.boardState.rows;
            const oldCols = this.boardState.cols;
            const newRows = parseInt(this.numRowsInput.value, 10);
            const newCols = parseInt(this.numColsInput.value, 10);

            if (this.boardState.rows !== newRows || this.boardState.cols !== newCols) {
                 this.boardState.dots = this.boardState.dots.filter(dot =>
                    dot.row < newRows && dot.col < newCols
                );
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
             if(titleDisplay) titleDisplay.textContent = this.boardState.name;
        });
    }

    private updateBoardStateFromInputs(): void {
        this.boardState.name = this.boardNameInput.value;
        this.boardState.rows = parseInt(this.numRowsInput.value, 10) || 5;
        this.boardState.cols = parseInt(this.numColsInput.value, 10) || 5;
    }

    private populateColorPalette(): void {
        this.availableColors.forEach(color => {
            const colorButton = document.createElement('div');
            colorButton.classList.add('color-button');
            colorButton.style.backgroundColor = color;
            colorButton.dataset.color = color;
            colorButton.addEventListener('click', () => this.selectColor(color, colorButton));
            this.colorPaletteContainer.appendChild(colorButton);
        });
    }

    private selectColor(color: string, buttonElement: HTMLElement): void {
        this.selectedColor = color;
        this.firstDotOfPair = null;
        this.selectedColorDisplay.textContent = color;
        this.selectedColorDisplay.style.color = color;

        document.querySelectorAll('.color-button.selected').forEach(btn => btn.classList.remove('selected'));
        buttonElement.classList.add('selected');
    }

    private renderGrid(): void {
        this.gridContainer.innerHTML = '';

        const numRows = this.boardState.rows;
        const numCols = this.boardState.cols;

        if (numRows <= 0 || numCols <= 0) {
            this.gridContainer.style.width = '0px';
            this.gridContainer.style.height = '0px';
            return;
        }

        let cellSizePx: number;
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

    private renderDots(): void {
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

    private handleCellClick(row: number, col: number): void {
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
            } else {
                 this.showMessage("Cell is already occupied by a different color.", "error");
            }
            return;
        }

        const dotsOfSelectedColor = this.boardState.dots.filter(d => d.color === this.selectedColor);

        if (dotsOfSelectedColor.length >= 2) {
            this.showMessage(`Already placed two dots for color ${this.selectedColor}. Select a different color or remove existing dots of this color.`, "error");
            return;
        }

        const newDot: Dot = { row, col, color: this.selectedColor };

        if (!this.firstDotOfPair) {
            this.boardState.dots.push(newDot);
            this.firstDotOfPair = { row, col };
            this.showMessage(`First dot of color ${this.selectedColor} placed at (${row}, ${col}). Click another empty cell.`, "info");
        } else {
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

    private async saveBoard(): Promise<void> {
        if (!this.boardNameInput.value.trim()) {
            this.showMessage("Board name cannot be empty.", "error");
            return;
        }
        this.boardState.name = this.boardNameInput.value.trim();

        const colorCounts: { [key: string]: number } = {};
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
            const response = await fetch('/board/api/save_board/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok) {
                this.showMessage(result.message || "Board saved successfully!", "success");
                if (result.board_id) {
                    this.boardState.id = result.board_id;
                    this.boardIdInput.value = result.board_id.toString();
                    const titleDisplay = document.getElementById('board-title-display');
                    if(titleDisplay) {
                         titleDisplay.textContent = this.boardState.name;
                    } else {
                        const h1 = document.querySelector('h1');
                        if(h1) h1.innerHTML = `Edit Board: <span id="board-title-display">${this.boardState.name}</span>`;
                    }
                    if (this.boardState.id && !window.location.pathname.includes(this.boardState.id.toString())) {
                         window.history.pushState({}, '', `/board/${this.boardState.id}/edit/`);
                    }
                }
            } else {
                let errorMsg = result.message || "Failed to save board.";
                if (result.errors) {
                    errorMsg += "<ul>";
                    for (const field in result.errors) {
                        result.errors[field].forEach((err: string) => {
                            errorMsg += `<li>${field}: ${err}</li>`;
                        });
                    }
                    errorMsg += "</ul>";
                }
                this.showMessage(errorMsg, "error", false);
            }
        } catch (error) {
            console.error("Error saving board:", error);
            this.showMessage("An unexpected error occurred while saving.", "error");
        }
    }

    private showMessage(message: string, type: 'success' | 'error' | 'info', autoClear: boolean = true): void {
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