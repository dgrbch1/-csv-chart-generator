# CSV Chart Generator

A lightweight browser app that turns CSV files into charts in a few clicks.

## What This Project Does

- Accepts CSV upload via drag-and-drop or file picker.
- Parses headers and rows directly in the browser (no backend required).
- Shows a preview table and row/column count.
- Lets the user choose chart type, X axis, Y axis, and color.
- Renders charts with Chart.js.
- Supports export as PNG.

## Why It Feels AI-Like

This app does not call a machine learning model, but it has an AI-like user experience because it makes a data-driven recommendation automatically.

- It inspects the selected columns and infers data shape.
- It suggests chart type using heuristic rules:
	- Numeric X + numeric Y -> scatter
	- Date-like X + numeric Y -> line
	- Few categories + numeric Y -> pie
	- Otherwise numeric Y -> bar
- It explains the recommendation with a visible badge, so the suggestion is transparent.

That pattern (analyzing inputs, selecting a best-fit action, and explaining the choice) is why users often describe this style of UX as "AI-like", even when it is rule-based intelligence.

## Tech Stack

- HTML, CSS, JavaScript
- Chart.js (CDN)

## Run Locally

1. Open `index.html` in a browser.
2. Upload a CSV file.
3. Configure or accept the suggested chart.
4. Generate and download the chart.