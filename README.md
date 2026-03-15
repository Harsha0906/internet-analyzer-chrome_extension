# Internet Usage Analyzer

A minimal Chrome extension that tracks how much time you spend on websites and presents the data in a clean, modern interface.

The extension runs locally in the browser and records time spent on active tabs. Usage statistics are displayed through a lightweight popup dashboard showing total screen time, site-wise breakdown, and visual usage bars.

## Features

* Tracks time spent on websites in real time
* Displays total usage and per-site statistics
* Minimal, clean popup dashboard UI
* Local data storage using Chrome Storage API
* One-click data reset
* No external servers or tracking (privacy friendly)

## Tech Stack

* JavaScript
* Chrome Extension API (Manifest V3)
* HTML + CSS
* Chrome Storage API

## How It Works

1. The extension detects the currently active tab.
2. Time spent on each domain is calculated.
3. Usage data is stored locally in the browser.
4. The popup dashboard reads this data and visualizes it.

## Installation

1. Clone this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer Mode**
4. Click **Load unpacked**
5. Select the `extension` folder

## Future Improvements

* Daily usage analytics
* Weekly reports
* Productivity scoring
* Category-based tracking
* Advanced dashboard visualizations

## License

MIT License
