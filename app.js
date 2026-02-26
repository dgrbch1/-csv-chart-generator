// ─── State ───────────────────────────────────────────────────────────────────
let parsedHeaders = [];
let parsedRows = [];
let chartInstance = null;

// ─── Elements ────────────────────────────────────────────────────────────────
const dropZone      = document.getElementById('drop-zone');
const fileInput     = document.getElementById('file-input');
const fileInfo      = document.getElementById('file-info');
const previewSec    = document.getElementById('preview-section');
const configSec     = document.getElementById('config-section');
const chartSec      = document.getElementById('chart-section');
const previewTable  = document.getElementById('preview-table');
const rowCount      = document.getElementById('row-count');
const xAxisSel      = document.getElementById('x-axis');
const yAxisSel      = document.getElementById('y-axis');
const chartTypeSel  = document.getElementById('chart-type');
const chartColor    = document.getElementById('chart-color');
const generateBtn   = document.getElementById('generate-btn');
const downloadBtn   = document.getElementById('download-btn');
const newChartBtn   = document.getElementById('new-chart-btn');
const suggestBadge  = document.getElementById('suggest-badge');

// ─── Drag & Drop ─────────────────────────────────────────────────────────────
dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
});

dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) processFile(fileInput.files[0]);
});

// ─── CSV Processing ───────────────────────────────────────────────────────────
function processFile(file) {
  if (!file.name.endsWith('.csv')) {
    fileInfo.textContent = 'Please upload a valid .csv file.';
    fileInfo.style.color = '#e94560';
    return;
  }

  fileInfo.textContent = `Loaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  fileInfo.style.color = '#4ecca3';

  const reader = new FileReader();
  reader.onload = e => parseCSV(e.target.result);
  reader.readAsText(file);
}

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim() !== '');
  if (lines.length < 2) return;

  parsedHeaders = splitCSVLine(lines[0]);
  parsedRows = lines.slice(1).map(splitCSVLine);

  renderPreview();
  populateAxisSelects();

  previewSec.classList.remove('hidden');
  configSec.classList.remove('hidden');
  chartSec.classList.add('hidden');
}

function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// ─── Preview Table ────────────────────────────────────────────────────────────
function renderPreview() {
  const PREVIEW_ROWS = 8;
  const displayRows = parsedRows.slice(0, PREVIEW_ROWS);

  let html = '<thead><tr>';
  parsedHeaders.forEach(h => { html += `<th>${escapeHTML(h)}</th>`; });
  html += '</tr></thead><tbody>';

  displayRows.forEach(row => {
    html += '<tr>';
    row.forEach(cell => { html += `<td title="${escapeHTML(cell)}">${escapeHTML(cell)}</td>`; });
    html += '</tr>';
  });

  html += '</tbody>';
  previewTable.innerHTML = html;

  const extra = parsedRows.length > PREVIEW_ROWS ? ` (showing first ${PREVIEW_ROWS})` : '';
  rowCount.textContent = `${parsedRows.length} rows × ${parsedHeaders.length} columns${extra}`;
}

// ─── Axis Selects ─────────────────────────────────────────────────────────────
function populateAxisSelects() {
  xAxisSel.innerHTML = '';
  yAxisSel.innerHTML = '';

  parsedHeaders.forEach((h, i) => {
    xAxisSel.innerHTML += `<option value="${i}">${escapeHTML(h)}</option>`;
    yAxisSel.innerHTML += `<option value="${i}">${escapeHTML(h)}</option>`;
  });

  // Default y-axis to second column if available
  if (parsedHeaders.length > 1) yAxisSel.value = '1';

  // Run auto-suggest after axes are set
  runAutoSuggest();
}

// ─── Auto-Suggest Chart Type ──────────────────────────────────────────────────
const SUGGEST_REASONS = {
  scatter:  { icon: '⬡', text: 'Scatter suggested — both axes are numeric' },
  line:     { icon: '📈', text: 'Line suggested — X axis looks like dates/time' },
  pie:      { icon: '🥧', text: 'Pie suggested — few categories detected' },
  doughnut: { icon: '🍩', text: 'Doughnut suggested — few categories detected' },
  bar:      { icon: '📊', text: 'Bar suggested — categorical X with numeric Y' },
};

function suggestChartType(rows, xCol, yCol) {
  const xVals = rows.map(r => (r[xCol] || '').trim());
  const yVals = rows.map(r => (r[yCol] || '').trim());

  const xIsNumeric = xVals.every(v => v !== '' && !isNaN(Number(v)));
  const yIsNumeric = yVals.every(v => v !== '' && !isNaN(Number(v)));

  // Both numeric → scatter
  if (xIsNumeric && yIsNumeric) return 'scatter';

  // X looks like dates → line
  const sampleX = xVals.slice(0, 10);
  const xLooksLikeDates = sampleX.filter(v => v !== '').every(v => !isNaN(Date.parse(v)));
  if (xLooksLikeDates && yIsNumeric) return 'line';

  // Few unique X values → pie (≤ 7 categories)
  const uniqueX = new Set(xVals).size;
  if (uniqueX <= 7 && yIsNumeric) return 'pie';

  // Categorical X, numeric Y → bar
  if (yIsNumeric) return 'bar';

  // Fallback
  return 'bar';
}

function runAutoSuggest() {
  const xCol = parseInt(xAxisSel.value);
  const yCol = parseInt(yAxisSel.value);
  if (isNaN(xCol) || isNaN(yCol) || parsedRows.length === 0) return;

  const suggested = suggestChartType(parsedRows, xCol, yCol);
  const info = SUGGEST_REASONS[suggested];

  // Apply suggestion
  chartTypeSel.value = suggested;

  // Show badge
  suggestBadge.innerHTML = `<span class="suggest-icon">${info.icon}</span>${info.text}`;
  suggestBadge.classList.remove('hidden');
}

// Re-run suggest when user changes axis columns
xAxisSel.addEventListener('change', runAutoSuggest);
yAxisSel.addEventListener('change', runAutoSuggest);

// Hide badge when user manually changes chart type
chartTypeSel.addEventListener('change', () => {
  suggestBadge.classList.add('hidden');
});

// ─── Generate Chart ───────────────────────────────────────────────────────────
generateBtn.addEventListener('click', generateChart);

function generateChart() {
  const xCol = parseInt(xAxisSel.value);
  const yCol = parseInt(yAxisSel.value);
  const type = chartTypeSel.value;
  const color = chartColor.value;

  const labels = parsedRows.map(r => r[xCol] || '');
  const rawValues = parsedRows.map(r => parseFloat(r[yCol]));
  const values = rawValues.map(v => isNaN(v) ? 0 : v);

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const ctx = document.getElementById('my-chart').getContext('2d');

  const backgroundColors = generateColors(color, labels.length);
  const borderColors = backgroundColors.map(c => c.replace('0.75', '1'));

  const datasets = type === 'scatter'
    ? [{
        label: `${parsedHeaders[yCol]} vs ${parsedHeaders[xCol]}`,
        data: parsedRows.map(r => ({
          x: parseFloat(r[xCol]) || 0,
          y: parseFloat(r[yCol]) || 0,
        })),
        backgroundColor: hexToRgba(color, 0.75),
        pointRadius: 5,
      }]
    : [{
        label: parsedHeaders[yCol],
        data: values,
        backgroundColor: (type === 'bar' || type === 'pie' || type === 'doughnut')
          ? backgroundColors
          : hexToRgba(color, 0.2),
        borderColor: (type === 'bar' || type === 'pie' || type === 'doughnut')
          ? borderColors
          : hexToRgba(color, 1),
        borderWidth: 2,
        fill: type === 'line',
        tension: 0.35,
        pointBackgroundColor: hexToRgba(color, 1),
      }];

  chartInstance = new Chart(ctx, {
    type,
    data: {
      labels: type === 'scatter' ? undefined : labels,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: { color: '#e0e0f0' },
        },
        tooltip: {
          backgroundColor: '#16213e',
          borderColor: '#0f3460',
          borderWidth: 1,
          titleColor: '#4ecca3',
          bodyColor: '#e0e0f0',
        },
      },
      scales: (type === 'pie' || type === 'doughnut') ? {} : {
        x: {
          ticks: { color: '#7a7a9a', maxRotation: 45 },
          grid: { color: 'rgba(15,52,96,0.5)' },
        },
        y: {
          ticks: { color: '#7a7a9a' },
          grid: { color: 'rgba(15,52,96,0.5)' },
        },
      },
    },
  });

  chartSec.classList.remove('hidden');
  chartSec.scrollIntoView({ behavior: 'smooth' });
}

// ─── Download ─────────────────────────────────────────────────────────────────
downloadBtn.addEventListener('click', () => {
  const canvas = document.getElementById('my-chart');
  const link = document.createElement('a');
  link.download = 'chart.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

// ─── New Chart ────────────────────────────────────────────────────────────────
newChartBtn.addEventListener('click', () => {
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
  chartSec.classList.add('hidden');
  previewSec.classList.add('hidden');
  configSec.classList.add('hidden');
  fileInfo.textContent = '';
  fileInput.value = '';
  parsedHeaders = [];
  parsedRows = [];
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function generateColors(baseHex, count) {
  const colors = [];
  for (let i = 0; i < count; i++) {
    const hue = (parseInt(baseHex.slice(1, 3), 16) + i * 37) % 360;
    colors.push(`hsla(${hue}, 70%, 60%, 0.75)`);
  }
  return colors;
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
