document.addEventListener('DOMContentLoaded', () => {
    // Throttle expensive operations
    let rafId = null;
    let isInitialized = false;
    
    setTimeout(() => {
        if (!isInitialized) {
            initializeInfiniteGrid();
        }
    }, 300);
    
    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }
    
    function initializeInfiniteGrid() {
        if (isInitialized) return;
        isInitialized = true;
        
        const svgObject = document.getElementById('debesu-poetika');
        if (svgObject && !svgObject.contentDocument) {
            setTimeout(initializeInfiniteGrid, 200);
            return;
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
        gridContainer.style.cssText = `
            position: absolute;
            left: 0px;
            top: 0px;
            cursor: grab;
            will-change: transform;
        `;
        
        if (originalGrid.parentNode === mainContent) {
            mainContent.replaceChild(gridContainer, originalGrid);
        } else {
            mainContent.innerHTML = '';
            mainContent.appendChild(gridContainer);
        }
        
        const centralGrid = originalGrid.cloneNode(true);
        centralGrid.style.cssText = `
            position: absolute;
            left: 0px;
            top: 0px;
            will-change: transform;
        `;
        centralGrid.dataset.position = '0,0';
        
        // Pre-create grid background template
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
        
        gridContainer.appendChild(gridBackground.cloneNode());
        gridContainer.appendChild(centralGrid);
        
        // Optimized clone tracking
        const cloneTracker = new Map();
        cloneTracker.set('0,0', centralGrid);
        
        // Cached DOM elements
        const gridTemplateHTML = centralGrid.outerHTML;
        const bgTemplateHTML = gridBackground.outerHTML;
        
        let isDragging = false;
        let startX, startY;
        let startLeft, startTop;
        let dragThreshold = 5;
        let hasDragged = false;
        
        // Performance optimization: Use transform instead of left/top
        let currentTransformX = 0;
        let currentTransformY = 0;
        
        function createGridClone(col, row) {
            const key = `${col},${row}`;
            
            if (cloneTracker.has(key)) {
                return null;
            }
            
            const x = col * gridWidth;
            const y = row * gridHeight;
            
            // Use template cloning for better performance
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = bgTemplateHTML + gridTemplateHTML;
            
            const bgClone = tempDiv.children[0];
            const gridClone = tempDiv.children[1];
            
            bgClone.style.transform = `translate(${x}px, ${y}px)`;
            gridClone.style.transform = `translate(${x}px, ${y}px)`;
            gridClone.dataset.position = key;
            
            cloneTracker.set(key, gridClone);
            
            const fragment = document.createDocumentFragment();
            fragment.appendChild(bgClone);
            fragment.appendChild(gridClone);
            
            return fragment;
        }
        
        // Throttled grid checking
        const checkAndAddGridsThrottled = throttle(checkAndAddGrids, 100);
        
        function checkAndAddGrids() {
            if (rafId) return;
            
            rafId = requestAnimationFrame(() => {
                const containerRect = gridContainer.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                
                const leftCol = Math.floor(-containerRect.left / gridWidth) - 1;
                const rightCol = Math.ceil((viewportWidth - containerRect.left) / gridWidth) + 1;
                const topRow = Math.floor(-containerRect.top / gridHeight) - 1;
                const bottomRow = Math.ceil((viewportHeight - containerRect.top) / gridHeight) + 1;
                
                // Batch DOM operations
                const fragment = document.createDocumentFragment();
                let hasNewGrids = false;
                
                for (let row = topRow; row <= bottomRow; row++) {
                    for (let col = leftCol; col <= rightCol; col++) {
                        const key = `${col},${row}`;
                        if (cloneTracker.has(key)) continue;
                        
                        const newFragment = createGridClone(col, row);
                        if (newFragment) {
                            fragment.appendChild(newFragment);
                            hasNewGrids = true;
                        }
                    }
                }
                
                if (hasNewGrids) {
                    gridContainer.appendChild(fragment);
                }
                
                // Cleanup distant grids
                cleanupDistantGrids(leftCol, rightCol, topRow, bottomRow);
                
                rafId = null;
            });
        }
        
        function cleanupDistantGrids(leftCol, rightCol, topRow, bottomRow) {
            const cleanupThreshold = 3;
            const minCol = leftCol - cleanupThreshold;
            const maxCol = rightCol + cleanupThreshold;
            const minRow = topRow - cleanupThreshold;
            const maxRow = bottomRow + cleanupThreshold;
            
            // Convert Map to array for faster iteration during cleanup
            const toRemove = [];
            
            cloneTracker.forEach((element, key) => {
                if (key === '0,0') return; // Never remove central grid
                
                const [col, row] = key.split(',').map(Number);
                
                if (col < minCol || col > maxCol || row < minRow || row > maxRow) {
                    toRemove.push({key, element});
                }
            });
            
            // Batch remove elements
            toRemove.forEach(({key, element}) => {
                cloneTracker.delete(key);
                element.remove();
                
                // Remove corresponding background
                const [col, row] = key.split(',').map(Number);
                const x = col * gridWidth;
                const y = row * gridHeight;
                const backgrounds = gridContainer.querySelectorAll('.grid-background');
                backgrounds.forEach(bg => {
                    const transform = bg.style.transform;
                    if (transform.includes(`${x}px, ${y}px`)) {
                        bg.remove();
                    }
                });
            });
        }
        
        function startDrag(e) {
            if (e.target.closest('.nav') || e.target.closest('#debesu-poetika')) {
                return;
            }
            
            if ((e.button !== undefined && e.button !== 0) && !e.touches) return;
            
            hasDragged = false;
            
            startX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
            startY = e.clientY || (e.touches ? e.touches[0].clientY : 0);
            
            // Use transform values instead of position
            const transform = gridContainer.style.transform;
            if (transform) {
                const match = transform.match(/translate\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px\)/);
                if (match) {
                    currentTransformX = parseFloat(match[1]);
                    currentTransformY = parseFloat(match[2]);
                }
            }
            
            startLeft = currentTransformX;
            startTop = currentTransformY;
            
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
                e.preventDefault?.();
            }
            
            if (hasDragged) {
                currentTransformX = startLeft + dx;
                currentTransformY = startTop + dy;
                
                // Use transform instead of left/top for better performance
                gridContainer.style.transform = `translate(${currentTransformX}px, ${currentTransformY}px)`;
                
                checkAndAddGridsThrottled();
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
                const link = element?.closest('a');
                if (link && !link.closest('.nav')) {
                    // Add small delay to prevent conflicts
                    setTimeout(() => {
                        window.location.href = link.href;
                    }, 10);
                }
            }
        }
        
        // Optimized event listeners with passive flags
        const dragHandler = {
            mouse: {
                down: (e) => startDrag(e),
                move: (e) => drag(e),
                up: (e) => endDrag(e)
            },
            touch: {
                start: (e) => {
                    if (e.target.closest('.nav') || e.target.closest('#debesu-poetika')) return;
                    startDrag({
                        clientX: e.touches[0].clientX,
                        clientY: e.touches[0].clientY,
                        touches: e.touches,
                        target: e.target
                    });
                },
                move: (e) => {
                    drag({
                        clientX: e.touches[0].clientX,
                        clientY: e.touches[0].clientY,
                        touches: e.touches,
                        preventDefault: () => e.preventDefault()
                    });
                    if (hasDragged) e.preventDefault();
                },
                end: (e) => {
                    endDrag({
                        clientX: e.changedTouches[0].clientX,
                        clientY: e.changedTouches[0].clientY,
                        changedTouches: e.changedTouches
                    });
                }
            }
        };
        
        // Add event listeners
        document.addEventListener('mousedown', dragHandler.mouse.down);
        document.addEventListener('mousemove', dragHandler.mouse.move);
        document.addEventListener('mouseup', dragHandler.mouse.up);
        
        document.addEventListener('touchstart', dragHandler.touch.start, { passive: true });
        document.addEventListener('touchmove', dragHandler.touch.move, { passive: false });
        document.addEventListener('touchend', dragHandler.touch.end);
        
        // Create initial surrounding grids
        function createInitialGrids() {
            const fragment = document.createDocumentFragment();
            
            for (let row = -1; row <= 1; row++) {
                for (let col = -1; col <= 1; col++) {
                    if (col === 0 && row === 0) continue;
                    
                    const newFragment = createGridClone(col, row);
                    if (newFragment) {
                        fragment.appendChild(newFragment);
                    }
                }
            }
            
            gridContainer.appendChild(fragment);
        }
        
        createInitialGrids();
        
        // Throttled resize handler
        const resizeHandler = throttle(() => {
            checkAndAddGrids();
        }, 250);
        
        window.addEventListener('resize', resizeHandler);
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            cloneTracker.clear();
            if (rafId) {
                cancelAnimationFrame(rafId);
            }
        });
        
        mainContent.classList.add('infinite-grid-initialized');
    }
});