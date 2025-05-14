document.addEventListener('DOMContentLoaded',function(){
    const svgObject=document.getElementById('debesu-poetika');
    svgObject.addEventListener('load',function(){
      const svgDoc=svgObject.contentDocument;
      const svg=svgDoc.querySelector('svg');
      const letterPaths=svgDoc.querySelectorAll('path');
      
      if(svg){
        let originalViewBox=svg.getAttribute('viewBox');
        if(originalViewBox){
          let values=originalViewBox.split(' ').map(Number);
          let padding=10;
          
          let newViewBox=[
            values[0]-padding,
            values[1]-padding,
            values[2]+padding*2,
            values[3]+padding*2
          ].join(' ');
          
          svg.setAttribute('viewBox',newViewBox);
        }

        svg.style.pointerEvents='none';
      }
      
      letterPaths.forEach(path=>{
        path.style.stroke='black';
        path.style.strokeWidth='3.3pt';
        path.style.strokeLinejoin='round';
        path.style.strokeLinecap='round';
        path.style.transition='stroke-width 0.3s ease';
        path.style.pointerEvents='none';
      });

      svgObject.style.pointerEvents='none';
      
      const navItem=svgObject.closest('.nav-item');
      
      navItem.style.cursor='pointer';
      
      navItem.addEventListener('mouseenter',function(){
        letterPaths.forEach(path=>{
          path.style.strokeWidth='0';
        });
      });
      
      navItem.addEventListener('mouseleave',function(){
        letterPaths.forEach(path=>{
          path.style.strokeWidth='4pt';
        });
      });
      
      svgObject.addEventListener('click',function(e){
        e.stopPropagation();
        window.location.href='index.html';
      });
    });
  });