// functions.ts

// Deklaracje typów dla zmiennych globalnych (zakładamy, że są zdefiniowane gdzie indziej)
declare const csrfToken: string;
declare const selectedImageId: number | null;
declare let draggedDot: HTMLElement | null;

// --- Interfejsy dla danych z serwera (opcjonalne, ale dobre dla typowania) ---
interface ClickData {
    id: number;
    x?: number;
    y?: number;
    col_index?: number;
    row_index?: number;
   
}

interface AddClickResponse {
    success: boolean;
    click_id?: number;
    is_grid_click?: boolean;
    error?: string;
}

interface UpdateClickResponse {
    status: 'success' | 'error' | 'not found or forbidden';
    message?: string;
}

interface DeleteClickResponse {
    status: 'deleted' | 'not found' | 'error';
}


// --- Funkcje ---

function initializePageElements(): void {
    redrawLines();
    document.querySelectorAll<HTMLElement>('.click-dot').forEach(initializeDot);
    renumberDotsAndListItems();
}

function renumberDotsAndListItems(): void {
    const dots = document.querySelectorAll<HTMLElement>('.click-dot');
    dots.forEach((dot, index) => {
        const dotNumberElement = dot.querySelector<HTMLSpanElement>('.dot-number');
        if (dotNumberElement) {
            dotNumberElement.innerText = (index + 1).toString();
        }
    });

    const listItems = document.querySelectorAll<HTMLLIElement>('#coordinates-list .coordinate-item');
    listItems.forEach((item, index) => {
        const pointDisplayNumber = item.querySelector<HTMLSpanElement>('.point-display-number');
        if (pointDisplayNumber) {
            pointDisplayNumber.innerText = (index + 1).toString();
        }
    });
    redrawLines();
}

function redrawLines(): void {
    const svg = document.getElementById('connection-lines') as SVGElement | null;
    if (!svg) return;
    svg.innerHTML = '';

    const dots = Array.from(document.querySelectorAll<HTMLElement>('.click-dot'));
    if (dots.length < 2) return;

    for (let i = 0; i < dots.length - 1; i++) {
        const dot1 = dots[i];
        const dot2 = dots[i + 1];
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');

       
        const x1 = parseFloat(dot1.style.left || '0');
        const y1 = parseFloat(dot1.style.top || '0');
        const x2 = parseFloat(dot2.style.left || '0');
        const y2 = parseFloat(dot2.style.top || '0');

        line.setAttribute('x1', x1.toString());
        line.setAttribute('y1', y1.toString());
        line.setAttribute('x2', x2.toString());
        line.setAttribute('y2', y2.toString());
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke', '#ff0000');
        svg.appendChild(line);
    }
}

function createCoordinateListItem(clickId: number | null, x: number, y: number, isNew: boolean = false): HTMLLIElement {
    const listItem = document.createElement('li');
    listItem.classList.add('coordinate-item');
    if (!isNew && clickId !== null) {
        listItem.setAttribute('data-click-id', clickId.toString());
    }

    const pointNumberSpan = document.createElement('span');
    pointNumberSpan.classList.add('point-display-number');

    const inputX = document.createElement('input');
    inputX.type = 'number';
    inputX.classList.add('coord-x-input');
    inputX.value = x.toFixed(2);
    inputX.step = '0.01';
    inputX.autocomplete = 'off';


    const inputY = document.createElement('input');
    inputY.type = 'number';
    inputY.classList.add('coord-y-input');
    inputY.value = y.toFixed(2);
    inputY.step = '0.01';
    inputY.autocomplete = 'off';

    const updateButton = document.createElement('button');
    updateButton.classList.add('update-coord-btn');
    updateButton.textContent = isNew ? 'Save New' : 'Update';
    if (isNew) {
        updateButton.classList.add('save-new-coord-btn');
    }

    const deleteButton = document.createElement('button');
    deleteButton.classList.add('delete-coord-btn');
    deleteButton.textContent = 'Delete';

    listItem.appendChild(document.createTextNode('Point '));
    listItem.appendChild(pointNumberSpan);
    listItem.appendChild(document.createTextNode(': X '));
    listItem.appendChild(inputX);
    listItem.appendChild(document.createTextNode(' Y '));
    listItem.appendChild(inputY);
    listItem.appendChild(updateButton);
    listItem.appendChild(deleteButton);

    const coordinatesList = document.getElementById('coordinates-list');
    if (coordinatesList) {
        coordinatesList.appendChild(listItem);
    } else {
        console.error("Element with ID 'coordinates-list' not found.");
    }
    
    attachEventListenersToListItem(listItem, isNew);
    return listItem;
}

function attachEventListenersToListItem(listItem: HTMLLIElement, isNewInitially: boolean = false): void {
    const updateBtn = listItem.querySelector<HTMLButtonElement>('.update-coord-btn');
    const deleteBtn = listItem.querySelector<HTMLButtonElement>('.delete-coord-btn');
    const inputX = listItem.querySelector<HTMLInputElement>('.coord-x-input');
    const inputY = listItem.querySelector<HTMLInputElement>('.coord-y-input');
    let isStillNew = isNewInitially;

    if (!updateBtn || !deleteBtn || !inputX || !inputY) {
        console.error("Could not find all required elements within list item:", listItem);
        return;
    }

    console.log(`[attachEventListenersToListItem] For item data-id=${listItem.dataset.clickId}, X_val=${inputX.value}, Y_val=${inputY.value}`);

    updateBtn.addEventListener('click', function() {
        const currentClickIdStr = listItem.dataset.clickId;
        const currentClickId = currentClickIdStr ? parseInt(currentClickIdStr, 10) : null;
        const newX = parseFloat(inputX.value);
        const newY = parseFloat(inputY.value);

        if (isNaN(newX) || isNaN(newY)) {
            alert('Please enter valid numbers for X and Y.');
            return;
        }

        const requestBody = {
            item_id: selectedImageId,
            item_type: 'user_image', 
            x: newX,
            y: newY,
            id: currentClickId
        };
        
        if (isStillNew || currentClickId === null) {
            fetch('/add-click/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
                body: JSON.stringify({ image_id: requestBody.item_id, x: newX, y: newY })
            })
            .then(response => response.json() as Promise<AddClickResponse>)
            .then(data => {
                if (data.success && data.click_id !== undefined) {
                    listItem.setAttribute('data-click-id', data.click_id.toString());
                    updateBtn.textContent = 'Update';
                    if (updateBtn.classList.contains('save-new-coord-btn')) {
                        updateBtn.classList.remove('save-new-coord-btn');
                    }
                    isStillNew = false;
                    createDotOnImage(data.click_id, newX, newY);
                    renumberDotsAndListItems();
                } else { 
                    alert('Failed to save new point. ' + (data.error || '')); 
                }
            }).catch(error => console.error('Error saving new point:', error));
        } else {
            fetch('/update-click/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
                body: JSON.stringify({ id: currentClickId, x: newX, y: newY })
            })
            .then(response => response.json() as Promise<UpdateClickResponse>)
            .then(data => {
                if (data.status === 'success') {
                    const dot = document.querySelector<HTMLElement>(`.click-dot[data-id="${currentClickId}"]`);
                    if (dot) {
                        dot.style.left = newX + 'px';
                        dot.style.top = newY + 'px';
                        redrawLines();
                    }
                } else { 
                    alert('Failed to update point. ' + (data.message || ''));
                }
            }).catch(error => console.error('Error updating point:', error));
        }
    });

    listItem.addEventListener('mouseenter', () => {
        const clickId = listItem.dataset.clickId;
        if (!clickId) return;

        listItem.classList.add('highlighted');
        const dotElement = document.querySelector<HTMLElement>(`.click-dot[data-id="${clickId}"]`);
        if (dotElement) {
            dotElement.classList.add('highlighted');
        }
    });

    listItem.addEventListener('mouseleave', () => {
        const clickId = listItem.dataset.clickId;
        if (!clickId) return;

        listItem.classList.remove('highlighted');
        const dotElement = document.querySelector<HTMLElement>(`.click-dot[data-id="${clickId}"]`);
        if (dotElement) {
            dotElement.classList.remove('highlighted');
        }
    });

    deleteBtn.addEventListener('click', function() {
        const currentClickIdStr = listItem.dataset.clickId;
        
        if (isStillNew || !currentClickIdStr) {
            listItem.remove();
           
           
           
            renumberDotsAndListItems();
            return;
        }
        const currentClickId = parseInt(currentClickIdStr, 10);

        fetch('/delete-click/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
            body: JSON.stringify({ id: currentClickId })
        })
        .then(response => response.json() as Promise<DeleteClickResponse>)
        .then(data => {
            if (data.status === 'deleted') {
                listItem.remove();
                const dot = document.querySelector<HTMLElement>(`.click-dot[data-id="${currentClickId}"]`);
                if (dot) dot.remove();
                renumberDotsAndListItems();
            } else { 
                alert('Failed to delete point.'); 
            }
        }).catch(error => console.error('Error deleting point:', error));
    });

    [inputX, inputY].forEach(inputField => {
        inputField.addEventListener('input', function() {
            const currentClickIdStr = listItem.dataset.clickId;
            if (currentClickIdStr && !isStillNew) {
                const currentClickId = parseInt(currentClickIdStr, 10);
                const dot = document.querySelector<HTMLElement>(`.click-dot[data-id="${currentClickId}"]`);
                
                if (dot) {
                    let newXFromInput = parseFloat(inputX.value);
                    let newYFromInput = parseFloat(inputY.value);

                    if (!isNaN(newXFromInput) && !isNaN(newYFromInput)) {
                        // --- BEGIN MODIFICATION: Clamp coordinates for live input update ---
                        const mainImageElement = document.getElementById('main-image') as HTMLImageElement | null;
                        let clampedX = newXFromInput;
                        let clampedY = newYFromInput;

                        if (mainImageElement) {
                            const dotWidth = 10; // As per CSS .click-dot width
                            const dotHeight = 10; // As per CSS .click-dot height

                            // Clamp X
                            if (mainImageElement.width < dotWidth) {
                                clampedX = mainImageElement.width / 2;
                            } else {
                                const minXAllowed = dotWidth / 2;
                                const maxXAllowed = mainImageElement.width - (dotWidth / 2);
                                clampedX = Math.max(minXAllowed, Math.min(newXFromInput, maxXAllowed));
                            }

                            // Clamp Y
                            if (mainImageElement.height < dotHeight) {
                                clampedY = mainImageElement.height / 2;
                            } else {
                                const minYAllowed = dotHeight / 2;
                                const maxYAllowed = mainImageElement.height - (dotHeight / 2);
                                clampedY = Math.max(minYAllowed, Math.min(newYFromInput, maxYAllowed));
                            }
                            
                            // Update input field if value was clamped, to give feedback
                            if (clampedX.toFixed(2) !== newXFromInput.toFixed(2) && inputField === inputX) {
                                inputX.value = clampedX.toFixed(2);
                            }
                            if (clampedY.toFixed(2) !== newYFromInput.toFixed(2) && inputField === inputY) {
                                inputY.value = clampedY.toFixed(2);
                            }
                        } else {
                             console.warn("Main image element not found, cannot apply boundary constraints for live input.");
                        }
                        // --- END MODIFICATION ---

                        dot.style.left = clampedX + 'px';
                        dot.style.top = clampedY + 'px';
                        redrawLines();
                    }
                }
            }
        });
    });
}

function initializeCoordinateListInteractions(): void {
    document.querySelectorAll<HTMLLIElement>('#coordinates-list .coordinate-item').forEach(item => {
        const clickId = item.dataset.clickId;
        if (clickId) {
            attachEventListenersToListItem(item, false);
        }
    });

    const addPointToListBtn = document.getElementById('add-point-on-list-btn');
    if (addPointToListBtn) {
        addPointToListBtn.addEventListener('click', () => {
            const mainImage = document.getElementById('main-image') as HTMLImageElement | null;
           
            const defaultX = mainImage ? mainImage.width / 2 : 50;
            const defaultY = mainImage ? mainImage.height / 2 : 50;
            
            createCoordinateListItem(null, defaultX, defaultY, true);
            renumberDotsAndListItems();
        });
    }
}


function initializeDot(dot: HTMLElement): void {
    const image = document.getElementById("main-image") as HTMLImageElement | null;
   
   

    dot.addEventListener("mousedown", (e: MouseEvent) => {
        if (e.button !== 0) return;
       
       

        draggedDot = dot;
       
        e.preventDefault();
        document.addEventListener('mouseup', handleDocumentMouseUp, { once: true });
    });

    const deleteBtn = dot.querySelector<HTMLButtonElement>('.delete-dot-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function (e: MouseEvent) {
            e.stopPropagation();
            const clickIdStr = dot.dataset.id;
            if (!clickIdStr) {
                console.warn("Dot has no data-id for deletion:", dot);
               
               
                return;
            }
            const clickId = parseInt(clickIdStr, 10);

           
            fetch('/delete-click/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
                body: JSON.stringify({ id: clickId })
            })
            .then(response => response.json() as Promise<DeleteClickResponse>)
            .then(data => {
                if (data.status === 'deleted') {
                    dot.remove();
                    const listItem = document.querySelector<HTMLLIElement>(`#coordinates-list .coordinate-item[data-click-id="${clickId}"]`);
                    if (listItem) listItem.remove();
                    renumberDotsAndListItems();
                } else {
                    alert('Failed to delete point.');
                }
            }).catch(error => console.error('Error deleting point:', error));
        });
    }

    dot.addEventListener('mouseenter', () => {
        const clickId = dot.dataset.id;
        if (!clickId) return;
        dot.classList.add('highlighted');
        const listItem = document.querySelector<HTMLLIElement>(`#coordinates-list .coordinate-item[data-click-id="${clickId}"]`);
        if (listItem) {
            listItem.classList.add('highlighted');
        }
    });

    dot.addEventListener('mouseleave', () => {
        const clickId = dot.dataset.id;
        if (!clickId) return;
        dot.classList.remove('highlighted');
        const listItem = document.querySelector<HTMLLIElement>(`#coordinates-list .coordinate-item[data-click-id="${clickId}"]`);
        if (listItem) {
            listItem.classList.remove('highlighted');
        }
    });
}


function handleDocumentMouseUp(): void {
    if (!draggedDot) return;

    const finalX = parseFloat(draggedDot.style.left || '0');
    const finalY = parseFloat(draggedDot.style.top || '0');
    const clickIdStr = draggedDot.dataset.id;

    if (!clickIdStr) {
        console.error("Dragged dot has no data-id for update:", draggedDot);
        draggedDot = null;
        return;
    }
    const clickId = parseInt(clickIdStr, 10);

    fetch('/update-click/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
        body: JSON.stringify({ id: clickId, x: finalX, y: finalY })
    })
    .then(response => {
        if (!response.ok) {
            console.error('Position save failed after drag for dot ID:', clickId, response.statusText);
           
        }
        return response.json() as Promise<UpdateClickResponse>;
    })
    .then(data => {
        if (data.status !== 'success') {
            console.warn('Update click response status not success:', data);
        }
    })
    .catch(error => console.error('Error updating position after drag:', error));
    
    draggedDot = null;
}

function createDotOnImage(clickId: number, x: number, y: number): HTMLElement {
    const container = document.getElementById('image-container');
    if (!container) {
        console.error("Element with ID 'image-container' not found.");
       
        throw new Error("Image container not found, cannot create dot.");
    }
    const dot = document.createElement('div');
    dot.className = 'click-dot';
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;
    dot.setAttribute('data-id', clickId.toString());
    dot.innerHTML = `<span class="dot-number"></span>
                    <button class="delete-dot-btn" title="Delete this point">✖</button>`;
    container.appendChild(dot);
    initializeDot(dot);
    return dot;
}