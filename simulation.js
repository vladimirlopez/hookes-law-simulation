
function getCanvasColor(darkColor, lightColor) {
    return document.body.dataset.theme === 'light' ? lightColor : darkColor;
}
// ================================================================
// Hooke's Law Simulation — Lab Mode + Free Play
// ================================================================

// ==================== LAB MODE ====================
class LabSimulation {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.W = rect.width;
        this.H = rect.height;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';

        // Physics
        this.g = 9.8;
        this.springConstant = 30; // N/m (hidden from students)
        this.hangerMass = 0.050; // 50 g hanger
        this.addedMass = 0; // kg of slotted masses on hanger

        // Layout
        this.standX = 160;       // ring stand x
        this.armY = 60;          // arm height
        this.springTopY = 80;    // where spring starts (below arm)
        this.springX = this.standX + 100; // spring hangs here
        this.naturalLength = 120; // px natural spring length
        this.pxPerMeter = 800;    // pixels per meter of stretch

        // Reference: stretch at natural length
        this.hangerStretch = 0; 
        this.referenceY = this.springTopY + this.naturalLength;

        // Animation
        this.currentStretchPx = ((this.hangerMass * this.g) / this.springConstant) * this.pxPerMeter;
        this.targetStretchPx = this.currentStretchPx;
        this.animVelocity = 0;
        this.isAnimating = false;
        this.animId = null;

        // Data
        this.trials = [];
        this.maxTrials = 8;

        this.recalc();
        this.draw();
    }

    get totalMass() { return this.hangerMass + this.addedMass; }
    get stretch() {
        return (this.totalMass * this.g) / this.springConstant;
    }
    get force() { return this.totalMass * this.g; }

    recalc() {
        const totalStretch = (this.totalMass * this.g) / this.springConstant;
        this.targetStretchPx = totalStretch * this.pxPerMeter;
    }

    setSpringConstant(k) {
        this.springConstant = k;
        this.hangerStretch = 0;
        this.referenceY = this.springTopY + this.naturalLength;
        this.recalc();
        this.animateTo();
    }

    addMass(grams) {
        this.addedMass += grams / 1000;
        this.addedMass = Math.round(this.addedMass * 10000) / 10000; // fix float
        this.recalc();
        this.animateTo();
    }

    removeMass(grams) {
        this.addedMass -= grams / 1000;
        if (this.addedMass < 0) this.addedMass = 0;
        this.addedMass = Math.round(this.addedMass * 10000) / 10000;
        this.recalc();
        this.animateTo();
    }

    animateTo() {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.animVelocity = 0;
        const animate = () => {
            const diff = this.targetStretchPx - this.currentStretchPx;
            // Damped spring animation
            const springForce = diff * 0.15;
            this.animVelocity = (this.animVelocity + springForce) * 0.7;
            this.currentStretchPx += this.animVelocity;

            if (Math.abs(diff) < 0.3 && Math.abs(this.animVelocity) < 0.3) {
                this.currentStretchPx = this.targetStretchPx;
                this.isAnimating = false;
                this.draw();
                this.updateLabDisplay();
                return;
            }
            this.draw();
            this.updateLabDisplay();
            this.animId = requestAnimationFrame(animate);
        };
        animate();
    }

    recordTrial() {
        if (this.trials.length >= this.maxTrials) return null;
        if (this.isAnimating) return null; // wait for settle
        const trial = {
            num: this.trials.length + 1,
            addedGrams: Math.round(this.addedMass * 1000),
            totalMassKg: this.totalMass,
            stretchM: this.stretch,
            forceN: this.force // total force including hanger
        };
        this.trials.push(trial);
        return trial;
    }

    resetExperiment() {
        this.addedMass = 0;
        this.trials = [];
        this.recalc();
        this.animateTo();
    }

    // ---- Drawing ----
    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const springBottom = this.springTopY + this.naturalLength + this.currentStretchPx;

        this.drawRingStand(ctx);
        this.drawRuler(ctx, springBottom);
        this.drawSpring(ctx, this.springX, this.springTopY, this.springX, springBottom);
        this.drawHangerAndMasses(ctx, this.springX, springBottom);
        this.drawReferenceLine(ctx);
        this.drawStretchAnnotation(ctx, springBottom);
        this.drawLabels(ctx);
    }

    drawRingStand(ctx) {
        // Base
        ctx.fillStyle = getCanvasColor('#a9b2c3', '#4b6570');
        ctx.fillRect(this.standX - 50, this.H - 40, 100, 12);
        ctx.fillStyle = '#c9d1df';
        ctx.fillRect(this.standX - 55, this.H - 30, 110, 8);

        // Vertical pole
        const gradient = ctx.createLinearGradient(this.standX - 6, this.armY, this.standX + 6, this.armY);
        gradient.addColorStop(0, '#c8a24a');
        gradient.addColorStop(0.5, '#d8b767');
        gradient.addColorStop(1, '#8b7030');
        ctx.fillStyle = gradient;
        ctx.fillRect(this.standX - 6, this.armY, 12, this.H - 40 - this.armY);

        // Horizontal arm
        ctx.fillStyle = '#8b7030';
        ctx.fillRect(this.standX, this.armY - 5, this.springX - this.standX + 5, 10);

        // Clamp
        ctx.fillStyle = getCanvasColor(getCanvasColor('#eef2f9', '#123140'), '#123140');
        ctx.fillRect(this.standX - 10, this.armY - 10, 20, 20);
        ctx.fillRect(this.springX - 5, this.armY - 8, 10, 18);

        // Hook at bottom of arm
        ctx.strokeStyle = getCanvasColor(getCanvasColor('#eef2f9', '#123140'), '#123140');
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.springX, this.armY + 5);
        ctx.lineTo(this.springX, this.springTopY);
        ctx.stroke();
    }

    drawRuler(ctx, springBottom) {
        const rulerX = this.springX + 130;
        const rulerTop = this.springTopY + this.naturalLength - 20;
        const rulerBottom = Math.min(this.H - 50, rulerTop + 450);
        const rulerWidth = 32;

        // Ruler background
        ctx.fillStyle = getCanvasColor('rgba(229, 204, 143, 0.05)', 'rgba(11, 95, 119, 0.05)');
        ctx.fillRect(rulerX, rulerTop, rulerWidth, rulerBottom - rulerTop);
        ctx.strokeStyle = getCanvasColor('rgba(229, 204, 143, 0.3)', 'rgba(11, 95, 119, 0.3)');
        ctx.lineWidth = 1.5;
        ctx.strokeRect(rulerX, rulerTop, rulerWidth, rulerBottom - rulerTop);

        const pxPerCm = this.pxPerMeter / 100;
        const startCm = Math.floor((rulerTop - this.referenceY) / pxPerCm);
        const endCm = Math.ceil((rulerBottom - this.referenceY) / pxPerCm);

        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        for (let cm_10 = startCm * 10; cm_10 <= endCm * 10; cm_10 += 5) {
            const y = this.referenceY + (cm_10 / 10) * pxPerCm;
            if (y < rulerTop || y > rulerBottom) continue;

            let tickLen = 6;
            if (cm_10 % 10 === 0) tickLen = 12;

            ctx.strokeStyle = getCanvasColor('#a9b2c3', '#795548');
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(rulerX, y);
            ctx.lineTo(rulerX + tickLen, y);
            ctx.stroke();

            // Label every 2 cm mapping
            if (cm_10 % 20 === 0) {
                ctx.fillStyle = getCanvasColor('#a9b2c3', '#5d4037');
                const label = (cm_10 / 10).toString();
                ctx.fillText(label, rulerX + 16, y);
            }
        }

        // Zero mark highlighting
        const zeroY = this.referenceY;
        if (zeroY >= rulerTop && zeroY <= rulerBottom) {
            ctx.beginPath();
            ctx.moveTo(rulerX, zeroY);
            ctx.lineTo(rulerX + rulerWidth, zeroY);
            ctx.strokeStyle = '#ff5f7a'; 
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = '#ff5f7a'; 
            ctx.font = 'bold 11px Arial';
            ctx.fillText('0', rulerX + 16, zeroY - 8);
        }

        // Label
        ctx.save();
        ctx.translate(rulerX + rulerWidth + 14, rulerTop + (rulerBottom - rulerTop) / 2);
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = getCanvasColor('#a9b2c3', '#4b6570');
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Stretch (cm from reference)', 0, 0);
        ctx.restore();
    }

    drawSpring(ctx, x1, y1, x2, y2) {
        const coils = 22;
        const amplitude = 14;
        const length = y2 - y1;
        if (length < 5) return;

        ctx.save();
        ctx.strokeStyle = '#c8a24a';
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(x1, y1);

        // short straight lead-in
        const lead = 8;
        ctx.lineTo(x1, y1 + lead);

        const coilStart = y1 + lead;
        const coilEnd = y2 - lead;
        const coilLen = coilEnd - coilStart;

        if (coilLen > 5) {
            const segments = coils * 2;
            const segH = coilLen / segments;
            for (let i = 0; i < segments; i++) {
                const cy = coilStart + (i + 0.5) * segH;
                const cx = x1 + (i % 2 === 0 ? -1 : 1) * amplitude;
                ctx.lineTo(cx, cy);
            }
        }

        ctx.lineTo(x2, y2 - lead);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();

        // Top attachment dot
        ctx.beginPath();
        ctx.arc(x1, y1, 3, 0, Math.PI * 2);
        ctx.fillStyle = getCanvasColor(getCanvasColor('#eef2f9', '#123140'), '#123140');
        ctx.fill();
    }

    drawHangerAndMasses(ctx, x, y) {
        const hangerW = 44;
        const hangerH = 18;

        // Hook (small triangle at top)
        ctx.strokeStyle = getCanvasColor(getCanvasColor('#eef2f9', '#123140'), '#123140');
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 10);
        ctx.stroke();

        // Hanger bar
        ctx.fillStyle = getCanvasColor('#a9b2c3', '#4b6570');
        ctx.fillRect(x - hangerW / 2, y + 10, hangerW, hangerH);
        ctx.strokeStyle = '#c9d1df';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - hangerW / 2, y + 10, hangerW, hangerH);

        // Label on hanger
        ctx.fillStyle = getCanvasColor(getCanvasColor('#eef2f9', '#123140'), '#123140');
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('50g', x, y + 19);

        // Stacked masses
        const massCount = Math.round(this.addedMass * 1000 / 50);
        const slotH = 14;
        const slotW = 50;
        const colors = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#00acc1', '#8b7030', '#c9d1df'];

        for (let i = 0; i < massCount; i++) {
            const sy = y + 10 + hangerH + i * slotH;
            ctx.fillStyle = colors[i % colors.length];
            ctx.fillRect(x - slotW / 2, sy, slotW, slotH - 1);
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x - slotW / 2, sy, slotW, slotH - 1);

            // Mass label
            ctx.fillStyle = getCanvasColor(getCanvasColor('#eef2f9', '#123140'), '#123140');
            ctx.font = 'bold 9px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('50g', x, sy + slotH / 2 - 0.5);
        }
    }

    drawReferenceLine(ctx) {
        ctx.save();
        ctx.strokeStyle = '#ff5f7a';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(this.springX - 35, this.referenceY);
        ctx.lineTo(this.springX + 140, this.referenceY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ff5f7a';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('x = 0 (ref)', this.springX + 45, this.referenceY - 6);
        ctx.restore();
    }

    drawStretchAnnotation(ctx, springBottom) {
        const currentY = springBottom + 10;
        const stretchM = (this.currentStretchPx / this.pxPerMeter) - this.hangerStretch;

        if (Math.abs(stretchM) < 0.0005) return;

        const annotX = this.springX + 45;

        ctx.save();
        ctx.strokeStyle = '#c8a24a';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);

        // Vertical line from ref to current
        ctx.beginPath();
        ctx.moveTo(annotX, this.referenceY);
        ctx.lineTo(annotX, currentY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ticks
        ctx.beginPath();
        ctx.moveTo(annotX - 5, this.referenceY);
        ctx.lineTo(annotX + 5, this.referenceY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(annotX - 5, currentY);
        ctx.lineTo(annotX + 5, currentY);
        ctx.stroke();

        // Arrow
        ctx.fillStyle = '#c8a24a';
        ctx.beginPath();
        ctx.moveTo(annotX, currentY);
        ctx.lineTo(annotX - 5, currentY - 8);
        ctx.lineTo(annotX + 5, currentY - 8);
        ctx.closePath();
        ctx.fill();

        // Label
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`x = ${(stretchM * 100).toFixed(1)} cm`, annotX + 12, (this.referenceY + currentY) / 2 + 4);
        ctx.font = '10px Arial';
        ctx.fillStyle = getCanvasColor('#a9b2c3', '#4b6570');
        ctx.fillText(`(${stretchM.toFixed(4)} m)`, annotX + 12, (this.referenceY + currentY) / 2 + 18);

        ctx.restore();
    }

    drawLabels(ctx) {
        // Title in canvas
        ctx.fillStyle = getCanvasColor(getCanvasColor('#eef2f9', '#123140'), '#123140');
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Hooke\'s Law Lab Setup', 15, 25);

        // Total mass readout
        ctx.fillStyle = getCanvasColor('#a9b2c3', '#4b6570');
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Total hanging mass: ${(this.totalMass * 1000).toFixed(0)} g (${this.totalMass.toFixed(3)} kg)`, 15, 45);
        ctx.fillText(`Weight: ${(this.totalMass * this.g).toFixed(2)} N`, 15, 62);
    }

    updateLabDisplay() {
        const el = (id) => document.getElementById(id);
        el('labMass').textContent = this.totalMass.toFixed(3) + ' kg';
        el('labForce').textContent = this.force.toFixed(3) + ' N';
        el('labStretch').textContent = (this.stretch >= 0 ? this.stretch.toFixed(4) : '0.0000') + ' m';
        el('labTrials').textContent = this.trials.length + ' / ' + this.maxTrials;
        el('currentMassDisplay').textContent = Math.round(this.addedMass * 1000) + ' g';

        // Button states
        el('addMassBtn').disabled = this.addedMass >= 0.45 || this.isAnimating;
        el('removeMassBtn').disabled = this.addedMass <= 0 || this.isAnimating;
        el('recordBtn').disabled = this.trials.length >= this.maxTrials || this.isAnimating;
    }
}

// ==================== FORCE VS STRETCH GRAPH ====================
class ForceStretchGraph {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.data = []; // {x: stretch, y: force}
        this.showBestFit = false;

        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.W = rect.width;
        this.H = rect.height;

        this.draw();
    }

    addPoint(stretch, force) {
        this.data.push({ x: stretch, y: force });
        this.draw();
    }

    clear() {
        this.data = [];
        this.draw();
    }

    getSlope() {
        if (this.data.length < 2) return null;
        // Include origin (0,0) in fit
        const pts = [{ x: 0, y: 0 }, ...this.data];
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        const n = pts.length;
        for (const p of pts) {
            sumX += p.x;
            sumY += p.y;
            sumXY += p.x * p.y;
            sumX2 += p.x * p.x;
        }
        return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    }

    draw() {
        const ctx = this.ctx;
        const padding = { left: 60, right: 20, top: 20, bottom: 45 };
        const plotW = this.W - padding.left - padding.right;
        const plotH = this.H - padding.top - padding.bottom;

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Determine axis ranges
        let maxX = 0.2, maxY = 5;
        for (const p of this.data) {
            if (p.x > maxX * 0.8) maxX = p.x * 1.3;
            if (p.y > maxY * 0.8) maxY = p.y * 1.3;
        }
        // Round to nice values
        maxX = Math.ceil(maxX * 20) / 20; // round to nearest 0.05
        maxY = Math.ceil(maxY);

        // Background
        ctx.fillStyle = 'transparent';
        ctx.fillRect(padding.left, padding.top, plotW, plotH);

        // Grid
        ctx.strokeStyle = getCanvasColor('rgba(229, 204, 143, 0.1)', 'rgba(11, 95, 119, 0.1)');
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding.top + (i / 5) * plotH;
            ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(padding.left + plotW, y); ctx.stroke();
            const x = padding.left + (i / 5) * plotW;
            ctx.beginPath(); ctx.moveTo(x, padding.top); ctx.lineTo(x, padding.top + plotH); ctx.stroke();
        }

        // Axes
        ctx.strokeStyle = getCanvasColor('rgba(229, 204, 143, 0.4)', 'rgba(11, 95, 119, 0.4)');
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, padding.top + plotH);
        ctx.lineTo(padding.left + plotW, padding.top + plotH);
        ctx.stroke();

        // Axis labels
        ctx.fillStyle = getCanvasColor('#a9b2c3', '#4b6570');
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Stretch x (m)', padding.left + plotW / 2, this.H - 5);

        ctx.save();
        ctx.translate(14, padding.top + plotH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#ff5f7a';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('Force F (N)', 0, 0);
        ctx.restore();

        // Tick labels
        ctx.fillStyle = getCanvasColor('#a9b2c3', '#4b6570');
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (let i = 0; i <= 5; i++) {
            const xVal = (i / 5) * maxX;
            const px = padding.left + (i / 5) * plotW;
            ctx.fillText(xVal.toFixed(2), px, padding.top + plotH + 6);
        }
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i <= 5; i++) {
            const yVal = maxY - (i / 5) * maxY;
            const py = padding.top + (i / 5) * plotH;
            ctx.fillText(yVal.toFixed(1), padding.left - 8, py);
        }

        // Transform helpers
        const toPixelX = (v) => padding.left + (v / maxX) * plotW;
        const toPixelY = (v) => padding.top + plotH - (v / maxY) * plotH;

        // Best-fit line (through origin)
        if (this.showBestFit && this.data.length >= 2) {
            const slope = this.getSlope();
            if (slope !== null) {
                ctx.save();
                ctx.strokeStyle = '#ff5f7a';
                ctx.lineWidth = 2;
                ctx.setLineDash([6, 4]);
                ctx.beginPath();
                ctx.moveTo(toPixelX(0), toPixelY(0));
                const endX = maxX;
                const endY = slope * endX;
                ctx.lineTo(toPixelX(endX), toPixelY(Math.min(endY, maxY)));
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
            }
        }

        // Data points
        for (let i = 0; i < this.data.length; i++) {
            const p = this.data[i];
            const px = toPixelX(p.x);
            const py = toPixelY(p.y);

            ctx.fillStyle = '#c8a24a';
            ctx.strokeStyle = '#d8b767';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(px, py, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Trial number
            ctx.fillStyle = getCanvasColor(getCanvasColor('#eef2f9', '#123140'), '#123140');
            ctx.font = 'bold 8px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText((i + 1).toString(), px, py);
        }

        // Origin point (reference)
        const ox = toPixelX(0);
        const oy = toPixelY(0);
        ctx.fillStyle = getCanvasColor('#a9b2c3', '#4b6570');
        ctx.beginPath();
        ctx.arc(ox, oy, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ==================== FREE PLAY MODE ====================
class FreePlaySimulation {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.W = rect.width;
        this.H = rect.height;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';

        this.springConstant = 30;
        this.mass = 2;
        this.damping = 0;
        this.initialDisplacement = 1;
        this.displacement = this.initialDisplacement;
        this.velocity = 0;
        this.maxVelocity = 0;
        this.minVelocity = 0;
        this.time = 0;
        this.dt = 0.008;

        this.isRunning = false;
        this.animationId = null;

        this.showForceArrows = true;
        this.showEnergyBar = true;
        this.showTrail = false;
        this.trailHistory = [];
        this.maxTrailLength = 300;

        this.positionData = [];
        this.velocityData = [];
        this.maxGraphPoints = 600;
        this.graphTimeWindow = 8;

        // Layout
        this.wallX = 80;
        this.equilibriumX = this.W / 2;
        this.springY = this.H * 0.38;
        this.pixelsPerMeter = 120;
        this.springCoils = 18;
        this.springAmplitude = 18;
        this.massWidth = 60;
        this.massHeight = 50;

        this.calculate();
        this.draw();
    }

    calculate() {
        this.springForce = -this.springConstant * this.displacement;
        this.period = 2 * Math.PI * Math.sqrt(this.mass / this.springConstant);
        this.potentialEnergy = 0.5 * this.springConstant * this.displacement * this.displacement;
        this.kineticEnergy = 0.5 * this.mass * this.velocity * this.velocity;
        this.totalEnergy = 0.5 * this.springConstant * this.initialDisplacement * this.initialDisplacement;
    }

    reset() {
        this.displacement = this.initialDisplacement;
        this.velocity = 0;
        this.maxVelocity = 0;
        this.minVelocity = 0;
        this.time = 0;
        this.trailHistory = [];
        this.positionData = [];
        this.velocityData = [];
        this.calculate();
        this.draw();
        this.drawGraphs();
        this.updateDisplay();
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.totalEnergy = 0.5 * this.springConstant * this.initialDisplacement * this.initialDisplacement;
            this.animate();
        }
    }

    pause() {
        this.isRunning = false;
        if (this.animationId) { cancelAnimationFrame(this.animationId); this.animationId = null; }
    }

    animate() {
        if (!this.isRunning) return;
        this.stepPhysics();
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    stepPhysics() {
        const acc = (-this.springConstant * this.displacement - this.damping * this.velocity) / this.mass;
        this.velocity += acc * this.dt;
        if (this.velocity > this.maxVelocity) this.maxVelocity = this.velocity;
        if (this.velocity < this.minVelocity) this.minVelocity = this.velocity;
        this.displacement += this.velocity * this.dt;
        this.time += this.dt;

        if (this.showTrail) {
            this.trailHistory.push({ x: this.displacement, t: this.time });
            if (this.trailHistory.length > this.maxTrailLength) this.trailHistory.shift();
        }
        this.positionData.push({ t: this.time, v: this.displacement });
        this.velocityData.push({ t: this.time, v: this.velocity });
        if (this.positionData.length > this.maxGraphPoints) { this.positionData.shift(); this.velocityData.shift(); }

        this.calculate();
        this.draw();
        this.drawGraphs();
        this.updateDisplay();
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const massX = this.equilibriumX + this.displacement * this.pixelsPerMeter;
        const massY = this.springY;

        this.drawWall(ctx);
        this.drawEquilibriumLine(ctx);
        this.drawSurface(ctx);
        if (this.showTrail) this.drawTrail(ctx, massY);
        this.drawSpring(ctx, this.wallX, massX - this.massWidth / 2, massY);
        this.drawMassBlock(ctx, massX, massY);
        if (this.showForceArrows) this.drawForceArrow(ctx, massX, massY);
        if (this.showEnergyBar) this.drawEnergyBar(ctx);
        this.drawDisplacementAnnotation(ctx, massX, massY);
        this.drawLabelsH(ctx);
    }

    drawWall(ctx) {
        const t = this.springY - 80, b = this.springY + 80;
        ctx.fillStyle = getCanvasColor('rgba(229, 204, 143, 0.4)', 'rgba(11, 95, 119, 0.4)'); ctx.fillRect(this.wallX - 15, t, 15, b - t);
        ctx.strokeStyle = getCanvasColor('#a9b2c3', '#4b6570'); ctx.lineWidth = 1.5;
        for (let y = t; y < b; y += 12) { ctx.beginPath(); ctx.moveTo(this.wallX - 15, y); ctx.lineTo(this.wallX, y + 12); ctx.stroke(); }
        ctx.strokeStyle = '#343a40'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(this.wallX, t); ctx.lineTo(this.wallX, b); ctx.stroke();
    }

    drawEquilibriumLine(ctx) {
        ctx.save(); ctx.strokeStyle = getCanvasColor('#a9b2c3', '#4b6570'); ctx.lineWidth = 1.5; ctx.setLineDash([8, 6]);
        ctx.beginPath(); ctx.moveTo(this.equilibriumX, this.springY - 90); ctx.lineTo(this.equilibriumX, this.springY + 90); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = getCanvasColor('#a9b2c3', '#4b6570'); ctx.font = '12px Arial'; ctx.textAlign = 'center';
        ctx.fillText('x = 0', this.equilibriumX, this.springY - 95);
        ctx.fillText('(equilibrium)', this.equilibriumX, this.springY - 80);
        ctx.restore();
    }

    drawSurface(ctx) {
        const sy = this.springY + this.massHeight / 2 + 5;
        ctx.strokeStyle = getCanvasColor('#a9b2c3', '#4b6570'); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(this.wallX - 15, sy); ctx.lineTo(this.W - 40, sy); ctx.stroke();
        ctx.strokeStyle = getCanvasColor('#a9b2c3', '#4b6570'); ctx.lineWidth = 1;
        for (let x = this.wallX - 15; x < this.W - 40; x += 15) { ctx.beginPath(); ctx.moveTo(x, sy); ctx.lineTo(x + 10, sy + 10); ctx.stroke(); }
    }

    drawSpring(ctx, startX, endX, y) {
        const length = endX - startX;
        if (length < 10) return;
        ctx.save(); ctx.strokeStyle = '#c8a24a'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(startX, y);
        const sl = 10; ctx.lineTo(startX + sl, y);
        const cs = startX + sl, ce = endX - 5, cl = ce - cs;
        if (cl > 5) {
            const segs = this.springCoils * 2, sw = cl / segs;
            for (let i = 0; i < segs; i++) { ctx.lineTo(cs + (i + 0.5) * sw, y + (i % 2 === 0 ? -1 : 1) * this.springAmplitude); }
        }
        ctx.lineTo(endX, y); ctx.stroke(); ctx.restore();
        ctx.beginPath(); ctx.arc(startX, y, 4, 0, Math.PI * 2); ctx.fillStyle = getCanvasColor('rgba(229, 204, 143, 0.4)', 'rgba(11, 95, 119, 0.4)'); ctx.fill();
    }

    drawMassBlock(ctx, x, y) {
        const w = this.massWidth, h = this.massHeight;
        ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(x - w / 2 + 3, y - h / 2 + 3, w, h);
        const g = ctx.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
        g.addColorStop(0, '#c8a24a'); g.addColorStop(1, '#d8b767'); ctx.fillStyle = g;
        ctx.fillRect(x - w / 2, y - h / 2, w, h);
        ctx.strokeStyle = '#8b7030'; ctx.lineWidth = 2; ctx.strokeRect(x - w / 2, y - h / 2, w, h);
        ctx.fillStyle = getCanvasColor(getCanvasColor('#eef2f9', '#123140'), '#123140'); ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('m', x, y - 8); ctx.font = '12px Arial'; ctx.fillText(this.mass.toFixed(1) + ' kg', x, y + 10);
    }

    drawForceArrow(ctx, mx, my) {
        const f = this.springForce; if (Math.abs(f) < 0.5) return;
        let al = f * 2; al = Math.sign(al) * Math.min(Math.abs(al), 120);
        const ay = my - this.massHeight / 2 - 25, ex = mx + al;
        ctx.strokeStyle = '#ff5f7a'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(mx, ay); ctx.lineTo(ex, ay); ctx.stroke();
        const d = Math.sign(al);
        ctx.fillStyle = '#ff5f7a'; ctx.beginPath();
        ctx.moveTo(ex, ay); ctx.lineTo(ex - d * 12, ay - 6); ctx.lineTo(ex - d * 12, ay + 6);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ff5f7a'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(`Fs = ${f.toFixed(1)} N`, (mx + ex) / 2, ay - 8);
    }

    drawEnergyBar(ctx) {
        const bx = 50, by = this.H - 100, bw = this.W - 100, bh = 28;
        const tE = this.totalEnergy || 1;
        const pf = this.potentialEnergy / tE, kf = this.kineticEnergy / tE;
        ctx.fillStyle = getCanvasColor('rgba(229, 204, 143, 0.1)', 'rgba(11, 95, 119, 0.1)'); ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = getCanvasColor('#a9b2c3', '#4b6570'); ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, bh);
        const pw = pf * bw; ctx.fillStyle = '#ff5f7a'; ctx.fillRect(bx, by, pw, bh);
        const kw = kf * bw; ctx.fillStyle = '#5cbf79'; ctx.fillRect(bx + pw, by, kw, bh);
        ctx.fillStyle = getCanvasColor(getCanvasColor('#eef2f9', '#123140'), '#123140'); ctx.font = 'bold 13px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.fillText('Energy Distribution', bx, by - 8);
        if (pw > 50) { ctx.fillStyle = getCanvasColor(getCanvasColor('#eef2f9', '#123140'), '#123140'); ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`PE = ${this.potentialEnergy.toFixed(1)} J`, bx + pw / 2, by + bh / 2); }
        if (kw > 50) { ctx.fillStyle = getCanvasColor(getCanvasColor('#eef2f9', '#123140'), '#123140'); ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.fillText(`KE = ${this.kineticEnergy.toFixed(1)} J`, bx + pw + kw / 2, by + bh / 2); }
        const ly = by + bh + 16; ctx.font = '12px Arial'; ctx.textAlign = 'left';
        ctx.fillStyle = '#ff5f7a'; ctx.fillRect(bx, ly - 6, 12, 12); ctx.fillStyle = getCanvasColor(getCanvasColor('#eef2f9', '#123140'), '#123140'); ctx.fillText('PE (½kx²)', bx + 18, ly + 4);
        ctx.fillStyle = '#5cbf79'; ctx.fillRect(bx + 140, ly - 6, 12, 12); ctx.fillStyle = getCanvasColor(getCanvasColor('#eef2f9', '#123140'), '#123140'); ctx.fillText('KE (½mv²)', bx + 158, ly + 4);
        ctx.fillStyle = getCanvasColor('#a9b2c3', '#4b6570'); ctx.fillText(`Total = ${(this.potentialEnergy + this.kineticEnergy).toFixed(2)} J`, bx + 310, ly + 4);
    }

    drawDisplacementAnnotation(ctx, mx, my) {
        if (Math.abs(this.displacement) < 0.05) return;
        const ay = my + this.massHeight / 2 + 35;
        ctx.save(); ctx.strokeStyle = '#c8a24a'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(this.equilibriumX, ay); ctx.lineTo(mx, ay); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(this.equilibriumX, ay - 6); ctx.lineTo(this.equilibriumX, ay + 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mx, ay - 6); ctx.lineTo(mx, ay + 6); ctx.stroke();
        const d = Math.sign(this.displacement);
        ctx.fillStyle = '#c8a24a'; ctx.beginPath(); ctx.moveTo(mx, ay); ctx.lineTo(mx - d * 8, ay - 5); ctx.lineTo(mx - d * 8, ay + 5); ctx.closePath(); ctx.fill();
        ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(`x = ${this.displacement > 0 ? '+' : ''}${this.displacement.toFixed(2)} m`, (this.equilibriumX + mx) / 2, ay + 10);
        ctx.restore();
    }

    drawTrail(ctx, my) {
        if (this.trailHistory.length < 2) return;
        ctx.save();
        for (let i = 1; i < this.trailHistory.length; i++) {
            const a = i / this.trailHistory.length * 0.5;
            const p = this.trailHistory[i];
            ctx.fillStyle = `rgba(108,92,231,${a})`;
            ctx.beginPath(); ctx.arc(this.equilibriumX + p.x * this.pixelsPerMeter, my, 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }

    drawLabelsH(ctx) {
        ctx.fillStyle = getCanvasColor('#a9b2c3', '#4b6570'); ctx.font = '12px Arial'; ctx.textAlign = 'center';
        ctx.fillText('← Compressed', this.equilibriumX - 100, this.springY - 110);
        ctx.fillText('Stretched →', this.equilibriumX + 100, this.springY - 110);
        ctx.font = '11px Arial'; ctx.fillStyle = getCanvasColor('#a9b2c3', '#4b6570');
        ctx.fillText('(−x)', this.equilibriumX - 100, this.springY - 96);
        ctx.fillText('(+x)', this.equilibriumX + 100, this.springY - 96);
    }

    drawGraphs() {
        this.drawGraph('fpPositionGraph', this.positionData, '#c8a24a', 'x (m)', 2.5);
        this.drawGraph('fpVelocityGraph', this.velocityData, '#5cbf79', 'v (m/s)', 8);
    }

    drawGraph(canvasId, data, color, ylabel, yRange) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        if (canvas.width !== rect.width * dpr) { canvas.width = rect.width * dpr; canvas.height = rect.height * dpr; ctx.scale(dpr, dpr); }
        const w = rect.width, h = rect.height;
        const pad = { left: 55, right: 15, top: 15, bottom: 30 };
        const pw = w - pad.left - pad.right, ph = h - pad.top - pad.bottom;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'transparent'; ctx.fillRect(pad.left, pad.top, pw, ph);
        ctx.strokeStyle = getCanvasColor('rgba(229, 204, 143, 0.1)', 'rgba(11, 95, 119, 0.1)'); ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) { const y = pad.top + (i / 4) * ph; ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + pw, y); ctx.stroke(); }
        const zy = pad.top + ph / 2;
        ctx.strokeStyle = getCanvasColor('#a9b2c3', '#4b6570'); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(pad.left, zy); ctx.lineTo(pad.left + pw, zy); ctx.stroke();
        ctx.fillStyle = getCanvasColor('#a9b2c3', '#4b6570'); ctx.font = '11px Arial'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for (let i = 0; i <= 4; i++) { const y = pad.top + (i / 4) * ph; ctx.fillText((yRange - (i / 4) * 2 * yRange).toFixed(1), pad.left - 8, y); }
        ctx.save(); ctx.translate(12, pad.top + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillStyle = color; ctx.font = 'bold 12px Arial'; ctx.fillText(ylabel, 0, 0); ctx.restore();
        ctx.fillStyle = getCanvasColor('#a9b2c3', '#4b6570'); ctx.font = '11px Arial'; ctx.textAlign = 'center'; ctx.fillText('Time (s)', pad.left + pw / 2, h - 5);
        if (data.length > 1) {
            const tMin = Math.max(0, data[data.length - 1].t - this.graphTimeWindow), tMax = tMin + this.graphTimeWindow;
            ctx.save(); ctx.beginPath(); ctx.rect(pad.left, pad.top, pw, ph); ctx.clip();
            ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
            let s = false;
            for (const p of data) { const px = pad.left + ((p.t - tMin) / this.graphTimeWindow) * pw, py = zy - (p.v / yRange) * (ph / 2); if (!s) { ctx.moveTo(px, py); s = true; } else ctx.lineTo(px, py); }
            ctx.stroke(); ctx.restore();
            ctx.fillStyle = getCanvasColor('#a9b2c3', '#4b6570'); ctx.font = '10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
            for (let t = Math.ceil(tMin); t <= Math.floor(tMax); t++) { ctx.fillText(t.toFixed(0), pad.left + ((t - tMin) / this.graphTimeWindow) * pw, pad.top + ph + 4); }
        }
        ctx.strokeStyle = getCanvasColor('rgba(229, 204, 143, 0.4)', 'rgba(11, 95, 119, 0.4)'); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top + ph); ctx.lineTo(pad.left + pw, pad.top + ph); ctx.stroke();
    }

    updateDisplay() {
        const el = (id) => document.getElementById(id);
        el('fpCurrentDisplacement').textContent = this.displacement.toFixed(2) + ' m';
        el('fpCurrentVelocity').textContent = this.velocity.toFixed(2) + ' m/s';
        if(el('fpMaxVelocity')) el('fpMaxVelocity').textContent = this.maxVelocity.toFixed(2) + ' m/s';
        if(el('fpMinVelocity')) el('fpMinVelocity').textContent = this.minVelocity.toFixed(2) + ' m/s';
        el('fpCurrentForce').textContent = this.springForce.toFixed(2) + ' N';
        el('fpCurrentPeriod').textContent = this.period.toFixed(2) + ' s';
        el('fpCurrentTime').textContent = this.time.toFixed(2) + ' s';
    }
}

// ================================================================
// INITIALIZATION
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
    // ---- Mode switching ----
    const modeTabs = document.querySelectorAll('.mode-tab');
    const modeContents = document.querySelectorAll('.mode-content');
    let currentMode = 'lab';

    modeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const mode = tab.dataset.mode;
            modeTabs.forEach(t => {
                t.classList.remove('active');
                t.classList.add('ghost');
            });
            modeContents.forEach(c => c.classList.remove('active'));
            tab.classList.remove('ghost');
            tab.classList.add('active');
            document.getElementById(mode + '-mode').classList.add('active');
            currentMode = mode;

            // Lazy-init free play
            if (mode === 'freeplay' && !fpSim) initFreePlay();
        });
    });

    // ---- Tab switching (info panels) ----
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            const nav = btn.parentElement;
            const panel = nav.parentElement;
            nav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            panel.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(tabName + '-tab').classList.add('active');
        });
    });

    // ==================== LAB MODE INIT ====================
    const labCanvas = document.getElementById('labCanvas');
    const lab = new LabSimulation(labCanvas);
    const graph = new ForceStretchGraph('forceStretchGraph');

    // Randomize k on load (between 20 and 50)
    const randomK = Math.round(Math.random() * 30 + 20);
    lab.setSpringConstant(randomK);
    document.getElementById('springConstantInput').value = randomK;
    document.getElementById('springConstantValue').textContent = randomK + ' N/m';
    lab.updateLabDisplay();

    // Add / Remove mass
    document.getElementById('addMassBtn').addEventListener('click', () => {
        lab.addMass(50);
        announce('Added 50 grams');
    });
    document.getElementById('removeMassBtn').addEventListener('click', () => {
        lab.removeMass(50);
        announce('Removed 50 grams');
    });

    // Record data point
    document.getElementById('recordBtn').addEventListener('click', () => {
        const trial = lab.recordTrial();
        if (!trial) return;

        // Update table
        const row = document.getElementById('trial' + trial.num);
        const cells = row.cells;
        cells[1].textContent = trial.addedGrams;
        cells[2].textContent = trial.totalMassKg.toFixed(3);
        cells[3].textContent = trial.stretchM.toFixed(4);
        cells[4].textContent = trial.forceN.toFixed(3);
        row.classList.add('recorded');

        // Update graph
        graph.addPoint(trial.stretchM, trial.forceN);

        // Update slope if best-fit is on
        updateSlopeDisplay();

        lab.updateLabDisplay();
        announce(`Trial ${trial.num} recorded`);
    });

    // Reset
    document.getElementById('resetLabBtn').addEventListener('click', () => {
        lab.resetExperiment();
        graph.clear();

        // Clear table
        for (let i = 1; i <= 8; i++) {
            const row = document.getElementById('trial' + i);
            for (let j = 1; j < 5; j++) row.cells[j].textContent = '—';
            row.classList.remove('recorded');
        }

        document.getElementById('slopeDisplay').classList.add('hidden');
        lab.updateLabDisplay();
        announce('Experiment reset');
    });

    // Best-fit toggle
    document.getElementById('showBestFit').addEventListener('change', (e) => {
        graph.showBestFit = e.target.checked;
        graph.draw();
        updateSlopeDisplay();
    });

    function updateSlopeDisplay() {
        const display = document.getElementById('slopeDisplay');
        if (graph.showBestFit && graph.data.length >= 2) {
            const slope = graph.getSlope();
            if (slope !== null) {
                document.getElementById('slopeValue').textContent = slope.toFixed(2);
                display.classList.remove('hidden');
            }
        } else {
            display.classList.add('hidden');
        }
    }

    // Teacher mode
    document.getElementById('springConstantInput').addEventListener('input', (e) => {
        const k = parseInt(e.target.value);
        document.getElementById('springConstantValue').textContent = k + ' N/m';
        lab.setSpringConstant(k);
        // Reset experiment when k changes
        lab.resetExperiment();
        graph.clear();
        for (let i = 1; i <= 8; i++) {
            const row = document.getElementById('trial' + i);
            for (let j = 1; j < 5; j++) row.cells[j].textContent = '—';
            row.classList.remove('recorded');
        }
        document.getElementById('slopeDisplay').classList.add('hidden');
        lab.updateLabDisplay();
    });

    document.getElementById('randomizeK').addEventListener('click', () => {
        const k = Math.round(Math.random() * 40 + 15);
        document.getElementById('springConstantInput').value = k;
        document.getElementById('springConstantValue').textContent = k + ' N/m';
        lab.setSpringConstant(k);
        lab.resetExperiment();
        graph.clear();
        for (let i = 1; i <= 8; i++) {
            const row = document.getElementById('trial' + i);
            for (let j = 1; j < 5; j++) row.cells[j].textContent = '—';
            row.classList.remove('recorded');
        }
        document.getElementById('slopeDisplay').classList.add('hidden');
        lab.updateLabDisplay();
        announce('Spring constant randomized');
    });

    // ==================== FREE PLAY INIT (lazy) ====================
    let fpSim = null;
    function initFreePlay() {
        const fpCanvas = document.getElementById('springCanvas');
        fpSim = new FreePlaySimulation(fpCanvas);
        fpSim.updateDisplay();
        fpSim.drawGraphs();

        const el = (id) => document.getElementById(id);

        el('fpSpringConstant').addEventListener('input', (e) => {
            fpSim.springConstant = parseFloat(e.target.value);
            el('fpSpringConstantDisplay').textContent = e.target.value + ' N/m';
            fpSim.calculate();
            if (!fpSim.isRunning) { fpSim.draw(); fpSim.updateDisplay(); }
        });
        el('fpMass').addEventListener('input', (e) => {
            fpSim.mass = parseFloat(e.target.value);
            el('fpMassDisplay').textContent = parseFloat(e.target.value).toFixed(1) + ' kg';
            fpSim.calculate();
            if (!fpSim.isRunning) { fpSim.draw(); fpSim.updateDisplay(); }
        });
        el('fpDisplacement').addEventListener('input', (e) => {
            fpSim.initialDisplacement = parseFloat(e.target.value);
            el('fpDisplacementDisplay').textContent = parseFloat(e.target.value).toFixed(2) + ' m';
            if (!fpSim.isRunning) {
                fpSim.displacement = fpSim.initialDisplacement;
                fpSim.totalEnergy = 0.5 * fpSim.springConstant * fpSim.initialDisplacement ** 2;
                fpSim.calculate();
                fpSim.draw();
                fpSim.updateDisplay();
            }
        });
        el('fpDamping').addEventListener('input', (e) => {
            fpSim.damping = parseFloat(e.target.value);
            const v = parseFloat(e.target.value);
            el('fpDampingDisplay').textContent = v === 0 ? '0.0 (None)' : v < 1 ? v.toFixed(1) + ' (Light)' : v < 3 ? v.toFixed(1) + ' (Medium)' : v.toFixed(1) + ' (Heavy)';
        });

        el('fpStartBtn').addEventListener('click', () => {
            fpSim.start(); el('fpStartBtn').disabled = true; el('fpPauseBtn').disabled = false; el('fpStepBtn').disabled = true;
            el('fpSpringConstant').disabled = true; el('fpMass').disabled = true; el('fpDisplacement').disabled = true;
        });
        el('fpPauseBtn').addEventListener('click', () => {
            fpSim.pause(); el('fpStartBtn').disabled = false; el('fpPauseBtn').disabled = true; el('fpStepBtn').disabled = false;
        });
        el('fpStepBtn').addEventListener('click', () => {
            fpSim.stepPhysics();
        });
        el('fpResetBtn').addEventListener('click', () => {
            fpSim.pause(); fpSim.reset();
            el('fpStartBtn').disabled = false; el('fpPauseBtn').disabled = true; el('fpStepBtn').disabled = false;
            el('fpSpringConstant').disabled = false; el('fpMass').disabled = false; el('fpDisplacement').disabled = false;
        });

        el('fpShowForce').addEventListener('change', (e) => { fpSim.showForceArrows = e.target.checked; fpSim.draw(); });
        el('fpShowEnergy').addEventListener('change', (e) => { fpSim.showEnergyBar = e.target.checked; fpSim.draw(); });
        el('fpShowTrail').addEventListener('change', (e) => { fpSim.showTrail = e.target.checked; if (!e.target.checked) fpSim.trailHistory = []; fpSim.draw(); });

        el('fpPauseBtn').disabled = true;
        el('fpStepBtn').disabled = false;
    }

    // ---- Keyboard shortcuts ----
    document.addEventListener('keydown', (e) => {
        if (e.target.matches('input')) return;
        if (currentMode === 'freeplay' && fpSim) {
            if (e.code === 'Space') { e.preventDefault(); fpSim.isRunning ? document.getElementById('fpPauseBtn').click() : document.getElementById('fpStartBtn').click(); }
            else if (e.code === 'KeyR') { e.preventDefault(); document.getElementById('fpResetBtn').click(); }
        }
    });


    // Theme observer to redraw canvases
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'data-theme') {
                if (lab) lab.draw();
                if (graph) graph.draw();
                if (fpSim && !fpSim.isRunning) { fpSim.draw(); fpSim.drawGraphs(); }
            }
        });
    });
    observer.observe(document.body, { attributes: true });

    function announce(msg) {
        const el = document.getElementById('sr-announcements');
        if (el) el.textContent = msg;
    }
});
