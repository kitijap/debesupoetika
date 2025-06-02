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
let colorLerpSpeed = 0.1; // Reduced from 0.5
let isLowPerformanceDevice = false;
let performanceMode = 'auto'; // 'high', 'medium', 'low', 'auto'

// Mouse interaction throttling
let lastMouseCheck = 0;
let mouseCheckInterval = 50; // Check mouse every 50ms instead of every frame
let lastMouseX = -1;
let lastMouseY = -1;
let mouseMoveThreshold = 10; // Only update if mouse moved significantly
let colorTransitionFrames = 0;
let maxColorTransitionFrames = 30; // Limit color transition duration

function preload() {
  textureImg = loadImage('../assets/texture.jpg');
  
  // Detect device performance
  detectPerformance();
}

function detectPerformance() {
  // Simple performance detection
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  
  if (!gl) {
    isLowPerformanceDevice = true;
    performanceMode = 'low';
    return;
  }
  
  const renderer = gl.getParameter(gl.RENDERER);
  const vendor = gl.getParameter(gl.VENDOR);
  
  // Check for integrated graphics or older hardware
  if (renderer.includes('Intel') || 
      renderer.includes('Software') || 
      vendor.includes('Microsoft')) {
    isLowPerformanceDevice = true;
    performanceMode = 'medium';
  }
  
  // Check memory (rough estimate)
  if (navigator.deviceMemory && navigator.deviceMemory < 4) {
    isLowPerformanceDevice = true;
    performanceMode = 'low';
  }
}

function setup() {
  let canvas = createCanvas(950, 525);
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
    
    // Pre-render lines for performance
    prerenderLines();
  });
  
  // Set frame rate based on performance
  if (performanceMode === 'low') {
    frameRate(30);
  } else if (performanceMode === 'medium') {
    frameRate(45);
  } else {
    frameRate(60);
  }
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

  // Optimize mouse region checking
  let currentMouseRegion = 'outside';
  if (mouseX >= imgX && mouseX <= imgX + img.width && 
      mouseY >= imgY && mouseY <= imgY + img.height) {
    currentMouseRegion = 'inside';
  }

  // Only recalculate if mouse region changed
  if (currentMouseRegion !== lastMouseRegion) {
    needsRedraw = true;
    lastMouseRegion = currentMouseRegion;
    
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
  }

  // Smooth color transition
  let oldLineColor = lineColor;
  lineColor = lerpColor(lineColor, targetLineColor, colorLerpSpeed);
  
  // Only redraw if color changed significantly
  if (abs(red(lineColor) - red(oldLineColor)) > 2 || 
      abs(green(lineColor) - green(oldLineColor)) > 2 || 
      abs(blue(lineColor) - blue(oldLineColor)) > 2) {
    needsRedraw = true;
  }

  // Redraw lines only when necessary
  if (needsRedraw || !linesCached) {
    lineLayer.clear();
    lineLayer.push();
    lineLayer.translate(imgX, imgY);
    
    // Reduced line rendering for low performance
    let renderStep = performanceMode === 'low' ? 3 : 1;
    
    for (let i = 0; i < lines.length; i += renderStep) {
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
  
  // Adjust parameters based on performance
  let pixelStep, densityMultiplier, maxLayers;
  
  switch(performanceMode) {
    case 'low':
      pixelStep = 4; // Reduced from 6 to ensure better coverage
      densityMultiplier = 0.15; // Slightly increased
      maxLayers = 2; // Increased from 1
      break;
    case 'medium':
      pixelStep = 3; // Reduced from 4
      densityMultiplier = 0.25; // Slightly increased
      maxLayers = 3; // Increased from 2
      break;
    default:
      pixelStep = 2;
      densityMultiplier = 0.3;
      maxLayers = 4;
  }
  
  let scale = 0.02;
  let noiseStrength = map(messiness, 1, 5, PI / 12, PI / 2);
  let baseAngle = QUARTER_PI;

  // Process entire image without line count limits
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
  
  console.log(`Generated ${lines.length} lines in ${performanceMode} performance mode`);
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