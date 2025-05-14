// Fixed Infinite Grid with Dragging Everywhere
document.addEventListener('DOMContentLoaded', () => {
    console.log('Document loaded - fixed dragging everywhere');
    
    // Store references to DOM elements
    const mainContent = document.querySelector('.main-content');
    const originalGrid = document.querySelector('.image-grid');
    
    // Grid dimensions
    const gridWidth = originalGrid.offsetWidth;
    const gridHeight = originalGrid.offsetHeight;
    console.log('Grid dimensions:', gridWidth, 'x', gridHeight);
    
    // Create a wrapper for the grid
    const gridContainer = document.createElement('div');
    gridContainer.className = 'grid-container';
    gridContainer.style.position = 'absolute';
    gridContainer.style.left = '0px';
    gridContainer.style.top = '0px';
    gridContainer.style.cursor = 'grab';
    
    // Add the container to the main content
    mainContent.innerHTML = '';
    mainContent.appendChild(gridContainer);
    
    // Clone and position the original grid at 0,0
    const centralGrid = originalGrid.cloneNode(true);
    centralGrid.style.position = 'absolute';
    centralGrid.style.left = '0px';
    centralGrid.style.top = '0px';
    centralGrid.dataset.position = '0,0';
    
    // Create a background element for the grid to capture all mouse events
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
    
    // First add the background to capture events, then the grid
    gridContainer.appendChild(gridBackground);
    gridContainer.appendChild(centralGrid);
    
    // Clone tracker to avoid duplicates
    const cloneTracker = new Set(['0,0']); // Original grid at 0,0
    
    // Variables for tracking drag state
    let isDragging = false;
    let startX, startY;
    let startLeft, startTop;
    
    // Create a grid clone at specified position
    function createGridClone(col, row) {
        // Generate key for this position
        const key = `${col},${row}`;
        
        // Skip if we already have a grid at this position
        if (cloneTracker.has(key)) {
            return null;
        }
        
        // Calculate exact pixel position
        const x = col * gridWidth;
        const y = row * gridHeight;
        
        // Clone both the background and the grid
        const bgClone = gridBackground.cloneNode();
        bgClone.style.left = `${x}px`;
        bgClone.style.top = `${y}px`;
        
        const gridClone = centralGrid.cloneNode(true);
        gridClone.style.position = 'absolute';
        gridClone.style.left = `${x}px`;
        gridClone.style.top = `${y}px`;
        
        // Add metadata for tracking
        gridClone.dataset.position = key;
        
        // Update our tracking
        cloneTracker.add(key);
        
        // Return both elements as a fragment
        const fragment = document.createDocumentFragment();
        fragment.appendChild(bgClone);
        fragment.appendChild(gridClone);
        
        return fragment;
    }
    
    // Check viewport and add grid clones as needed
    function checkAndAddGrids() {
        // Get container position and viewport size
        const containerRect = gridContainer.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Calculate visible region in grid coordinates
        // Adding buffer of 1 grid size in each direction
        const leftCol = Math.floor(-containerRect.left / gridWidth) - 1;
        const rightCol = Math.ceil((viewportWidth - containerRect.left) / gridWidth) + 1;
        const topRow = Math.floor(-containerRect.top / gridHeight) - 1;
        const bottomRow = Math.ceil((viewportHeight - containerRect.top) / gridHeight) + 1;
        
        // Create grid clones for each visible cell
        for (let row = topRow; row <= bottomRow; row++) {
            for (let col = leftCol; col <= rightCol; col++) {
                // Skip if we already have a grid at this position
                const key = `${col},${row}`;
                if (cloneTracker.has(key)) continue;
                
                const fragment = createGridClone(col, row);
                if (fragment) {
                    gridContainer.appendChild(fragment);
                }
            }
        }
        
        // Optional: Clean up far off-screen grids
        const cleanupThreshold = 3; // Grids more than 3 grid sizes away from viewport
        const minCol = leftCol - cleanupThreshold;
        const maxCol = rightCol + cleanupThreshold;
        const minRow = topRow - cleanupThreshold;
        const maxRow = bottomRow + cleanupThreshold;
        
        // Get all grid elements
        const grids = gridContainer.querySelectorAll('.image-grid');
        
        grids.forEach(grid => {
            // Skip if no position (shouldn't happen)
            if (!grid.dataset.position) return;
            
            const [col, row] = grid.dataset.position.split(',').map(Number);
            
            // Remove if outside our expanded boundary
            if (col < minCol || col > maxCol || row < minRow || row > maxRow) {
                // Remove from tracking
                cloneTracker.delete(`${col},${row}`);
                
                // Find any background element at same position
                const bgElements = gridContainer.querySelectorAll('.grid-background');
                bgElements.forEach(bg => {
                    const bgLeft = parseInt(bg.style.left);
                    const bgTop = parseInt(bg.style.top);
                    if (bgLeft === col * gridWidth && bgTop === row * gridHeight) {
                        bg.remove();
                    }
                });
                
                // Remove grid from DOM
                grid.remove();
            }
        });
    }
    
    // SIMPLIFIED DRAG FUNCTIONS
    
    // Mouse Down: Start Drag
    function startDrag(e) {
        // Only react to left mouse button or touch
        if (e.button !== 0 && !e.touches) return;
        
        // Prevent text selection during drag
        e.preventDefault();
        
        // Set dragging state
        isDragging = true;
        
        // Get the mouse position
        startX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
        startY = e.clientY || (e.touches ? e.touches[0].clientY : 0);
        
        // Get current grid position
        startLeft = parseInt(gridContainer.style.left) || 0;
        startTop = parseInt(gridContainer.style.top) || 0;
        
        // Change cursor to grabbing
        gridContainer.style.cursor = 'grabbing';
        document.body.style.cursor = 'grabbing';
        
        // Add a dragging class for styles
        gridContainer.classList.add('dragging');
        
        // Add a class to body to prevent text selection
        document.body.classList.add('disable-selection');
    }
    
    // Mouse Move: Update Position
    function drag(e) {
        if (!isDragging) return;
        
        // Get current position
        const x = e.clientX || (e.touches ? e.touches[0].clientX : 0);
        const y = e.clientY || (e.touches ? e.touches[0].clientY : 0);
        
        // Calculate how far mouse moved
        const dx = x - startX;
        const dy = y - startY;
        
        // Update grid position
        const newLeft = startLeft + dx;
        const newTop = startTop + dy;
        
        // Set the new position
        gridContainer.style.left = `${newLeft}px`;
        gridContainer.style.top = `${newTop}px`;
        
        // Check for and add new grids as needed
        checkAndAddGrids();
        
        // Prevent any default behaviors
        e.preventDefault();
    }
    
    // Mouse Up: End Drag
    function endDrag() {
        if (!isDragging) return;
        
        // Reset dragging state
        isDragging = false;
        
        // Reset cursor
        gridContainer.style.cursor = 'grab';
        document.body.style.cursor = 'default';
        
        // Remove the dragging class
        gridContainer.classList.remove('dragging');
        
        // Remove text selection prevention
        document.body.classList.remove('disable-selection');
    }
    
    // Use the container for event listeners to capture everywhere
    gridContainer.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', drag);
    window.addEventListener('mouseup', endDrag);
    
    // Touch events
    gridContainer.addEventListener('touchstart', function(e) {
        startDrag({
            clientX: e.touches[0].clientX,
            clientY: e.touches[0].clientY,
            preventDefault: () => e.preventDefault(),
            touches: e.touches
        });
        e.preventDefault(); // Prevent scrolling
    }, { passive: false });
    
    window.addEventListener('touchmove', function(e) {
        drag({
            clientX: e.touches[0].clientX,
            clientY: e.touches[0].clientY,
            preventDefault: () => {},
            touches: e.touches
        });
        e.preventDefault(); // Prevent scrolling
    }, { passive: false });
    
    window.addEventListener('touchend', endDrag);
    
    // Create initial grid clones (3x3 grid centered on original)
    function createInitialGrids() {
        for (let row = -1; row <= 1; row++) {
            for (let col = -1; col <= 1; col++) {
                // Skip the original grid at (0,0)
                if (col === 0 && row === 0) continue;
                
                const fragment = createGridClone(col, row);
                if (fragment) {
                    gridContainer.appendChild(fragment);
                }
            }
        }
    }
    
    // Initialize by creating grids around the original
    createInitialGrids();
    
    // Check for grids on window resize
    window.addEventListener('resize', checkAndAddGrids);
    

    
    // Debug info
    console.log('Improved infinite grid initialized - draggable everywhere!');
});

// document.addEventListener('DOMContentLoaded',function(){
//     const svgObject=document.getElementById('debesu-poetika');
//     svgObject.addEventListener('load',function(){
//       const svgDoc=svgObject.contentDocument;
//       const svg=svgDoc.querySelector('svg');
//       const letterPaths=svgDoc.querySelectorAll('path');
      
//       if(svg){
//         let originalViewBox=svg.getAttribute('viewBox');
//         if(originalViewBox){
//           let values=originalViewBox.split(' ').map(Number);
//           let padding=10;
          
//           let newViewBox=[
//             values[0]-padding,
//             values[1]-padding,
//             values[2]+padding*2,
//             values[3]+padding*2
//           ].join(' ');
          
//           svg.setAttribute('viewBox',newViewBox);
//         }

//         svg.style.pointerEvents='none';
//       }
      
//       letterPaths.forEach(path=>{
//         path.style.stroke='black';
//         path.style.strokeWidth='3.1pt';
//         path.style.strokeLinejoin='round';
//         path.style.strokeLinecap='round';
//         path.style.transition='stroke-width 0.3s ease';
//         path.style.pointerEvents='none';
//       });

//       svgObject.style.pointerEvents='none';
      
//       const navItem=svgObject.closest('.nav-item');
      
//       navItem.style.cursor='pointer';
      
//       navItem.addEventListener('mouseenter',function(){
//         letterPaths.forEach(path=>{
//           path.style.strokeWidth='0';
//         });
//       });
      
//       navItem.addEventListener('mouseleave',function(){
//         letterPaths.forEach(path=>{
//           path.style.strokeWidth='4pt';
//         });
//       });
      
//       svgObject.addEventListener('click',function(e){
//         e.stopPropagation();
//         window.location.href='index.html';
//       });
//     });
//   });