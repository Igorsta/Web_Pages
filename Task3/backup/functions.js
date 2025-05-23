function initializePageElements() {
    redrawLines();
    document.querySelectorAll('.click-dot').forEach(initializeDot);
    renumberDotsAndListItems();
}

function renumberDotsAndListItems() {
    const dots = document.querySelectorAll('.click-dot');
    dots.forEach((dot, index) => {
        const dotNumberElement = dot.querySelector('.dot-number');
        if (dotNumberElement) dotNumberElement.innerText = index + 1;
    });

    const listItems = document.querySelectorAll('#coordinates-list .coordinate-item');
    listItems.forEach((item, index) => {
        const pointDisplayNumber = item.querySelector('.point-display-number');
        if (pointDisplayNumber) pointDisplayNumber.innerText = index + 1;
    });
    redrawLines();
}

function redrawLines() {
    const svg = document.getElementById('connection-lines');
    if (!svg) return;
    svg.innerHTML = '';

    const dots = Array.from(document.querySelectorAll('.click-dot'));
    if (dots.length < 2) return;

    for(let i = 0; i < dots.length - 1; i++) {
        const dot1 = dots[i];
        const dot2 = dots[i + 1];
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const x1 = parseFloat(dot1.style.left); // Kropka jest już wyśrodkowana przez transform
        const y1 = parseFloat(dot1.style.top);
        const x2 = parseFloat(dot2.style.left);
        const y2 = parseFloat(dot2.style.top);

        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke', '#ff0000');
        svg.appendChild(line);
    }
}

function createCoordinateListItem(clickId, x, y, isNew = false) {
    const listItem = document.createElement('li');
    listItem.classList.add('coordinate-item');
    if (!isNew && clickId) {
        listItem.setAttribute('data-click-id', clickId);
    }

    const pointNumberSpan = document.createElement('span');
    pointNumberSpan.classList.add('point-display-number');

    const inputX = document.createElement('input');
    inputX.type = 'number';
    inputX.classList.add('coord-x-input');
    inputX.value = parseFloat(x).toFixed(2);
    inputX.step = '0.01';

    const inputY = document.createElement('input');
    inputY.type = 'number';
    inputY.classList.add('coord-y-input');
    inputY.value = parseFloat(y).toFixed(2);
    inputY.step = '0.01';

    const updateButton = document.createElement('button');
    updateButton.classList.add('update-coord-btn');
    updateButton.textContent = isNew ? 'Save New' : 'Update';
    if (isNew) {
        updateButton.classList.add('save-new-coord-btn');
    }

    const deleteButton = document.createElement('button');
    deleteButton.classList.add('delete-coord-btn');
    deleteButton.textContent = 'Delete';

    listItem.appendChild(document.createTextNode('Point'));
    listItem.appendChild(pointNumberSpan);
    listItem.appendChild(document.createTextNode(': X'));
    listItem.appendChild(inputX);
    listItem.appendChild(document.createTextNode('Y'));
    listItem.appendChild(inputY);
    listItem.appendChild(updateButton);
    listItem.appendChild(deleteButton);

    document.getElementById('coordinates-list').appendChild(listItem);
    attachEventListenersToListItem(listItem, isNew); // Przekazuj tylko isNew
    return listItem;
}

function attachEventListenersToListItem(listItem, isNewInitially = false) {
    const updateBtn = listItem.querySelector('.update-coord-btn');
    const deleteBtn = listItem.querySelector('.delete-coord-btn');
    const inputX = listItem.querySelector('.coord-x-input');
    const inputY = listItem.querySelector('.coord-y-input');
    let isStillNew = isNewInitially; // Flaga do śledzenia, czy element jest nowy

    console.log(`[attachEventListenersToListItem] For item data-id=${listItem.dataset.clickId}, X_val=${inputX.value}, Y_val=${inputY.value}`);

    updateBtn.addEventListener('click', function() {
        const currentClickId = listItem.dataset.clickId;
        const newX = parseFloat(inputX.value);
        const newY = parseFloat(inputY.value);

        if (isNaN(newX) || isNaN(newY)) {
            alert('Please enter valid numbers for X and Y.');
            return;
        }

        if (isStillNew || !currentClickId) { // Zapis nowego punktu
            fetch('/add-click/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
                body: JSON.stringify({ image_id: selectedImageId, x: newX, y: newY })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    listItem.setAttribute('data-click-id', data.click_id);
                    updateBtn.textContent = 'Update';
                    updateBtn.classList.remove('save-new-coord-btn');
                    isStillNew = false; // Już nie jest nowy
                    createDotOnImage(data.click_id, newX, newY);
                    renumberDotsAndListItems();
                } else { alert('Failed to save new point.'); }
            });
        } else { // Aktualizacja istniejącego punktu
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
                } else { alert('Failed to update point.'); }
            });
        }

    });

    listItem.addEventListener('mouseenter', () => {
        const clickId = listItem.dataset.clickId;
        if (!clickId) return; // Nie podświetlaj, jeśli to nowy, niezapisany element

        listItem.classList.add('highlighted'); // Podświetl sam element listy
        const dotElement = document.querySelector(`.click-dot[data-id="${clickId}"]`);
        if (dotElement) {
            dotElement.classList.add('highlighted');
        }
    });

    listItem.addEventListener('mouseleave', () => {
        const clickId = listItem.dataset.clickId;
        if (!clickId) return;

        listItem.classList.remove('highlighted'); // Usuń podświetlenie z elementu listy
        const dotElement = document.querySelector(`.click-dot[data-id="${clickId}"]`);
        if (dotElement) {
            dotElement.classList.remove('highlighted');
        }
    });

    deleteBtn.addEventListener('click', function() {
        const currentClickId = listItem.dataset.clickId;
        if (isStillNew || !currentClickId) {
            listItem.remove();
            renumberDotsAndListItems();
            return;
        }

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
                if (dot) dot.remove();
                renumberDotsAndListItems();
            } else { alert('Failed to delete point.'); }
        });
    });

    [inputX, inputY].forEach(input => {
        input.addEventListener('input', function() { // ZMIANA: 'input' zamiast 'change'
            const currentClickId = listItem.dataset.clickId;
            if (currentClickId && !isStillNew) { // Użyj flagi isStillNew
                const dot = document.querySelector(`.click-dot[data-id="${currentClickId}"]`);
                if (dot) {
                    const newXFromInput = parseFloat(listItem.querySelector('.coord-x-input').value);
                    const newYFromInput = parseFloat(listItem.querySelector('.coord-y-input').value);

                    if (!isNaN(newXFromInput) && !isNaN(newYFromInput)) {
                        dot.style.left = newXFromInput + 'px';
                        dot.style.top = newYFromInput + 'px';
                        redrawLines(); // Przesuń linie łączące punkty
                    }
                }
            }
        });
    });
}

function initializeCoordinateListInteractions() {
    document.querySelectorAll('#coordinates-list .coordinate-item').forEach(item => {
        const clickId = item.dataset.clickId;
        if (clickId) {
                attachEventListenersToListItem(item, false);
        }
    });

    const addPointToListBtn = document.getElementById('add-point-on-list-btn');
    if (addPointToListBtn) {
        addPointToListBtn.addEventListener('click', () => {
            const mainImage = document.getElementById('main-image');
            const defaultX = mainImage ? mainImage.width / 2 : 50;
            const defaultY = mainImage ? mainImage.height / 2 : 50;
            createCoordinateListItem(null, defaultX, defaultY, true);
            renumberDotsAndListItems();
        });
    }
}

function initializeDot(dot) {
    const image = document.getElementById("main-image");
    if (!image) return;

    let offsetX = 0, offsetY = 0;

    dot.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        draggedDot = dot; // Ustaw aktualnie przeciąganą kropkę
        const rect = dot.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        
        e.preventDefault();
        document.addEventListener('mouseup', handleDocumentMouseUp, { once: true });
    });

    dot.querySelector('.delete-dot-btn').addEventListener('click', function (e) {
        e.stopPropagation();
        const clickId = dot.dataset.id;
        if (confirm('Are you sure you want to delete this point?')) {
            fetch('/delete-click/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
                body: JSON.stringify({ id: clickId })
            }).then(response => response.json()).then(data => {
                if (data.status === 'deleted') {
                    dot.remove();
                    const listItem = document.querySelector(`#coordinates-list .coordinate-item[data-click-id="${clickId}"]`);
                    if (listItem) listItem.remove();
                    renumberDotsAndListItems();
                }
            });
        }
    });

    dot.addEventListener('mouseenter', () => {
        const clickId = dot.dataset.id;
        if (!clickId) return;

        dot.classList.add('highlighted'); // Podświetl samą kropkę
        const listItem = document.querySelector(`#coordinates-list .coordinate-item[data-click-id="${clickId}"]`);
        if (listItem) {
            listItem.classList.add('highlighted');
        }
    });

    dot.addEventListener('mouseleave', () => {
        const clickId = dot.dataset.id;
        if (!clickId) return;

        dot.classList.remove('highlighted'); // Usuń podświetlenie z kropki
        const listItem = document.querySelector(`#coordinates-list .coordinate-item[data-click-id="${clickId}"]`);
        if (listItem) {
            listItem.classList.remove('highlighted');
        }
    });
}

function handleDocumentMouseUp() {
    if (!draggedDot) return;

    const finalX = parseFloat(draggedDot.style.left);
    const finalY = parseFloat(draggedDot.style.top);

    fetch('/update-click/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
        body: JSON.stringify({ id: draggedDot.dataset.id, x: finalX, y: finalY })
    }).then(response => {
        if (!response.ok) console.error('Position save failed after drag for dot ID:', draggedDot.dataset.id);
    });
    draggedDot = null; // Zakończ przeciąganie
}

function createDotOnImage(clickId, x_imageRelative, y_imageRelative) {
    const container = document.getElementById('image-container');
    if (!container) {
        return null;
    }

    const mainImage = document.getElementById('main-image');
    if (!mainImage) {
        return null;
    }
    
    const dotLeftInContainer = x_imageRelative + mainImage.offsetLeft;
    const dotTopInContainer = y_imageRelative + mainImage.offsetTop;

    const dot = document.createElement('div');
    dot.className = 'click-dot';
    dot.style.left = `${dotLeftInContainer}px`;
    dot.style.top = `${dotTopInContainer}px`;
    dot.setAttribute('data-id', clickId);
    dot.innerHTML = `<span class="dot-number"></span>
                    <button class="delete-dot-btn" title="Delete this point">✖</button>`;

    container.appendChild(dot);

    if (typeof initializeDot === 'function') {
        initializeDot(dot);
    } else {
    }
    return dot;
}