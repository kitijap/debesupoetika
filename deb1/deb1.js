let img;
let imgLoaded = false;
let rectHeight = 30;
let rectWidth;
let blurAmount = 40;
let blurSlider, heightSlider;

let lines = [];
let lineColor;
let targetLineColor;

let lineLayer;
let messiness = 2;
let textureImg;
let baseColor;
let gradientColor;

// Performance optimizations
let linesCached = false;
let lastMouseRegion = null;
let colorLerpSpeed = 0.3; // Increased for faster color change
let isLowPerformanceDevice = false;
let performanceMode = 'auto'; // 'high', 'medium', 'low', 'auto'

// Mouse interaction throttling - varies by device performance
let lastMouseCheck = 0;
let mouseCheckInterval = 30; // Default
let lastMouseX = -1;
let lastMouseY = -1;
let mouseMoveThreshold = 5; // Default
let colorTransitionActive = false;
let colorTransitionTarget = null;

// Interaction rendering optimization - varies by device
let interactionRenderStep = 1; // How many lines to skip during interaction

function setupInteractionOptimization() {
  // Adjust interaction parameters based on device capability
  const interactionMode = window.interactionMode || 'high';
  
  switch(interactionMode) {
    case 'low':
      mouseCheckInterval = 50; // Check mouse less frequently
      mouseMoveThreshold = 8; // Larger movement needed
      interactionRenderStep = 4; // Render every 4th line during interaction
      colorLerpSpeed = 0.2; // Slower color transition
      break;
    case 'medium':
      mouseCheckInterval = 35;
      mouseMoveThreshold = 6;
      interactionRenderStep = 2; // Render every 2nd line during interaction
      colorLerpSpeed = 0.25;
      break;
    default: // high
      mouseCheckInterval = 20; // Very responsive
      mouseMoveThreshold = 3;
      interactionRenderStep = 1; // Render all lines
      colorLerpSpeed = 0.3;
  }
  
  console.log(`Interaction optimization: render step ${interactionRenderStep}, check interval ${mouseCheckInterval}ms`);
}

function preload() {
  textureImg = loadImage('../assets/texture.jpg');
  
  // Detect device performance
  detectPerformance();
}

function detectPerformance() {
  // Always generate high-quality lines, but optimize interactions based on device
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  
  // Visual quality is always high - only interaction performance varies
  let interactionMode = 'high';
  
  if (!gl) {
    interactionMode = 'low';
  } else {
    const renderer = gl.getParameter(gl.RENDERER);
    const vendor = gl.getParameter(gl.VENDOR);
    
    if (renderer.includes('Software')) {
      interactionMode = 'low';
    } else if (renderer.includes('Intel') && !renderer.includes('Iris')) {
      interactionMode = 'medium';
    }
    
    if (navigator.deviceMemory && navigator.deviceMemory < 2) {
      interactionMode = 'low';
    }
  }
  
  // Always high visual quality, variable interaction performance
  performanceMode = 'high'; // Visual quality
  isLowPerformanceDevice = (interactionMode !== 'high');
  
  console.log(`Visual quality: HIGH (dense lines)`);
  console.log(`Interaction performance: ${interactionMode}`);
  
  // Store interaction mode separately
  window.interactionMode = interactionMode;
}

function setup() {
  let canvas = createCanvas(900, 450);
  canvas.parent('canvas-container');
  background(245, 245, 245);

  lineLayer = createGraphics(width, height);

  baseColor = color(195, 70, 119);
  gradientColor = color(90, 90, 80);
  lineColor = baseColor;
  targetLineColor = baseColor;

  img = loadImage('debess-1.jpg', () => {
    imgLoaded = true;
    rectWidth = img.width - 4;
    extractLinesOptimized();
    setupSliders(canvas);
    setupInteractionOptimization(); // Setup interaction performance
    
    // Pre-render lines for performance
    prerenderLines();
  });
  
  // Always 60fps for smooth interactions
  frameRate(60);
}

function setupSliders(canvas) {
  const canvasPos = canvas.position();
  const centerX = canvasPos.x + width / 2;
  const centerY = canvasPos.y + height / 2;

  blurSlider = createSlider(0, 100, blurAmount);
  blurSlider.parent('canvas-container');
  blurSlider.position(centerX - rectWidth / 2, centerY + 230);
  blurSlider.style('width', `${rectWidth}px`);

  heightSlider = createSlider(1, 100, rectHeight);
  heightSlider.parent('canvas-container');
  heightSlider.style('transform', 'rotate(270deg)');
  heightSlider.style('transform-origin', 'top left');
  heightSlider.style('width', `${img.height}px`);
  heightSlider.position(centerX + 440, centerY + 200);
}

function prerenderLines() {
  if (!imgLoaded || linesCached) return;
  
  lineLayer.clear();
  lineLayer.push();
  lineLayer.translate(floor((width - img.width) / 2), floor((height - img.height) / 2));
  
  // Draw all lines once to the layer
  for (let l of lines) {
    l.color = baseColor;
    l.show(lineLayer);
  }
  
  lineLayer.pop();
  linesCached = true;
}

function draw() {
  if (!imgLoaded) return;

  background(245, 245, 245);
  
  let needsRedraw = false;
  let imgX = floor((width - img.width) / 2);
  let imgY = floor((height - img.height) / 2);
  
  // Throttle mouse checking but allow for smooth color transitions
  let currentTime = millis();
  let mouseMovedSignificantly = abs(mouseX - lastMouseX) > mouseMoveThreshold || 
                                abs(mouseY - lastMouseY) > mouseMoveThreshold;
  
  if (currentTime - lastMouseCheck > mouseCheckInterval && mouseMovedSignificantly) {
    lastMouseCheck = currentTime;
    lastMouseX = mouseX;
    lastMouseY = mouseY;
    
    let currentMouseRegion = 'outside';
    if (mouseX >= imgX && mouseX <= imgX + img.width && 
        mouseY >= imgY && mouseY <= imgY + img.height) {
      currentMouseRegion = 'inside';
    }

    // Recalculate target color when mouse region changes OR when inside and mouse moves
    if (currentMouseRegion !== lastMouseRegion || currentMouseRegion === 'inside') {
      lastMouseRegion = currentMouseRegion;
      colorTransitionActive = true;
      
      if (currentMouseRegion === 'inside') {
        let imgCenterX = imgX + img.width / 2;
        let imgCenterY = imgY + img.height / 2;
        let distToCenter = dist(mouseX, mouseY, imgCenterX, imgCenterY);
        let maxDistToCorner = dist(imgCenterX, imgCenterY, imgX, imgY);
        let colorFactor = map(distToCenter, 0, maxDistToCorner, 1, 0);
        targetLineColor = lerpColor(baseColor, color(0, 0, 0), colorFactor);
      } else {
        targetLineColor = baseColor;
      }
      colorTransitionTarget = targetLineColor;
    }
  }

  // Handle color transition - continue until colors match closely
  if (colorTransitionActive) {
    let oldLineColor = lineColor;
    lineColor = lerpColor(lineColor, targetLineColor, colorLerpSpeed);
    
    // Check if we've reached the target color (within small tolerance)
    let colorDiff = abs(red(lineColor) - red(targetLineColor)) + 
                   abs(green(lineColor) - green(targetLineColor)) + 
                   abs(blue(lineColor) - blue(targetLineColor));
    
    if (colorDiff < 3) {
      // Close enough - snap to target color
      lineColor = targetLineColor;
      colorTransitionActive = false;
    }
    
    // Redraw if color changed
    if (abs(red(lineColor) - red(oldLineColor)) > 1 || 
        abs(green(lineColor) - green(oldLineColor)) > 1 || 
        abs(blue(lineColor) - blue(oldLineColor)) > 1) {
      needsRedraw = true;
    }
  }

  // Redraw lines when necessary
  if (needsRedraw || !linesCached) {
    lineLayer.clear();
    lineLayer.push();
    lineLayer.translate(imgX, imgY);
    
    // Adaptive rendering during interaction - only affects interaction smoothness, not final quality
    let currentRenderStep = colorTransitionActive ? interactionRenderStep : 1;
    
    for (let i = 0; i < lines.length; i += currentRenderStep) {
      let l = lines[i];
      l.color = lineColor;
      l.show(lineLayer);
    }
    lineLayer.pop();
  }

  image(lineLayer, 0, 0);

  let rectHeightMapped = map(heightSlider.value(), 1, 100, 1, img.height);
  let rectX = floor((width - rectWidth) / 2);
  let rectY = floor((height - img.height) / 2 + img.height - rectHeightMapped + 3);
  blurAmount = blurSlider.value();

  createGradientOptimized(rectX, rectY, rectWidth, rectHeightMapped);
}

function createGradientOptimized(x, y, width, height) {
  // Skip expensive blend modes on low performance devices
  if (performanceMode === 'low') {
    // Simple gradient without blend modes
    fill(gradientColor._getRed(), gradientColor._getGreen(), gradientColor._getBlue(), 100);
    noStroke();
    rect(x, y, width, height);
    return;
  }
  
  blendMode(EXCLUSION);
  
  let grad = drawingContext.createLinearGradient(0, y, 0, y + height);
  grad.addColorStop(0, `rgba(${red(gradientColor)}, ${green(gradientColor)}, ${blue(gradientColor)}, 0)`);
  grad.addColorStop(1 - (blurAmount / 100), `rgba(${red(gradientColor)}, ${green(gradientColor)}, ${blue(gradientColor)}, 1)`);
  grad.addColorStop(1, `rgba(${red(gradientColor)}, ${green(gradientColor)}, ${blue(gradientColor)}, 1)`);
  drawingContext.fillStyle = grad;
  noStroke();
  rect(x, y, width, height);

  if (textureImg && performanceMode !== 'low') {
    blendMode(SCREEN);
    image(textureImg, x, y, width, height);
    noTint();
  }

  blendMode(BLEND);
}

function extractLinesOptimized() {
  if (!imgLoaded) return;

  img.loadPixels();
  lines = [];
  
  // ALWAYS use high-quality line generation - visual quality is consistent
  let pixelStep = 2;
  let densityMultiplier = 0.3;
  let maxLayers = 4;
  
  let scale = 0.02;
  let noiseStrength = map(messiness, 1, 5, PI / 12, PI / 2);
  let baseAngle = QUARTER_PI;

  // Generate lots of lines on ALL computers for consistent visual quality
  for (let y = 0; y < img.height; y += pixelStep) {
    for (let x = 0; x < img.width; x += pixelStep) {
      let index = (x + y * img.width) * 4;
      let r = img.pixels[index];
      let g = img.pixels[index + 1];
      let b = img.pixels[index + 2];
      let brightnessValue = (r + g + b) / 3;

      let density = map(brightnessValue, 0, 255, 40, 1);
      density = constrain(density * densityMultiplier, 0, 40);

      let textureFactor = map(brightnessValue, 0, 255, 0.5, 1.2);
      let layers = int(map(brightnessValue, 0, 255, maxLayers, 1));

      let noiseVal = noise(x * scale, y * scale);
      let angleDeviation = map(noiseVal, 0, 1, -noiseStrength, noiseStrength);
      let minLineLength = brightnessValue > 200 ? 2 : 4;
      let maxLineLength = brightnessValue > 200 ? 2 : 10;

      for (let i = 0; i < layers; i++) {
        if (random(100) < density) {
          let depth = random(0.5, 1.2);
          let randomOffsetX = random(-textureFactor, textureFactor) * depth;
          let randomOffsetY = random(-textureFactor, textureFactor) * depth;
          let angle = baseAngle + angleDeviation;
          let length = map(brightnessValue, 0, 255, minLineLength, maxLineLength);
          length *= random(1, 2);
          let alphaValue = random(100, 255);

          lines.push(new LineSegment(x + randomOffsetX, y + randomOffsetY, angle, length, lineColor, alphaValue));
        }
      }
    }
  }
  
  console.log(`Generated ${lines.length} lines (HIGH QUALITY on all devices)`);
}

// Optimized LineSegment class
class LineSegment {
  constructor(x, y, angle, length, color, alpha) {
    this.pos = createVector(x, y);
    this.angle = angle;
    this.length = length;
    this.color = color;
    this.alpha = alpha;
    
    // Pre-calculate end point
    this.endX = x + cos(angle) * length;
    this.endY = y + sin(angle) * length;
  }

  show(pg) {
    pg.stroke(red(this.color), green(this.color), blue(this.color), this.alpha);
    pg.strokeWeight(0.8);
    pg.line(this.pos.x, this.pos.y, this.endX, this.endY);
  }
}