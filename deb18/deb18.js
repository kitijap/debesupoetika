let img;
let imgLoaded = false;
let rectHeight = 45;
let rectWidth;
let blurAmount = 50;
let blurSlider, heightSlider;

let lines = [];
let lineColor;
let targetLineColor;

let lineLayer;
let messiness = 3;

let textureImg;

let baseColor;
let gradientColor;

function preload() {
  textureImg = loadImage('../assets/texture.jpg');
}

function setup() {
  let canvas = createCanvas(900, 450);
  canvas.parent('canvas-container');
  background(245, 245, 245);

  lineLayer = createGraphics(width, height);

  baseColor = color(90, 118, 174);
  gradientColor = color(90, 90, 80);
  lineColor = baseColor;
  targetLineColor = baseColor;

  img = loadImage('debess-18.jpg', () => {
    imgLoaded = true;
    rectWidth = img.width - 4;
    extractLines();
    setupSliders(canvas);
  });
}

function lightenColor(c, amount = 0.3) {
  let white = color(255, 255, 255);
  return lerpColor(c, white, amount);
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

function draw() {
  if (!imgLoaded) return;

  background(245, 245, 245);

  let imgX = floor((width - img.width) / 2);
  let imgY = floor((height - img.height) / 2);

  if (mouseX >= imgX && mouseX <= imgX + img.width && mouseY >= imgY && mouseY <= imgY + img.height) {
    let imgCenterX = imgX + img.width / 2;
    let imgCenterY = imgY + img.height / 2;
    let distToCenter = dist(mouseX, mouseY, imgCenterX, imgCenterY);
    let maxDistToCorner = dist(imgCenterX, imgCenterY, imgX, imgY);
    let colorFactor = map(distToCenter, 0, maxDistToCorner, 1, 0);
    targetLineColor = lerpColor(baseColor, color(0, 0, 0), colorFactor);
  } else {
    targetLineColor = baseColor;
  }

  lineColor = lerpColor(lineColor, targetLineColor, 0.5);

  lineLayer.clear();
  lineLayer.push();
  lineLayer.translate(floor((width - img.width) / 2), floor((height - img.height) / 2));
  for (let l of lines) {
    l.color = lineColor;
    l.show(lineLayer);
  }
  lineLayer.pop();
  image(lineLayer, 0, 0);

  let rectHeightMapped = map(heightSlider.value(), 1, 100, 1, img.height);
  let rectX = floor((width - rectWidth) / 2);
  let rectY = floor((height - img.height) / 2 + img.height - rectHeightMapped + 3);
  blurAmount = blurSlider.value();

  createGradient(rectX, rectY, rectWidth, rectHeightMapped);
}

function createGradient(x, y, width, height) {
  blendMode(EXCLUSION);
  
  let grad = drawingContext.createLinearGradient(0, y, 0, y + height);
  grad.addColorStop(0, `rgba(${red(gradientColor)}, ${green(gradientColor)}, ${blue(gradientColor)}, 0)`);
  grad.addColorStop(1 - (blurAmount / 100), `rgba(${red(gradientColor)}, ${green(gradientColor)}, ${blue(gradientColor)}, 1)`);
  grad.addColorStop(1, `rgba(${red(gradientColor)}, ${green(gradientColor)}, ${blue(gradientColor)}, 1)`);
  drawingContext.fillStyle = grad;
  noStroke();
  rect(x, y, width, height);

  if (textureImg) {
    blendMode(SCREEN);
    image(textureImg, x, y, width, height);
    noTint();
  }

  blendMode(BLEND);
}

function extractLines() {
  if (!imgLoaded) return;

  img.loadPixels();
  lines = [];
  let scale = 0.02;
  let noiseStrength = map(messiness, 1, 5, PI / 12, PI / 2);
  let baseAngle = QUARTER_PI;

  for (let y = 0; y < img.height; y += 2) {
    for (let x = 0; x < img.width; x += 2) {
      let index = (x + y * img.width) * 4;
      let r = img.pixels[index];
      let g = img.pixels[index + 1];
      let b = img.pixels[index + 2];
      let brightnessValue = (r + g + b) / 3;

      let density = map(brightnessValue, 0, 255, 40, 1);
      density = constrain(density * 0.3, 0, 40);

      let textureFactor = map(brightnessValue, 0, 255, 0.5, 1.2);
      let layers = int(map(brightnessValue, 0, 255, 4, 1));

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
}

class LineSegment {
  constructor(x, y, angle, length, color, alpha) {
    this.pos = createVector(x, y);
    this.angle = angle;
    this.length = length;
    this.color = color;
    this.alpha = alpha;
  }

  show(pg) {
    pg.stroke(red(this.color), green(this.color), blue(this.color), this.alpha);
    pg.strokeWeight(0.8);
    let x2 = this.pos.x + cos(this.angle) * this.length;
    let y2 = this.pos.y + sin(this.angle) * this.length;
    pg.line(this.pos.x, this.pos.y, x2, y2);
  }
}