document.addEventListener('DOMContentLoaded', function() {
    const svgObject = document.getElementById('debesu-poetika');
    
    function handleSVGLoad() {
        const svgDoc = svgObject.contentDocument;
        const svg = svgDoc.querySelector('svg');
        const letterPaths = svgDoc.querySelectorAll('path');
        
        if (svg) {
            let originalViewBox = svg.getAttribute('viewBox');
            if (originalViewBox) {
                let values = originalViewBox.split(' ').map(Number);
                let padding = 10;
                
                let newViewBox = [
                    values[0] - padding,
                    values[1] - padding,
                    values[2] + padding * 2,
                    values[3] + padding * 2
                ].join(' ');
                
                svg.setAttribute('viewBox', newViewBox);
            }
            
            svg.style.pointerEvents = 'none';
        }
        
        letterPaths.forEach(path => {
            path.style.stroke = 'black';
            path.style.strokeWidth = '3.3pt';
            path.style.strokeLinejoin = 'round';
            path.style.strokeLinecap = 'round';
            path.style.transition = 'stroke-width 0.3s ease';
            path.style.pointerEvents = 'none';
        });
        
        svgObject.style.pointerEvents = 'none';
        
        const navItem = svgObject.closest('.nav-item');
        navItem.style.cursor = 'pointer';
        
        navItem.addEventListener('mouseenter', function() {
            letterPaths.forEach(path => {
                path.style.strokeWidth = '0';
            });
        });
        
        navItem.addEventListener('mouseleave', function() {
            letterPaths.forEach(path => {
                path.style.strokeWidth = '4pt';
            });
        });
        
        svgObject.addEventListener('click', function(e) {
            e.stopPropagation();
            window.location.href = 'https://kitijap.github.io/debesupoetika/index.html';
        });
        
        window.svgReady = true;
        document.dispatchEvent(new CustomEvent('svgReady'));
    }
    
    if (svgObject.contentDocument && svgObject.contentDocument.readyState === 'complete') {
        handleSVGLoad();
    } else {
        svgObject.addEventListener('load', handleSVGLoad);
    }
  });
  
  (function() {
      let inactivityTimer;
      const TIMEOUT_MINUTES = 3;
      const TIMEOUT_MS = TIMEOUT_MINUTES * 60 * 1000;
      
      const activityEvents = [
          'mousedown',
          'mousemove', 
          'keypress',
          'scroll',
          'touchstart',
          'click',
          'wheel'
      ];
      
      function resetTimer() {
          clearTimeout(inactivityTimer);
          
          inactivityTimer = setTimeout(() => {
              window.location.href = 'https://kitijap.github.io/debesupoetika/index.html';
          }, TIMEOUT_MS);
      }
      
      function startActivityMonitoring() {
          activityEvents.forEach(event => {
              document.addEventListener(event, resetTimer, true);
          });
          
          resetTimer();
      }
      
      if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', startActivityMonitoring);
      } else {
          startActivityMonitoring();
      }
      
      window.autoReload = {
          start: startActivityMonitoring,
          stop: () => {
              clearTimeout(inactivityTimer);
              activityEvents.forEach(event => {
                  document.removeEventListener(event, resetTimer, true);
              });
          },
          resetTimer: resetTimer
      };
  })();
  
  (function() {
      if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
          return;
      }
      
      let cueTimer;
      let messageElement;
      const INACTIVITY_TIME = 20 * 1000;
      
      const activityEvents = [
          'mousedown',
          'mousemove', 
          'keypress',
          'scroll',
          'touchstart',
          'click',
          'wheel'
      ];
      
      function createMessage() {
          if (messageElement) return;
          
          messageElement = document.createElement('div');
          messageElement.style.cssText = `
              position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 600px;
            height: 300px;
            background: rgba(245, 245, 245, 0.1);
            backdrop-filter: blur(10px);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 20px;
            font-family: 'Overpass Mono', monospace;
            font-size: 1rem;
            line-height: 1.5;
            font-weight: 400;
            color: #333;
            text-align: center;
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.5s ease-in-out;
            pointer-events: none;
        `;
        
        messageElement.innerHTML = `
            <div>lai pārvietotos, noklikšķini un<br>turot pavelc uz jebkuru pusi</div>
        `;
        document.body.appendChild(messageElement);
          
          setTimeout(() => {
              messageElement.style.opacity = '1';
          }, 100);
      }
      
      function hideMessage() {
          if (!messageElement) return;
          
          messageElement.style.opacity = '0';
          setTimeout(() => {
              if (messageElement && messageElement.parentNode) {
                  messageElement.parentNode.removeChild(messageElement);
                  messageElement = null;
              }
          }, 500);
      }
      
      function showCue() {
          createMessage();
      }
      
      function resetCueTimer() {
          clearTimeout(cueTimer);
          hideMessage();
          
          cueTimer = setTimeout(showCue, INACTIVITY_TIME);
      }
      
      function onActivity() {
          resetCueTimer();
      }
      
      function startCueMonitoring() {
          activityEvents.forEach(event => {
              document.addEventListener(event, onActivity, true);
          });
          
          setTimeout(showCue, 2000);
          resetCueTimer();
      }
      
      if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', startCueMonitoring);
      } else {
          startCueMonitoring();
      }
  })();