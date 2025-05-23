"use strict";
// functions.ts
// --- Funkcje ---
function initializePageElements() {
    redrawLines();
    document.querySelectorAll('.click-dot').forEach(initializeDot);
    renumberDotsAndListItems();
}
function renumberDotsAndListItems() {
    const dots = document.querySelectorAll('.click-dot');
    dots.forEach((dot, index) => {
        const dotNumberElement = dot.querySelector('.dot-number');
        if (dotNumberElement) {
            dotNumberElement.innerText = (index + 1).toString();
        }
    });
    const listItems = document.querySelectorAll('#coordinates-list .coordinate-item');
    listItems.forEach((item, index) => {
        const pointDisplayNumber = item.querySelector('.point-display-number');
        if (pointDisplayNumber) {
            pointDisplayNumber.innerText = (index + 1).toString();
        }
    });
    redrawLines();
}
function redrawLines() {
    const svg = document.getElementById('connection-lines'); // Lub SVGSVGElement
    if (!svg)
        return;
    svg.innerHTML = ''; // Wyczyść poprzednie linie
    const dots = Array.from(document.querySelectorAll('.click-dot'));
    if (dots.length < 2)
        return;
    for (let i = 0; i < dots.length - 1; i++) {
        const dot1 = dots[i];
        const dot2 = dots[i + 1];
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        // Pobieranie stylu left/top i parsowanie na liczbę
        const x1 = parseFloat(dot1.style.left || '0');
        const y1 = parseFloat(dot1.style.top || '0');
        const x2 = parseFloat(dot2.style.left || '0');
        const y2 = parseFloat(dot2.style.top || '0');
        line.setAttribute('x1', x1.toString());
        line.setAttribute('y1', y1.toString());
        line.setAttribute('x2', x2.toString());
        line.setAttribute('y2', y2.toString());
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke', '#ff0000'); // Możesz zmienić kolor linii
        svg.appendChild(line);
    }
}
function createCoordinateListItem(clickId, x, y, isNew = false) {
    const listItem = document.createElement('li');
    listItem.classList.add('coordinate-item');
    if (!isNew && clickId !== null) {
        listItem.setAttribute('data-click-id', clickId.toString());
    }
    const pointNumberSpan = document.createElement('span');
    pointNumberSpan.classList.add('point-display-number'); // Numer zostanie ustawiony przez renumberDotsAndListItems
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
    }
    else {
        console.error("Element with ID 'coordinates-list' not found.");
    }
    attachEventListenersToListItem(listItem, isNew);
    return listItem;
}
function attachEventListenersToListItem(listItem, isNewInitially = false) {
    const updateBtn = listItem.querySelector('.update-coord-btn');
    const deleteBtn = listItem.querySelector('.delete-coord-btn');
    const inputX = listItem.querySelector('.coord-x-input');
    const inputY = listItem.querySelector('.coord-y-input');
    let isStillNew = isNewInitially;
    if (!updateBtn || !deleteBtn || !inputX || !inputY) {
        console.error("Could not find all required elements within list item:", listItem);
        return;
    }
    console.log(`[attachEventListenersToListItem] For item data-id=${listItem.dataset.clickId}, X_val=${inputX.value}, Y_val=${inputY.value}`);
    updateBtn.addEventListener('click', function () {
        const currentClickIdStr = listItem.dataset.clickId;
        const currentClickId = currentClickIdStr ? parseInt(currentClickIdStr, 10) : null;
        const newX = parseFloat(inputX.value);
        const newY = parseFloat(inputY.value);
        if (isNaN(newX) || isNaN(newY)) {
            alert('Please enter valid numbers for X and Y.');
            return;
        }
        // Zakładamy, że item_id to selectedImageId dla UserImage
        // Jeśli masz też GridImage, musisz przekazać odpowiedni item_id i item_type
        const requestBody = {
            item_id: selectedImageId, // TODO: Dostosuj, jeśli masz różne typy itemów
            item_type: 'user_image', // TODO: Dostosuj
            x: newX,
            y: newY,
            id: currentClickId // Dla update
        };
        if (isStillNew || currentClickId === null) { // Zapis nowego punktu
            fetch('/add-click/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
                body: JSON.stringify({ image_id: requestBody.item_id, x: newX, y: newY }) // Starsza wersja API
            })
                .then(response => response.json())
                .then(data => {
                if (data.success && data.click_id !== undefined) {
                    listItem.setAttribute('data-click-id', data.click_id.toString());
                    updateBtn.textContent = 'Update';
                    if (updateBtn.classList.contains('save-new-coord-btn')) {
                        updateBtn.classList.remove('save-new-coord-btn');
                    }
                    isStillNew = false;
                    createDotOnImage(data.click_id, newX, newY); // Zakładając, że to UserImage
                    renumberDotsAndListItems();
                }
                else {
                    alert('Failed to save new point. ' + (data.error || ''));
                }
            }).catch(error => console.error('Error saving new point:', error));
        }
        else { // Aktualizacja istniejącego punktu
            fetch('/update-click/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
                body: JSON.stringify({ id: currentClickId, x: newX, y: newY })
            })
                .then(response => response.json())
                .then(data => {
                if (data.status === 'success') {
                    const dot = document.querySelector(`.click-dot[data-id="${currentClickId}"]`);
                    if (dot) {
                        dot.style.left = newX + 'px';
                        dot.style.top = newY + 'px';
                        redrawLines();
                    }
                }
                else {
                    alert('Failed to update point. ' + (data.message || ''));
                }
            }).catch(error => console.error('Error updating point:', error));
        }
    });
    listItem.addEventListener('mouseenter', () => {
        const clickId = listItem.dataset.clickId;
        if (!clickId)
            return;
        listItem.classList.add('highlighted');
        const dotElement = document.querySelector(`.click-dot[data-id="${clickId}"]`);
        if (dotElement) {
            dotElement.classList.add('highlighted');
        }
    });
    listItem.addEventListener('mouseleave', () => {
        const clickId = listItem.dataset.clickId;
        if (!clickId)
            return;
        listItem.classList.remove('highlighted');
        const dotElement = document.querySelector(`.click-dot[data-id="${clickId}"]`);
        if (dotElement) {
            dotElement.classList.remove('highlighted');
        }
    });
    deleteBtn.addEventListener('click', function () {
        const currentClickIdStr = listItem.dataset.clickId;
        if (isStillNew || !currentClickIdStr) {
            listItem.remove();
            // Jeśli to był tymczasowy punkt, usuń też kropkę z obrazu (jeśli istnieje)
            // const tempDot = document.querySelector(`.click-dot.temp[data-temp-id="${listItem.dataset.tempId}"]`);
            // if (tempDot) tempDot.remove();
            renumberDotsAndListItems();
            return;
        }
        const currentClickId = parseInt(currentClickIdStr, 10);
        fetch('/delete-click/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
            body: JSON.stringify({ id: currentClickId })
        })
            .then(response => response.json())
            .then(data => {
            if (data.status === 'deleted') {
                listItem.remove();
                const dot = document.querySelector(`.click-dot[data-id="${currentClickId}"]`);
                if (dot)
                    dot.remove();
                renumberDotsAndListItems();
            }
            else {
                alert('Failed to delete point.');
            }
        }).catch(error => console.error('Error deleting point:', error));
    });
    [inputX, inputY].forEach(inputField => {
        inputField.addEventListener('input', function () {
            const currentClickIdStr = listItem.dataset.clickId;
            if (currentClickIdStr && !isStillNew) {
                const currentClickId = parseInt(currentClickIdStr, 10);
                const dot = document.querySelector(`.click-dot[data-id="${currentClickId}"]`);
                if (dot) {
                    const newXFromInput = parseFloat(inputX.value);
                    const newYFromInput = parseFloat(inputY.value);
                    if (!isNaN(newXFromInput) && !isNaN(newYFromInput)) {
                        dot.style.left = newXFromInput + 'px';
                        dot.style.top = newYFromInput + 'px';
                        redrawLines();
                    }
                }
            }
        });
    });
}
function initializeCoordinateListInteractions() {
    document.querySelectorAll('#coordinates-list .coordinate-item').forEach(item => {
        const clickId = item.dataset.clickId;
        if (clickId) { // Sprawdź, czy clickId istnieje i nie jest pusty
            attachEventListenersToListItem(item, false);
        }
    });
    const addPointToListBtn = document.getElementById('add-point-on-list-btn');
    if (addPointToListBtn) {
        addPointToListBtn.addEventListener('click', () => {
            const mainImage = document.getElementById('main-image');
            // Użyj domyślnych wartości, jeśli obraz nie istnieje lub nie ma wymiarów
            const defaultX = mainImage ? mainImage.width / 2 : 50;
            const defaultY = mainImage ? mainImage.height / 2 : 50;
            createCoordinateListItem(null, defaultX, defaultY, true);
            renumberDotsAndListItems(); // Upewnij się, że renumeracja jest wywoływana
        });
    }
}
function initializeDot(dot) {
    const image = document.getElementById("main-image");
    // Usunięto `if (!image) return;` aby pozwolić na inicjalizację kropek nawet bez obrazu (np. tymczasowych)
    // ale niektóre funkcje wewnątrz mogą potrzebować `image`
    dot.addEventListener("mousedown", (e) => {
        if (e.button !== 0)
            return; // Tylko lewy przycisk myszy
        // Nie przeciągaj, jeśli to tymczasowa kropka (lub dodaj logikę do tego)
        // if (dot.classList.contains('temp-dot')) return; 
        draggedDot = dot; // Ustaw aktualnie przeciąganą kropkę (zmienna globalna)
        // offsetX, offsetY nie są używane w tym fragmencie, więc można je pominąć, jeśli nie są potrzebne globalnie
        e.preventDefault(); // Zapobiegaj domyślnemu zachowaniu (np. zaznaczanie tekstu)
        document.addEventListener('mouseup', handleDocumentMouseUp, { once: true });
    });
    const deleteBtn = dot.querySelector('.delete-dot-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function (e) {
            e.stopPropagation(); // Zapobiegaj propagacji kliknięcia (np. na obrazek)
            const clickIdStr = dot.dataset.id;
            if (!clickIdStr) {
                console.warn("Dot has no data-id for deletion:", dot);
                // Jeśli to tymczasowa kropka bez ID, usuń ją bezpośrednio z DOM
                // if (dot.classList.contains('some-temp-class')) { dot.remove(); renumberDotsAndListItems(); }
                return;
            }
            const clickId = parseInt(clickIdStr, 10);
            // Usunięto confirm() zgodnie z wcześniejszym życzeniem
            fetch('/delete-click/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
                body: JSON.stringify({ id: clickId })
            })
                .then(response => response.json())
                .then(data => {
                if (data.status === 'deleted') {
                    dot.remove();
                    const listItem = document.querySelector(`#coordinates-list .coordinate-item[data-click-id="${clickId}"]`);
                    if (listItem)
                        listItem.remove();
                    renumberDotsAndListItems();
                }
                else {
                    alert('Failed to delete point.');
                }
            }).catch(error => console.error('Error deleting point:', error));
        });
    }
    dot.addEventListener('mouseenter', () => {
        const clickId = dot.dataset.id;
        if (!clickId)
            return;
        dot.classList.add('highlighted');
        const listItem = document.querySelector(`#coordinates-list .coordinate-item[data-click-id="${clickId}"]`);
        if (listItem) {
            listItem.classList.add('highlighted');
        }
    });
    dot.addEventListener('mouseleave', () => {
        const clickId = dot.dataset.id;
        if (!clickId)
            return;
        dot.classList.remove('highlighted');
        const listItem = document.querySelector(`#coordinates-list .coordinate-item[data-click-id="${clickId}"]`);
        if (listItem) {
            listItem.classList.remove('highlighted');
        }
    });
}
function handleDocumentMouseUp() {
    if (!draggedDot)
        return;
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
            // Możesz chcieć przywrócić kropkę na poprzednią pozycję lub dać znać użytkownikowi
        }
        return response.json();
    })
        .then(data => {
        if (data.status !== 'success') {
            console.warn('Update click response status not success:', data);
        }
    })
        .catch(error => console.error('Error updating position after drag:', error));
    draggedDot = null; // Zakończ przeciąganie
}
function createDotOnImage(clickId, x, y) {
    const container = document.getElementById('image-container');
    if (!container) {
        console.error("Element with ID 'image-container' not found.");
        // Rzuć błąd lub zwróć pusty element, aby uniknąć dalszych problemów
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
    initializeDot(dot); // Zainicjuj nowo utworzoną kropkę
    return dot;
}
//# sourceMappingURL=functions.js.map