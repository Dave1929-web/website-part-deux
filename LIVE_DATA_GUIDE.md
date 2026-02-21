# Live Market Data Integration Guide

## Overview
The portfolio risk dashboard now supports real-time market data integration through multiple API providers. You can fetch current prices, previous close, and update your holdings automatically.

## Supported API Providers

### 1. **Alpha Vantage** (Default)
- **Website:** https://www.alphavantage.co
- **Free Tier:** 500 API calls per day
- **Best For:** Small portfolios, daily price updates
- **Get API Key:** https://www.alphavantage.co/support/#api-key

### 2. **Finnhub**
- **Website:** https://finnhub.io
- **Free Tier:** 60 API calls per minute
- **Best For:** Real-time intraday updates
- **Get API Key:** https://finnhub.io/register

### 3. **IEX Cloud**
- **Website:** https://iexcloud.io
- **Free Tier:** Available with registration
- **Best For:** US equities with extended data
- **Get API Key:** https://iexcloud.io/console/tokens

### 4. **Twelve Data**
- **Website:** https://twelvedata.com
- **Free Tier:** 800 API calls per day
- **Best For:** Global markets coverage
- **Get API Key:** https://twelvedata.com/apikey

## Setup Instructions

### Step 1: Configure API Settings
1. Click the **⚙️ Settings icon** in the top toolbar
2. Choose your preferred API provider (1-4)
3. Enter your API key when prompted
4. Settings are saved in browser localStorage

### Step 2: Individual Price Lookup
When adding or editing a holding:
1. Enter the stock symbol
2. Click the **↻ arrow button** next to the Symbol field
3. Last Price and Prev Close fields will auto-populate
4. Review the live data before saving

### Step 3: Bulk Price Refresh
To update all holdings at once:
1. Switch to **Selected Account** view mode
2. Click the **🔄 Refresh button** in the Holdings panel header
3. All stock holdings in the current account will update
4. Progress displays in the account label
5. Rate-limited to avoid API quota issues (200ms delay between calls)

## Features

### ✅ What's Covered
- **Real-time price fetching** for stocks
- **Automatic field population** (Last Price, Prev Close)
- **Bulk refresh** for all holdings in an account
- **Multi-provider support** with easy switching
- **Rate limiting** to respect API quotas
- **Error handling** with user-friendly messages

### ⚠️ Limitations
- **Options pricing:** Currently uses underlying stock price (option-specific pricing requires premium APIs)
- **Combined view:** Bulk refresh only works in single account view
- **API quotas:** Free tiers have daily/minute limits
- **Market hours:** Prices reflect last available quote (may be delayed outside market hours)

## Usage Tips

### Best Practices
1. **Start with Alpha Vantage** - Easy setup, generous free tier
2. **Use bulk refresh sparingly** - Each symbol = 1 API call
3. **Refresh during market hours** - Data is freshest when markets are open
4. **Check API quotas** - Monitor your daily usage on provider dashboard
5. **Switch providers** if you hit limits - Configure multiple API keys

### Troubleshooting

**"API key not configured"**
→ Click Settings button and enter your API key

**"No data found for symbol"**
→ Verify the symbol is correct and traded on supported exchanges

**"API rate limit exceeded"**
→ Wait 1 minute (Alpha Vantage) or switch to another provider

**Refresh not working**
→ Make sure you're in "Selected Account" view mode (not Combined)

## API Response Data
Each API call returns:
- **Last Price** - Current trading price
- **Previous Close** - Yesterday's closing price
- **Change** - Dollar change from previous close
- **Change %** - Percentage change
- **High/Low** - Day's trading range
- **Volume** - Trading volume

Only Last Price and Previous Close are currently stored in holdings.

## Future Enhancements
Planned features for future versions:
- Real-time beta calculations from market data
- Options-specific pricing (put/call premiums)
- Sector classification auto-lookup
- Historical price charting
- Dividend yield integration
- Scheduled auto-refresh (every 15min during market hours)

## Privacy & Security
- **API keys stored locally** in browser localStorage
- **No data sent to external servers** (except API provider)
- **All requests client-side** via fetch API
- **Clear API key:** Open browser console and run `localStorage.removeItem('marketDataApiKey')`

---

**Need Help?** Check your browser console (F12) for detailed error messages when API calls fail.
