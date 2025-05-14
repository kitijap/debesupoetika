document.addEventListener('DOMContentLoaded', () => {
    // Wait a moment to ensure SVG is loaded or being processed
    setTimeout(() => {
        initializeInfiniteGrid();
    }, 300);
    
    function initializeInfiniteGrid() {
        // Don't interfere with SVG processing
        const svgObject = document.getElementById('debesu-poetika');
        if (svgObject) {
            // Make sure SVG is loaded before proceeding
            if (!svgObject.contentDocument) {
                setTimeout(initializeInfiniteGrid, 200);
                return;
            }
        }
        
        const mainContent = document.querySelector('.main-content');
        const originalGrid = document.querySelector('.image-grid');
        
        if (!mainContent || !originalGrid || mainContent.classList.contains('infinite-grid-initialized')) {
            return;
        }
        
        const gridWidth = originalGrid.offsetWidth;
        const gridHeight = originalGrid.offsetHeight;
        
        const gridContainer = document.createElement('div');
        gridContainer.className = 'grid-container';
        gridContainer.style.position = 'absolute';
        gridContainer.style.left = '0px';
        gridContainer.style.top = '0px';
        gridContainer.style.cursor = 'grab';
        
        if (originalGrid.parentNode === mainContent) {
            mainContent.replaceChild(gridContainer, originalGrid);
        } else {
            mainContent.innerHTML = '';
            mainContent.appendChild(gridContainer);
        }
        
        const centralGrid = originalGrid.cloneNode(true);
        centralGrid.style.position = 'absolute';
        centralGrid.style.left = '0px';
        centralGrid.style.top = '0px';
        centralGrid.dataset.position = '0,0';
        
        const gridBackground = document.createElement('div');
        gridBackground.className = 'grid-background';
        gridBackground.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            width: ${gridWidth}px;
            height: ${gridHeight}px;
            background-color: transparent;
            z-index: 0;
        `;
        
        gridContainer.appendChild(gridBackground);
        gridContainer.appendChild(centralGrid);
        
        const cloneTracker = new Set(['0,0']);
        
        let isDragging = false;
        let startX, startY;
        let startLeft, startTop;
        let dragThreshold = 5;
        let hasDragged = false;
        
        function createGridClone(col, row) {
            const key = `${col},${row}`;
            
            if (cloneTracker.has(key)) {
                return null;
            }
            
            const x = col * gridWidth;
            const y = row * gridHeight;
            
            const bgClone = gridBackground.cloneNode();
            bgClone.style.left = `${x}px`;
            bgClone.style.top = `${y}px`;
            
            const gridClone = centralGrid.cloneNode(true);
            gridClone.style.position = 'absolute';
            gridClone.style.left = `${x}px`;
            gridClone.style.top = `${y}px`;
            
            gridClone.dataset.position = key;
            
            cloneTracker.add(key);
            
            const fragment = document.createDocumentFragment();
            fragment.appendChild(bgClone);
            fragment.appendChild(gridClone);
            
            return fragment;
        }
        
        function checkAndAddGrids() {
            const containerRect = gridContainer.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            const leftCol = Math.floor(-containerRect.left / gridWidth) - 1;
            const rightCol = Math.ceil((viewportWidth - containerRect.left) / gridWidth) + 1;
            const topRow = Math.floor(-containerRect.top / gridHeight) - 1;
            const bottomRow = Math.ceil((viewportHeight - containerRect.top) / gridHeight) + 1;
            
            for (let row = topRow; row <= bottomRow; row++) {
                for (let col = leftCol; col <= rightCol; col++) {
                    const key = `${col},${row}`;
                    if (cloneTracker.has(key)) continue;
                    
                    const fragment = createGridClone(col, row);
                    if (fragment) {
                        gridContainer.appendChild(fragment);
                    }
                }
            }
            
            const cleanupThreshold = 3;
            const minCol = leftCol - cleanupThreshold;
            const maxCol = rightCol + cleanupThreshold;
            const minRow = topRow - cleanupThreshold;
            const maxRow = bottomRow + cleanupThreshold;
            
            const grids = gridContainer.querySelectorAll('.image-grid');
            
            grids.forEach(grid => {
                if (!grid.dataset.position) return;
                
                const [col, row] = grid.dataset.position.split(',').map(Number);
                
                if (col < minCol || col > maxCol || row < minRow || row > maxRow) {
                    cloneTracker.delete(`${col},${row}`);
                    
                    const bgElements = gridContainer.querySelectorAll('.grid-background');
                    bgElements.forEach(bg => {
                        const bgLeft = parseInt(bg.style.left);
                        const bgTop = parseInt(bg.style.top);
                        if (bgLeft === col * gridWidth && bgTop === row * gridHeight) {
                            bg.remove();
                        }
                    });
                    
                    grid.remove();
                }
            });
        }
        
        function startDrag(e) {
            // Don't interfere with SVG navigation
            if (e.target.closest('.nav') || e.target.closest('#debesu-poetika')) {
                return;
            }
            
            if ((e.button !== undefined && e.button !== 0) && !e.touches) return;
            
            hasDragged = false;
            
            startX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
            startY = e.clientY || (e.touches ? e.touches[0].clientY : 0);
            
            startLeft = parseInt(gridContainer.style.left) || 0;
            startTop = parseInt(gridContainer.style.top) || 0;
            
            isDragging = true;
            
            gridContainer.classList.add('dragging');
            
            document.body.style.cursor = 'grabbing';
            
            document.body.classList.add('disable-selection');
        }
        
        function drag(e) {
            if (!isDragging) return;
            
            const x = e.clientX || (e.touches ? e.touches[0].clientX : 0);
            const y = e.clientY || (e.touches ? e.touches[0].clientY : 0);
            
            const dx = x - startX;
            const dy = y - startY;
            
            if (!hasDragged && Math.sqrt(dx*dx + dy*dy) > dragThreshold) {
                hasDragged = true;
                
                e.preventDefault();
            }
            
            if (hasDragged) {
                const newLeft = startLeft + dx;
                const newTop = startTop + dy;
                
                gridContainer.style.left = `${newLeft}px`;
                gridContainer.style.top = `${newTop}px`;
                
                checkAndAddGrids();
            }
        }
        
        function endDrag(e) {
            if (!isDragging) return;
            
            isDragging = false;
            
            document.body.style.cursor = '';
            
            gridContainer.classList.remove('dragging');
            
            document.body.classList.remove('disable-selection');
            
            if (!hasDragged) {
                const x = e.clientX || (e.changedTouches ? e.changedTouches[0].clientX : 0);
                const y = e.clientY || (e.changedTouches ? e.changedTouches[0].clientY : 0);
                
                const element = document.elementFromPoint(x, y);
                
                const link = element.closest('a');
                if (link) {
                    // Let natural click happen
                }
            }
        }
        
        document.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', endDrag);
        
        document.addEventListener('touchstart', function(e) {
            // Skip SVG elements
            if (e.target.closest('.nav') || e.target.closest('#debesu-poetika')) {
                return;
            }
            
            startDrag({
                clientX: e.touches[0].clientX,
                clientY: e.touches[0].clientY,
                touches: e.touches,
                target: e.target
            });
        }, { passive: true });
        
        document.addEventListener('touchmove', function(e) {
            drag({
                clientX: e.touches[0].clientX,
                clientY: e.touches[0].clientY,
                touches: e.touches,
                preventDefault: function() { e.preventDefault(); }
            });
            
            if (hasDragged) {
                e.preventDefault();
            }
        }, { passive: false });
        
        document.addEventListener('touchend', function(e) {
            endDrag({
                clientX: e.changedTouches[0].clientX,
                clientY: e.changedTouches[0].clientY,
                changedTouches: e.changedTouches
            });
        });
        
        function createInitialGrids() {
            for (let row = -1; row <= 1; row++) {
                for (let col = -1; col <= 1; col++) {
                    if (col === 0 && row === 0) continue;
                    
                    const fragment = createGridClone(col, row);
                    if (fragment) {
                        gridContainer.appendChild(fragment);
                    }
                }
            }
        }
        
        createInitialGrids();
        
        window.addEventListener('resize', checkAndAddGrids);
        
        mainContent.classList.add('infinite-grid-initialized');
    }
});