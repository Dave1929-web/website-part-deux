const DB_NAME = 'pulserisk-db';
const DB_VERSION = 1;
const LEGACY_KEY = 'pulserisk-user-data-v1';

// Market Data API Configuration
const MARKET_DATA_CONFIG = {
  provider: localStorage.getItem('marketDataProvider') || 'alphavantage',
  apiKey: localStorage.getItem('marketDataApiKey') || '',
  endpoints: {
    alphavantage: 'https://www.alphavantage.co/query',
    finnhub: 'https://finnhub.io/api/v1/quote',
    iex: 'https://cloud.iexapis.com/stable/stock',
    twelvedata: 'https://api.twelvedata.com/quote'
  }
};

// Market Data API Service
async function fetchMarketData(symbol) {
  if (!MARKET_DATA_CONFIG.apiKey) {
    throw new Error('API key not configured. Please add your API key in settings.');
  }

  const cleanSymbol = symbol.trim().toUpperCase();
  
  try {
    switch (MARKET_DATA_CONFIG.provider) {
      case 'alphavantage':
        return await fetchAlphaVantage(cleanSymbol);
      case 'finnhub':
        return await fetchFinnhub(cleanSymbol);
      case 'iex':
        return await fetchIEX(cleanSymbol);
      case 'twelvedata':
        return await fetchTwelveData(cleanSymbol);
      default:
        throw new Error(`Unknown provider: ${MARKET_DATA_CONFIG.provider}`);
    }
  } catch (error) {
    console.error('Market data fetch error:', error);
    throw error;
  }
}

async function fetchAlphaVantage(symbol) {
  const url = `${MARKET_DATA_CONFIG.endpoints.alphavantage}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${MARKET_DATA_CONFIG.apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  
  if (data['Error Message'] || data['Note']) {
    throw new Error(data['Error Message'] || 'API rate limit exceeded. Please wait a minute.');
  }
  
  const quote = data['Global Quote'];
  if (!quote || !quote['05. price']) {
    throw new Error(`No data found for symbol: ${symbol}`);
  }
  
  return {
    symbol,
    last: parseFloat(quote['05. price']),
    prevClose: parseFloat(quote['08. previous close']),
    change: parseFloat(quote['09. change']),
    changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
    high: parseFloat(quote['03. high']),
    low: parseFloat(quote['04. low']),
    volume: parseFloat(quote['06. volume'])
  };
}

async function fetchFinnhub(symbol) {
  const url = `${MARKET_DATA_CONFIG.endpoints.finnhub}?symbol=${symbol}&token=${MARKET_DATA_CONFIG.apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.error || data.c === 0) {
    throw new Error(`No data found for symbol: ${symbol}`);
  }
  
  return {
    symbol,
    last: data.c,
    prevClose: data.pc,
    change: data.d,
    changePercent: data.dp,
    high: data.h,
    low: data.l,
    open: data.o
  };
}

async function fetchIEX(symbol) {
  const url = `${MARKET_DATA_CONFIG.endpoints.iex}/${symbol}/quote?token=${MARKET_DATA_CONFIG.apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  
  if (!data.latestPrice) {
    throw new Error(`No data found for symbol: ${symbol}`);
  }
  
  return {
    symbol,
    last: data.latestPrice,
    prevClose: data.previousClose,
    change: data.change,
    changePercent: data.changePercent * 100,
    high: data.high,
    low: data.low,
    volume: data.latestVolume
  };
}

async function fetchTwelveData(symbol) {
  const url = `${MARKET_DATA_CONFIG.endpoints.twelvedata}?symbol=${symbol}&apikey=${MARKET_DATA_CONFIG.apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.status === 'error' || !data.close) {
    throw new Error(data.message || `No data found for symbol: ${symbol}`);
  }
  
  return {
    symbol,
    last: parseFloat(data.close),
    prevClose: parseFloat(data.previous_close),
    change: parseFloat(data.change),
    changePercent: parseFloat(data.percent_change),
    high: parseFloat(data.high),
    low: parseFloat(data.low),
    volume: parseFloat(data.volume)
  };
}

document.addEventListener('DOMContentLoaded', () => {
  void bootstrap();
});

async function bootstrap() {
  const el = {
    lookbackSelect: document.getElementById('lookbackSelect'),
    benchmarkSelect: document.getElementById('benchmarkSelect'),
    viewModeSelect: document.getElementById('viewModeSelect'),
    accountSelect: document.getElementById('accountSelect'),
    scopeLabel: document.getElementById('scopeLabel'),
    addAccountForm: document.getElementById('addAccountForm'),
    newAccountName: document.getElementById('newAccountName'),
    accountStatus: document.getElementById('accountStatus'),
    holdingAssetType: document.getElementById('holdingAssetType'),
    activityAssetType: document.getElementById('activityAssetType'),
    optionFields: document.getElementById('optionFields'),
    activityOptionFields: document.getElementById('activityOptionFields'),
    holdingForm: document.getElementById('holdingForm'),
    activityForm: document.getElementById('activityForm'),
    saveHoldingBtn: document.getElementById('saveHoldingBtn'),
    saveActivityBtn: document.getElementById('saveActivityBtn'),
    cancelHoldingEditBtn: document.getElementById('cancelHoldingEditBtn'),
    cancelActivityEditBtn: document.getElementById('cancelActivityEditBtn'),
    holdingStatus: document.getElementById('holdingStatus'),
    activityStatus: document.getElementById('activityStatus'),
    holdingAccountSelect: document.getElementById('holdingAccountSelect'),
    activityAccountSelect: document.getElementById('activityAccountSelect'),
    schwabCsvInput: document.getElementById('schwabCsvInput'),
    importSchwabBtn: document.getElementById('importSchwabBtn'),
    importStatus: document.getElementById('importStatus'),
    activityDate: document.getElementById('activityDate'),
    lookupPriceBtn: document.getElementById('lookupPriceBtn'),
    refreshPricesBtn: document.getElementById('refreshPricesBtn'),
    apiSettingsBtn: document.getElementById('apiSettingsBtn'),
    clearAccountBtn: document.getElementById('clearAccountBtn')
  };

  const db = await openDatabase();
  await seedDatabase(db);
  await migrateLegacyLocalStorage(db);

  const state = {
    db,
    accounts: await getAccounts(db),
    selectedAccountId: null,
    viewMode: 'SINGLE',
    taxLots: [],
    benchmarkSeries: {
      SPY: createReturnSeries(120, 0.00035, 0.009, 44),
      QQQ: createReturnSeries(120, 0.00045, 0.011, 63)
    },
    portfolioReturns: createPortfolioReturns(createReturnSeries(120, 0.00035, 0.009, 44), 0.00018, 0.004, 101),
    equityCurve: toCurve(createPortfolioReturns(createReturnSeries(120, 0.00035, 0.009, 44), 0.00018, 0.004, 101), 138000),
    riskFreeRate: 0.04,
    editingHoldingId: null,
    editingActivityId: null,
    scopeData: { holdings: [], transactions: [] }
  };

  state.selectedAccountId = state.accounts[0]?.id ?? null;
  syncAccountSelectors(el, state.accounts, state.selectedAccountId);
  el.viewModeSelect.value = 'SINGLE';

  const today = new Date().toISOString().slice(0, 10);
  el.activityDate.value = today;

  function setStatus(element, text, isError = false) {
    element.textContent = text;
    element.classList.toggle('down', isError);
    element.classList.toggle('up', !isError);
  }

  function toggleOptionInputs() {
    el.optionFields.classList.toggle('hidden', el.holdingAssetType.value !== 'OPTION');
    el.activityOptionFields.classList.toggle('hidden', el.activityAssetType.value !== 'OPTION');
  }

  function calculateActivityAmount() {
    const type = document.getElementById('activityType').value;
    const assetType = document.getElementById('activityAssetType').value;
    const qty = toNumber(document.getElementById('activityQty').value);
    const price = toNumber(document.getElementById('activityPrice').value);
    const fees = toNumber(document.getElementById('activityFees').value);
    const multiplier = assetType === 'OPTION' ? Math.max(toNumber(document.getElementById('activityMultiplier').value), 1) : 1;
    
    let amount = 0;
    const gross = qty * price * multiplier;
    
    if(type === 'BUY') {
      amount = -(gross + fees);
    } else if(type === 'SELL') {
      amount = gross - fees;
    } else if(type === 'DIVIDEND' || type === 'DEPOSIT') {
      amount = Math.abs(gross || 0);
    } else if(type === 'FEE' || type === 'WITHDRAWAL') {
      amount = -Math.abs(gross || fees || 0);
    }
    
    // Update the amount field with calculated value
    document.getElementById('activityAmount').value = amount ? amount.toFixed(2) : '';
  }

  function resetHoldingForm() {
    state.editingHoldingId = null;
    el.holdingForm.reset();
    el.holdingAccountSelect.value = String(state.selectedAccountId);
    document.getElementById('holdingMultiplier').value = '100';
    el.saveHoldingBtn.textContent = 'Save Holding';
    el.cancelHoldingEditBtn.classList.add('hidden');
    toggleOptionInputs();
  }

  function resetActivityForm() {
    state.editingActivityId = null;
    el.activityForm.reset();
    el.activityAccountSelect.value = String(state.selectedAccountId);
    el.activityDate.value = today;
    document.getElementById('activityFees').value = '0';
    document.getElementById('activityMultiplier').value = '100';
    el.saveActivityBtn.textContent = 'Add Activity';
    el.cancelActivityEditBtn.classList.add('hidden');
    toggleOptionInputs();
  }

  async function refreshDashboard() {
    if(!state.accounts.length) return;

    const scopeData = await loadScopeData(state);
    state.scopeData = scopeData;
    const model = {
      holdings: scopeData.holdings,
      transactions: scopeData.transactions,
      taxLots: state.taxLots,
      benchmarkSeries: state.benchmarkSeries,
      portfolioReturns: state.portfolioReturns,
      equityCurve: state.equityCurve,
      cash: scopeData.transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0),
      riskFreeRate: state.riskFreeRate
    };

    const view = buildViewState(model, Number(el.lookbackSelect.value), el.benchmarkSelect.value);
    renderKpis(view);
    renderRiskGrid(view);
    renderHoldings(view, state.viewMode === 'SINGLE');
    renderContributors(view);
    renderActivity(view, state.viewMode === 'SINGLE');
    renderTaxLots(view);
    renderConcentration(view);
    renderChart(view);
    document.getElementById('asOfLabel').textContent = `As of ${view.asOfLabel}`;

    if(state.viewMode === 'COMBINED') {
      el.scopeLabel.textContent = `Viewing combined data across ${state.accounts.length} accounts.`;
    } else {
      const selected = state.accounts.find((account) => account.id === state.selectedAccountId);
      el.scopeLabel.textContent = `Viewing account: ${selected?.name || 'N/A'}`;
    }
  }

  el.addAccountForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = el.newAccountName.value.trim();
    if(!name) {
      setStatus(el.accountStatus, 'Account name is required.', true);
      return;
    }

    await idbAdd(db, 'accounts', { name, createdAt: new Date().toISOString() });
    state.accounts = await getAccounts(db);
    const last = state.accounts[state.accounts.length - 1];
    state.selectedAccountId = last.id;
    syncAccountSelectors(el, state.accounts, state.selectedAccountId);
    setStatus(el.accountStatus, `Added account: ${name}`);
    el.newAccountName.value = '';
    await refreshDashboard();
  });

  el.accountSelect.addEventListener('change', async () => {
    state.selectedAccountId = Number(el.accountSelect.value);
    el.holdingAccountSelect.value = String(state.selectedAccountId);
    el.activityAccountSelect.value = String(state.selectedAccountId);
    await refreshDashboard();
  });

  el.viewModeSelect.addEventListener('change', async () => {
    state.viewMode = el.viewModeSelect.value;
    await refreshDashboard();
  });

  el.holdingAssetType.addEventListener('change', toggleOptionInputs);
  el.activityAssetType.addEventListener('change', toggleOptionInputs);
  el.lookbackSelect.addEventListener('change', refreshDashboard);
  el.benchmarkSelect.addEventListener('change', refreshDashboard);
  window.addEventListener('resize', refreshDashboard);

  el.holdingForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const accountId = Number(el.holdingAccountSelect.value);
    const assetType = el.holdingAssetType.value;
    const symbol = document.getElementById('holdingSymbol').value.trim().toUpperCase();
    if(!symbol) {
      setStatus(el.holdingStatus, 'Symbol is required.', true);
      return;
    }

    const entry = {
      accountId,
      symbol,
      assetType,
      sector: document.getElementById('holdingSector').value.trim() || 'Other',
      qty: toNumber(document.getElementById('holdingQty').value),
      avgCost: toNumber(document.getElementById('holdingAvgCost').value),
      last: toNumber(document.getElementById('holdingLast').value),
      prevClose: toNumber(document.getElementById('holdingPrevClose').value),
      beta: toNumber(document.getElementById('holdingBeta').value),
      multiplier: assetType === 'OPTION' ? Math.max(toNumber(document.getElementById('holdingMultiplier').value), 1) : 1,
      updatedAt: new Date().toISOString()
    };

    if(entry.qty <= 0 || entry.avgCost < 0 || entry.last < 0 || entry.prevClose < 0) {
      setStatus(el.holdingStatus, 'Quantity and prices must be valid positive values.', true);
      return;
    }

    if(assetType === 'OPTION') {
      entry.underlying = document.getElementById('holdingUnderlying').value.trim().toUpperCase();
      entry.optionType = document.getElementById('holdingOptionType').value;
      entry.strike = toNumber(document.getElementById('holdingStrike').value);
      entry.expiry = document.getElementById('holdingExpiry').value || '';
      if(!entry.underlying || !entry.expiry || entry.strike <= 0) {
        setStatus(el.holdingStatus, 'Underlying, strike, and expiry are required for options.', true);
        return;
      }
    }

    if(state.editingHoldingId) {
      await idbPut(db, 'holdings', { ...entry, id: state.editingHoldingId });
      setStatus(el.holdingStatus, `${symbol} updated.`);
    } else {
      await upsertHolding(db, entry);
      setStatus(el.holdingStatus, `${symbol} saved.`);
    }
    resetHoldingForm();
    await refreshDashboard();
  });

  el.activityForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const accountId = Number(el.activityAccountSelect.value);
    const type = document.getElementById('activityType').value;
    const assetType = document.getElementById('activityAssetType').value;
    const symbol = document.getElementById('activitySymbol').value.trim().toUpperCase() || '-';
    const qty = toNumber(document.getElementById('activityQty').value);
    const price = toNumber(document.getElementById('activityPrice').value);
    const fees = toNumber(document.getElementById('activityFees').value);
    const multiplier = assetType === 'OPTION' ? Math.max(toNumber(document.getElementById('activityMultiplier').value), 1) : 1;
    let amount = toNumber(document.getElementById('activityAmount').value);

    if(!amount) {
      const gross = qty * price * multiplier;
      if(type === 'BUY') amount = -(gross + fees);
      else if(type === 'SELL') amount = gross - fees;
      else if(type === 'DIVIDEND' || type === 'DEPOSIT') amount = Math.abs(gross || amount);
      else if(type === 'FEE' || type === 'WITHDRAWAL') amount = -Math.abs(gross || fees || amount);
    }

    const tradeDate = document.getElementById('activityDate').value;
    if(!tradeDate) {
      setStatus(el.activityStatus, 'Trade date is required.', true);
      return;
    }

    const activity = {
      accountId,
      date: tradeDate,
      type,
      assetType,
      symbol,
      qty,
      price,
      fees,
      multiplier,
      amount,
      createdAt: new Date().toISOString()
    };

    if(assetType === 'OPTION') {
      activity.underlying = document.getElementById('activityUnderlying').value.trim().toUpperCase();
      activity.optionType = document.getElementById('activityOptionType').value;
      activity.strike = toNumber(document.getElementById('activityStrike').value);
      activity.expiry = document.getElementById('activityExpiry').value || '';
      if(!activity.underlying || !activity.expiry || activity.strike <= 0) {
        setStatus(el.activityStatus, 'Underlying, strike, and expiry are required for option activity.', true);
        return;
      }
    }

    if(state.editingActivityId) {
      await idbPut(db, 'transactions', { ...activity, id: state.editingActivityId });
      setStatus(el.activityStatus, 'Activity updated.');
    } else {
      await idbAdd(db, 'transactions', activity);
      // Auto-sync holdings for BUY/SELL transactions
      await syncHoldingFromTransaction(db, activity);
      setStatus(el.activityStatus, 'Activity added.');
    }
    resetActivityForm();
    await refreshDashboard();
  });

  el.importSchwabBtn.addEventListener('click', async () => {
    const file = el.schwabCsvInput.files?.[0];
    if(!file) {
      setStatus(el.importStatus, 'Select a Schwab CSV file first.', true);
      return;
    }

    const accountId = Number(el.activityAccountSelect.value);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const parsed = parseSchwabActivities(rows).map((activity) => ({ ...activity, accountId, createdAt: new Date().toISOString() }));
      if(!parsed.length) {
        setStatus(el.importStatus, 'No importable rows found in this file.', true);
        return;
      }

      for(const activity of parsed) {
        await idbAdd(db, 'transactions', activity);
        // Auto-sync holdings for BUY/SELL transactions
        await syncHoldingFromTransaction(db, activity);
      }

      setStatus(el.importStatus, `Imported ${parsed.length} Schwab activities.`);
      await refreshDashboard();
    } catch (error) {
      setStatus(el.importStatus, `Import failed: ${error.message}`, true);
    }
  });

  el.cancelHoldingEditBtn.addEventListener('click', () => {
    resetHoldingForm();
    setStatus(el.holdingStatus, 'Holding edit canceled.');
  });

  el.cancelActivityEditBtn.addEventListener('click', () => {
    resetActivityForm();
    setStatus(el.activityStatus, 'Activity edit canceled.');
  });

  // Auto-calculate activity amount when inputs change
  const activityCalcInputs = [
    document.getElementById('activityType'),
    document.getElementById('activityAssetType'),
    document.getElementById('activityQty'),
    document.getElementById('activityPrice'),
    document.getElementById('activityFees'),
    document.getElementById('activityMultiplier')
  ];
  
  activityCalcInputs.forEach(input => {
    input.addEventListener('input', calculateActivityAmount);
    input.addEventListener('change', calculateActivityAmount);
  });

  el.lookupPriceBtn.addEventListener('click', async () => {
    const symbolInput = document.getElementById('holdingSymbol');
    const symbol = symbolInput.value.trim().toUpperCase();
    
    if (!symbol) {
      setStatus(el.holdingStatus, 'Enter a symbol first.', true);
      return;
    }
    
    // Extract base symbol for options (e.g., AAPL240621C00180000 -> AAPL)
    const baseSymbol = symbol.match(/^[A-Z]+/)?.[0] || symbol;
    
    el.lookupPriceBtn.disabled = true;
    setStatus(el.holdingStatus, `Fetching live data for ${baseSymbol}...`);
    
    try {
      const data = await fetchMarketData(baseSymbol);
      
      document.getElementById('holdingLast').value = data.last.toFixed(2);
      document.getElementById('holdingPrevClose').value = data.prevClose.toFixed(2);
      
      setStatus(el.holdingStatus, `✓ Loaded live data: $${data.last.toFixed(2)} (${data.changePercent >= 0 ? '+' : ''}${data.changePercent.toFixed(2)}%)`);
    } catch (error) {
      setStatus(el.holdingStatus, `Error: ${error.message}`, true);
    } finally {
      el.lookupPriceBtn.disabled = false;
    }
  });

  el.refreshPricesBtn.addEventListener('click', async () => {
    if (state.viewMode !== 'SINGLE') {
      alert('Price refresh is only available in Selected Account view. Switch to a single account to refresh prices.');
      return;
    }

    const holdings = state.scopeData.holdings.filter(h => h.assetType === 'STOCK');
    if (!holdings.length) {
      alert('No stock holdings found to refresh.');
      return;
    }

    if (!MARKET_DATA_CONFIG.apiKey) {
      const apiKey = prompt('Enter your market data API key:\n\nSupported providers:\n- Alpha Vantage (alphavantage.co) - Free tier: 500 calls/day\n- Finnhub (finnhub.io) - Free tier: 60 calls/min\n- IEX Cloud (iexcloud.io) - Free tier available\n- Twelve Data (twelvedata.com) - Free tier: 800 calls/day\n\nCurrent provider: ' + MARKET_DATA_CONFIG.provider);
      if (!apiKey) return;
      localStorage.setItem('marketDataApiKey', apiKey.trim());
      MARKET_DATA_CONFIG.apiKey = apiKey.trim();
    }

    el.refreshPricesBtn.disabled = true;
    const symbols = [...new Set(holdings.map(h => h.symbol))];
    let updated = 0;
    let failed = 0;

    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      document.getElementById('scopeLabel').textContent = `Refreshing prices... ${i + 1}/${symbols.length} (${symbol})`;
      
      try {
        const data = await fetchMarketData(symbol);
        
        // Update all holdings with this symbol
        const toUpdate = holdings.filter(h => h.symbol === symbol);
        for (const holding of toUpdate) {
          await idbPut(db, 'holdings', {
            ...holding,
            last: data.last,
            prevClose: data.prevClose,
            updatedAt: new Date().toISOString()
          });
        }
        updated += toUpdate.length;
        
        // Rate limit: wait 200ms between calls to avoid hitting API limits
        if (i < symbols.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`Failed to fetch ${symbol}:`, error);
        failed++;
      }
    }

    el.refreshPricesBtn.disabled = false;
    await refreshDashboard();
    
    const msg = `Price refresh complete: ${updated} holdings updated${failed ? `, ${failed} failed` : ''}.`;
    alert(msg);
  });

  el.apiSettingsBtn.addEventListener('click', () => {
    const currentProvider = MARKET_DATA_CONFIG.provider;
    const currentKey = MARKET_DATA_CONFIG.apiKey || '(not set)';
    
    const providerChoice = prompt(
      `Market Data API Configuration\n\n` +
      `Current Provider: ${currentProvider}\n` +
      `Current API Key: ${currentKey.substring(0, 8)}${currentKey.length > 8 ? '...' : ''}\n\n` +
      `Choose provider:\n` +
      `1 - Alpha Vantage (free 500 calls/day)\n` +
      `2 - Finnhub (free 60 calls/min)\n` +
      `3 - IEX Cloud (free tier available)\n` +
      `4 - Twelve Data (free 800 calls/day)\n\n` +
      `Enter number (1-4):`,
      currentProvider === 'alphavantage' ? '1' : 
      currentProvider === 'finnhub' ? '2' : 
      currentProvider === 'iex' ? '3' : '4'
    );
    
    if (!providerChoice) return;
    
    const providerMap = {
      '1': 'alphavantage',
      '2': 'finnhub',
      '3': 'iex',
      '4': 'twelvedata'
    };
    
    const newProvider = providerMap[providerChoice.trim()];
    if (!newProvider) {
      alert('Invalid choice. Please enter 1, 2, 3, or 4.');
      return;
    }
    
    const newKey = prompt(
      `Enter API key for ${newProvider}:\n\n` +
      `Get your free key at:\n` +
      (newProvider === 'alphavantage' ? '→ https://www.alphavantage.co/support/#api-key' :
       newProvider === 'finnhub' ? '→ https://finnhub.io/register' :
       newProvider === 'iex' ? '→ https://iexcloud.io/console/tokens' :
       '→ https://twelvedata.com/apikey') +
      `\n\nLeave blank to keep current key.`,
      MARKET_DATA_CONFIG.apiKey
    );
    
    if (newKey !== null && newKey.trim()) {
      localStorage.setItem('marketDataApiKey', newKey.trim());
      MARKET_DATA_CONFIG.apiKey = newKey.trim();
    }
    
    localStorage.setItem('marketDataProvider', newProvider);
    MARKET_DATA_CONFIG.provider = newProvider;
    
    alert(`Settings saved!\n\nProvider: ${newProvider}\nAPI Key: ${MARKET_DATA_CONFIG.apiKey.substring(0, 8)}...`);
  });

  el.clearAccountBtn.addEventListener('click', async () => {
    if (state.viewMode !== 'SINGLE' || !state.selectedAccountId) {
      alert('Please select a single account to clear.');
      return;
    }

    const account = state.accounts.find(acc => acc.id === state.selectedAccountId);
    if (!account) return;

    const accountName = account.name;
    const holdings = state.scopeData.holdings.length;
    const transactions = state.scopeData.transactions.length;

    const firstConfirm = confirm(
      `⚠️ WARNING: Clear All Data for "${accountName}"?\n\n` +
      `This will permanently delete:\n` +
      `• ${holdings} holdings\n` +
      `• ${transactions} transactions\n\n` +
      `This action CANNOT be undone.\n\n` +
      `Click OK to proceed to final confirmation.`
    );

    if (!firstConfirm) return;

    const finalConfirm = prompt(
      `FINAL CONFIRMATION\n\n` +
      `Type the account name exactly to confirm deletion:\n" ${accountName} "\n\n` +
      `Type account name below:`,
      ''
    );

    if (finalConfirm !== accountName) {
      alert('Account name did not match. Deletion canceled.');
      return;
    }

    // Delete all holdings for this account
    const holdingsDeleted = [];
    for (const holding of state.scopeData.holdings) {
      await idbDelete(db, 'holdings', holding.id);
      holdingsDeleted.push(holding.symbol);
    }

    // Delete all transactions for this account
    for (const tx of state.scopeData.transactions) {
      await idbDelete(db, 'transactions', tx.id);
    }

    // Reset any forms that might be editing deleted data
    if (state.editingHoldingId) resetHoldingForm();
    if (state.editingActivityId) resetActivityForm();

    setStatus(el.accountStatus, `Account "${accountName}" cleared: ${holdings} holdings + ${transactions} transactions deleted.`);
    await refreshDashboard();
  });

  document.getElementById('holdingsBody').addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-role]');
    if(!button) return;
    if(state.viewMode !== 'SINGLE') {
      setStatus(el.holdingStatus, 'Switch to Selected Account view to edit or delete.', true);
      return;
    }

    const id = Number(button.dataset.id);
    const role = button.dataset.role;
    const row = state.scopeData.holdings.find((holding) => holding.id === id);
    if(!row) return;

    if(role === 'delete') {
      await idbDelete(db, 'holdings', id);
      if(state.editingHoldingId === id) resetHoldingForm();
      setStatus(el.holdingStatus, `${row.symbol} deleted.`);
      await refreshDashboard();
      return;
    }

    state.editingHoldingId = id;
    el.holdingAccountSelect.value = String(row.accountId || state.selectedAccountId);
    document.getElementById('holdingSymbol').value = row.symbol || '';
    el.holdingAssetType.value = row.assetType || 'STOCK';
    document.getElementById('holdingSector').value = row.sector || '';
    document.getElementById('holdingQty').value = row.qty ?? '';
    document.getElementById('holdingAvgCost').value = row.avgCost ?? '';
    document.getElementById('holdingLast').value = row.last ?? '';
    document.getElementById('holdingPrevClose').value = row.prevClose ?? '';
    document.getElementById('holdingBeta').value = row.beta ?? '';
    document.getElementById('holdingMultiplier').value = row.multiplier ?? 1;
    document.getElementById('holdingUnderlying').value = row.underlying || '';
    document.getElementById('holdingOptionType').value = row.optionType || 'CALL';
    document.getElementById('holdingStrike').value = row.strike ?? '';
    document.getElementById('holdingExpiry').value = row.expiry || '';
    toggleOptionInputs();
    el.saveHoldingBtn.textContent = 'Update Holding';
    el.cancelHoldingEditBtn.classList.remove('hidden');
    setStatus(el.holdingStatus, `Editing ${row.symbol}`);
  });

  document.getElementById('activityBody').addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-role]');
    if(!button) return;
    if(state.viewMode !== 'SINGLE') {
      setStatus(el.activityStatus, 'Switch to Selected Account view to edit or delete.', true);
      return;
    }

    const id = Number(button.dataset.id);
    const role = button.dataset.role;
    const row = state.scopeData.transactions.find((tx) => tx.id === id);
    if(!row) return;

    if(role === 'delete') {
      await idbDelete(db, 'transactions', id);
      if(state.editingActivityId === id) resetActivityForm();
      setStatus(el.activityStatus, 'Activity deleted.');
      await refreshDashboard();
      return;
    }

    state.editingActivityId = id;
    el.activityAccountSelect.value = String(row.accountId || state.selectedAccountId);
    document.getElementById('activityDate').value = row.date || today;
    document.getElementById('activityType').value = row.type || 'BUY';
    el.activityAssetType.value = row.assetType || 'STOCK';
    document.getElementById('activitySymbol').value = row.symbol || '';
    document.getElementById('activityQty').value = row.qty ?? '';
    document.getElementById('activityPrice').value = row.price ?? '';
    document.getElementById('activityFees').value = row.fees ?? 0;
    document.getElementById('activityAmount').value = row.amount ?? '';
    document.getElementById('activityMultiplier').value = row.multiplier ?? 1;
    document.getElementById('activityUnderlying').value = row.underlying || '';
    document.getElementById('activityOptionType').value = row.optionType || 'CALL';
    document.getElementById('activityStrike').value = row.strike ?? '';
    document.getElementById('activityExpiry').value = row.expiry || '';
    toggleOptionInputs();
    el.saveActivityBtn.textContent = 'Update Activity';
    el.cancelActivityEditBtn.classList.remove('hidden');
    setStatus(el.activityStatus, 'Editing activity entry.');
  });

  toggleOptionInputs();
  resetHoldingForm();
  resetActivityForm();
  await refreshDashboard();
}

async function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if(!db.objectStoreNames.contains('accounts')) {
        db.createObjectStore('accounts', { keyPath: 'id', autoIncrement: true });
      }
      if(!db.objectStoreNames.contains('holdings')) {
        const holdings = db.createObjectStore('holdings', { keyPath: 'id', autoIncrement: true });
        holdings.createIndex('accountId', 'accountId', { unique: false });
      }
      if(!db.objectStoreNames.contains('transactions')) {
        const transactions = db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
        transactions.createIndex('accountId', 'accountId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open database'));
  });
}

async function seedDatabase(db) {
  const accounts = await idbGetAll(db, 'accounts');
  if(accounts.length) return;

  const brokerageId = await idbAdd(db, 'accounts', { name: 'Schwab Brokerage', createdAt: new Date().toISOString() });
  await idbAdd(db, 'accounts', { name: 'Schwab IRA', createdAt: new Date().toISOString() });

  for(const holding of defaultHoldings()) {
    await idbAdd(db, 'holdings', { ...holding, accountId: brokerageId, updatedAt: new Date().toISOString() });
  }
  for(const transaction of defaultTransactions()) {
    await idbAdd(db, 'transactions', { ...transaction, accountId: brokerageId, createdAt: new Date().toISOString() });
  }
}

async function migrateLegacyLocalStorage(db) {
  const raw = localStorage.getItem(LEGACY_KEY);
  if(!raw) return;

  try {
    const parsed = JSON.parse(raw);
    const accounts = await getAccounts(db);
    const accountId = accounts[0]?.id;
    if(!accountId) return;

    const holdings = Array.isArray(parsed.holdings) ? parsed.holdings : [];
    const transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];

    for(const holding of holdings) {
      await idbAdd(db, 'holdings', { ...holding, accountId, updatedAt: new Date().toISOString() });
    }
    for(const tx of transactions) {
      await idbAdd(db, 'transactions', { ...tx, accountId, createdAt: new Date().toISOString() });
    }
  } catch {
    return;
  } finally {
    localStorage.removeItem(LEGACY_KEY);
  }
}

async function getAccounts(db) {
  const accounts = await idbGetAll(db, 'accounts');
  return accounts.sort((a, b) => a.name.localeCompare(b.name));
}

function syncAccountSelectors(el, accounts, selectedId) {
  const options = accounts.map((account) => `<option value="${account.id}">${account.name}</option>`).join('');
  el.accountSelect.innerHTML = options;
  el.holdingAccountSelect.innerHTML = options;
  el.activityAccountSelect.innerHTML = options;
  if(selectedId) {
    el.accountSelect.value = String(selectedId);
    el.holdingAccountSelect.value = String(selectedId);
    el.activityAccountSelect.value = String(selectedId);
  }
}

async function upsertHolding(db, entry) {
  const all = await idbGetAll(db, 'holdings');
  const existing = all.find((holding) => holding.accountId === entry.accountId && holding.symbol === entry.symbol && holding.assetType === entry.assetType);
  if(existing) {
    await idbPut(db, 'holdings', { ...existing, ...entry, id: existing.id });
  } else {
    await idbAdd(db, 'holdings', entry);
  }
}

async function syncHoldingFromTransaction(db, transaction) {
  // Only sync for BUY and SELL transactions
  if (transaction.type !== 'BUY' && transaction.type !== 'SELL') {
    return;
  }

  const all = await idbGetAll(db, 'holdings');
  const existing = all.find((h) => 
    h.accountId === transaction.accountId && 
    h.symbol === transaction.symbol && 
    h.assetType === transaction.assetType
  );

  if (transaction.type === 'BUY') {
    if (existing) {
      // Update existing holding: increase qty and recalculate weighted avg cost
      const oldQty = existing.qty || 0;
      const oldAvgCost = existing.avgCost || 0;
      const newQty = oldQty + transaction.qty;
      const newAvgCost = ((oldQty * oldAvgCost) + (transaction.qty * transaction.price)) / newQty;
      
      await idbPut(db, 'holdings', {
        ...existing,
        qty: newQty,
        avgCost: newAvgCost,
        last: transaction.price, // Use transaction price as last known price
        prevClose: existing.last || transaction.price, // Move old last to prevClose
        updatedAt: new Date().toISOString()
      });
    } else {
      // Create new holding from BUY transaction
      const newHolding = {
        accountId: transaction.accountId,
        symbol: transaction.symbol,
        assetType: transaction.assetType,
        sector: 'Unknown', // User can edit later
        qty: transaction.qty,
        avgCost: transaction.price,
        last: transaction.price,
        prevClose: transaction.price,
        beta: 1.0,
        multiplier: transaction.multiplier || 1,
        updatedAt: new Date().toISOString()
      };
      
      // Add option details if applicable
      if (transaction.assetType === 'OPTION' && transaction.underlying) {
        newHolding.underlying = transaction.underlying;
        newHolding.optionType = transaction.optionType;
        newHolding.strike = transaction.strike;
        newHolding.expiry = transaction.expiry;
      }
      
      await idbAdd(db, 'holdings', newHolding);
    }
  } else if (transaction.type === 'SELL') {
    if (existing) {
      const newQty = existing.qty - transaction.qty;
      
      if (newQty <= 0) {
        // Position closed - delete holding
        await idbDelete(db, 'holdings', existing.id);
      } else {
        // Reduce quantity, keep same avg cost
        await idbPut(db, 'holdings', {
          ...existing,
          qty: newQty,
          last: transaction.price,
          prevClose: existing.last || transaction.price,
          updatedAt: new Date().toISOString()
        });
      }
    }
    // If no existing holding for SELL, that's an error condition but we'll just skip it
  }
}

async function loadScopeData(state) {
  const holdingsAll = await idbGetAll(state.db, 'holdings');
  const transactionsAll = await idbGetAll(state.db, 'transactions');
  const accountMap = new Map(state.accounts.map((account) => [account.id, account.name]));

  let holdings = [];
  let transactions = [];

  if(state.viewMode === 'COMBINED') {
    holdings = combineHoldings(holdingsAll);
    transactions = transactionsAll.map((tx) => ({ ...tx, accountName: accountMap.get(tx.accountId) || 'Unknown' }));
  } else {
    holdings = holdingsAll.filter((holding) => holding.accountId === state.selectedAccountId);
    transactions = transactionsAll
      .filter((tx) => tx.accountId === state.selectedAccountId)
      .map((tx) => ({ ...tx, accountName: accountMap.get(tx.accountId) || 'Unknown' }));
  }

  transactions.sort((a, b) => b.date.localeCompare(a.date));
  return { holdings, transactions };
}

function combineHoldings(holdings) {
  const grouped = new Map();
  for(const item of holdings) {
    const key = [item.symbol, item.assetType, item.optionType || '', item.strike || '', item.expiry || ''].join('|');
    const existing = grouped.get(key);
    if(!existing) {
      grouped.set(key, { ...item });
      continue;
    }

    const qtyA = existing.qty || 0;
    const qtyB = item.qty || 0;
    const totalQty = qtyA + qtyB;
    const denom = totalQty || 1;
    existing.avgCost = ((existing.avgCost * qtyA) + (item.avgCost * qtyB)) / denom;
    existing.last = ((existing.last * qtyA) + (item.last * qtyB)) / denom;
    existing.prevClose = ((existing.prevClose * qtyA) + (item.prevClose * qtyB)) / denom;
    existing.beta = ((existing.beta * qtyA) + (item.beta * qtyB)) / denom;
    existing.qty = totalQty;
  }
  return [...grouped.values()];
}

async function idbGetAll(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error(`Failed getAll on ${storeName}`));
  });
}

async function idbAdd(db, storeName, payload) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.add(payload);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error(`Failed add on ${storeName}`));
  });
}

async function idbPut(db, storeName, payload) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(payload);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error(`Failed put on ${storeName}`));
  });
}

async function idbDelete(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error(`Failed delete on ${storeName}`));
  });
}

function defaultHoldings() {
  return [
    { symbol: 'AAPL', assetType: 'STOCK', sector: 'Technology', qty: 120, avgCost: 148.3, last: 198.2, prevClose: 196.5, beta: 1.08, multiplier: 1 },
    { symbol: 'MSFT', assetType: 'STOCK', sector: 'Technology', qty: 88, avgCost: 312.7, last: 417.3, prevClose: 420.1, beta: 0.98, multiplier: 1 },
    { symbol: 'NVDA', assetType: 'STOCK', sector: 'Technology', qty: 54, avgCost: 612.4, last: 842.9, prevClose: 826.2, beta: 1.42, multiplier: 1 },
    { symbol: 'JPM', assetType: 'STOCK', sector: 'Financials', qty: 90, avgCost: 141.2, last: 191.8, prevClose: 190.2, beta: 1.12, multiplier: 1 },
    { symbol: 'XOM', assetType: 'STOCK', sector: 'Energy', qty: 150, avgCost: 105.6, last: 116.4, prevClose: 117.9, beta: 0.86, multiplier: 1 },
    { symbol: 'UNH', assetType: 'STOCK', sector: 'Healthcare', qty: 48, avgCost: 505.9, last: 537.6, prevClose: 533.1, beta: 0.74, multiplier: 1 },
    { symbol: 'AAPL240621C00190000', assetType: 'OPTION', sector: 'Technology', qty: 2, avgCost: 7.6, last: 9.2, prevClose: 8.7, beta: 1.35, multiplier: 100, underlying: 'AAPL', optionType: 'CALL', strike: 190, expiry: '2026-06-21' }
  ];
}

function defaultTransactions() {
  return [
    { date: '2026-02-17', type: 'BUY', assetType: 'STOCK', symbol: 'UNH', qty: 24, price: 537.6, fees: 0, multiplier: 1, amount: -12902.4 },
    { date: '2026-02-16', type: 'DIVIDEND', assetType: 'STOCK', symbol: 'XOM', qty: 0, price: 0, fees: 0, multiplier: 1, amount: 141.75 },
    { date: '2026-02-14', type: 'SELL', assetType: 'STOCK', symbol: 'MSFT', qty: 20, price: 411.1, fees: 0, multiplier: 1, amount: 8222.0 },
    { date: '2026-02-11', type: 'FEE', assetType: 'CASH', symbol: '-', qty: 0, price: 0, fees: 18, multiplier: 1, amount: -18.0 },
    { date: '2026-02-09', type: 'DEPOSIT', assetType: 'CASH', symbol: '-', qty: 0, price: 0, fees: 0, multiplier: 1, amount: 6000.0 },
    { date: '2026-02-06', type: 'DIVIDEND', assetType: 'STOCK', symbol: 'JPM', qty: 0, price: 0, fees: 0, multiplier: 1, amount: 94.5 },
    { date: '2026-02-02', type: 'BUY', assetType: 'OPTION', symbol: 'AAPL240621C00190000', qty: 2, price: 7.6, fees: 1.25, multiplier: 100, underlying: 'AAPL', optionType: 'CALL', strike: 190, expiry: '2026-06-21', amount: -1521.25 },
    { date: '2026-01-23', type: 'WITHDRAWAL', assetType: 'CASH', symbol: '-', qty: 0, price: 0, fees: 0, multiplier: 1, amount: -1000.0 }
  ];
}

function defaultTaxLots() {
  return [
    { lotId: 'L-1007', symbol: 'AAPL', openDate: '2025-03-02', closeDate: '2025-12-14', qty: 45, buyPrice: 171.8, sellPrice: 188.6, buyFees: 3.2, sellFees: 3.5, basisMethod: 'FIFO', washSaleAdj: 0 },
    { lotId: 'L-1013', symbol: 'MSFT', openDate: '2025-04-11', closeDate: '2025-10-07', qty: 20, buyPrice: 389.4, sellPrice: 411.1, buyFees: 2.8, sellFees: 2.9, basisMethod: 'FIFO', washSaleAdj: 0 },
    { lotId: 'L-1019', symbol: 'JPM', openDate: '2025-01-28', closeDate: '2025-09-23', qty: 30, buyPrice: 172.1, sellPrice: 186.4, buyFees: 1.9, sellFees: 1.9, basisMethod: 'Specific ID', washSaleAdj: -12.2 }
  ];
}

function buildViewState(model, lookback, benchmark) {
  const holdings = model.holdings.map((position) => {
    const multiplier = position.multiplier || 1;
    const marketValue = position.qty * position.last * multiplier;
    const costBasis = position.qty * position.avgCost * multiplier;
    const unrealized = marketValue - costBasis;
    const dayPnl = (position.last - position.prevClose) * position.qty * multiplier;
    const movePct = (position.last / position.prevClose) - 1;
    return { ...position, multiplier, marketValue, costBasis, unrealized, dayPnl, movePct };
  });

  const marketValue = holdings.reduce((sum, position) => sum + position.marketValue, 0);
  const dayPnl = holdings.reduce((sum, position) => sum + position.dayPnl, 0);
  const unrealized = holdings.reduce((sum, position) => sum + position.unrealized, 0);

  const realized = model.taxLots.reduce((sum, lot) => {
    const proceeds = (lot.sellPrice * lot.qty) - lot.sellFees;
    const basis = (lot.buyPrice * lot.qty) + lot.buyFees;
    return sum + (proceeds - basis + lot.washSaleAdj);
  }, 0) + deriveRealizedFromActivity(model.transactions, holdings);

  const dividendIncome = model.transactions
    .filter((tx) => tx.type === 'DIVIDEND')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const netDeposits = model.transactions
    .filter((tx) => tx.type === 'DEPOSIT' || tx.type === 'WITHDRAWAL')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const equity = marketValue + model.cash;

  const holdingsWithWeight = holdings.map((position) => ({
    ...position,
    weight: position.marketValue / equity
  }));

  const lookbackReturns = model.portfolioReturns.slice(-lookback);
  const lookbackBenchmarkReturns = model.benchmarkSeries[benchmark].slice(-lookback);

  const volatility = stdDev(lookbackReturns) * Math.sqrt(252);
  const excessDaily = lookbackReturns.map((ret) => ret - (model.riskFreeRate / 252));
  const sharpe = (mean(excessDaily) / (stdDev(excessDaily) || 1e-9)) * Math.sqrt(252);
  const beta = covariance(lookbackReturns, lookbackBenchmarkReturns) / (variance(lookbackBenchmarkReturns) || 1e-9);
  const var95 = -quantile(lookbackReturns, 0.05) * equity;

  const equityCurveLookback = model.equityCurve.slice(-(lookback + 1));
  const maxDrawdown = calculateMaxDrawdown(equityCurveLookback.map((point) => point.value));

  const sectorWeights = {};
  holdingsWithWeight.forEach((position) => {
    sectorWeights[position.sector] = (sectorWeights[position.sector] || 0) + position.weight;
  });

  const topPositionWeight = Math.max(...holdingsWithWeight.map((position) => position.weight));
  const topSectorWeight = Math.max(...Object.values(sectorWeights));
  const hhi = holdingsWithWeight.reduce((sum, position) => sum + (position.weight * position.weight), 0);

  const benchCurve = toCurve(lookbackBenchmarkReturns, equityCurveLookback[0].value);

  return {
    asOfLabel: equityCurveLookback[equityCurveLookback.length - 1].date,
    holdings: holdingsWithWeight,
    lots: model.taxLots,
    transactions: [...model.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8),
    equity,
    marketValue,
    cash: model.cash,
    dayPnl,
    unrealized,
    realized,
    dividendIncome,
    netDeposits,
    volatility,
    sharpe,
    beta,
    var95,
    maxDrawdown,
    topPositionWeight,
    topSectorWeight,
    hhi,
    sectorWeights,
    contributors: [...holdingsWithWeight].sort((a, b) => b.dayPnl - a.dayPnl),
    curve: equityCurveLookback,
    benchmarkCurve: benchCurve,
    benchmark
  };
}

function renderKpis(view) {
  const kpis = [
    { label: 'Net Equity', value: formatCurrency(view.equity) },
    { label: 'Day P/L', value: formatCurrency(view.dayPnl), trendClass: view.dayPnl >= 0 ? 'up' : 'down' },
    { label: 'Unrealized P/L', value: formatCurrency(view.unrealized), trendClass: view.unrealized >= 0 ? 'up' : 'down' },
    { label: 'Realized YTD', value: formatCurrency(view.realized), trendClass: view.realized >= 0 ? 'up' : 'down' },
    { label: 'Dividend Income', value: formatCurrency(view.dividendIncome), trendClass: view.dividendIncome >= 0 ? 'up' : 'down' },
    { label: 'Cash Balance', value: formatCurrency(view.cash) },
    { label: 'Gross Exposure', value: formatCurrency(view.marketValue) },
    { label: 'Net Deposits', value: formatCurrency(view.netDeposits), trendClass: view.netDeposits >= 0 ? 'up' : 'down' }
  ];

  const grid = document.getElementById('kpiGrid');
  grid.innerHTML = kpis.map((kpi) => `
    <div class="kpi">
      <div class="label">${kpi.label}</div>
      <div class="value ${kpi.trendClass || ''}">${kpi.value}</div>
    </div>
  `).join('');
}

function renderRiskGrid(view) {
  const metrics = [
    { label: 'Volatility (Ann.)', value: formatPct(view.volatility) },
    { label: 'Sharpe Ratio', value: view.sharpe.toFixed(2) },
    { label: `Beta vs ${view.benchmark}`, value: view.beta.toFixed(2) },
    { label: 'VaR (95%, 1D)', value: formatCurrency(view.var95) },
    { label: 'Max Drawdown', value: formatPct(view.maxDrawdown), trendClass: 'down' },
    { label: 'Top Position %', value: formatPct(view.topPositionWeight) },
    { label: 'Top Sector %', value: formatPct(view.topSectorWeight) },
    { label: 'Concentration HHI', value: view.hhi.toFixed(3) }
  ];

  document.getElementById('riskGrid').innerHTML = metrics.map((metric) => `
    <div class="metric">
      <div class="label">${metric.label}</div>
      <div class="value ${metric.trendClass || ''}">${metric.value}</div>
    </div>
  `).join('');
}

function renderHoldings(view, isEditable) {
  const body = document.getElementById('holdingsBody');
  body.innerHTML = view.holdings.map((position) => `
    <tr>
      <td>${position.symbol}</td>
      <td>${formatInstrument(position)}</td>
      <td>${position.sector}</td>
      <td>${position.qty}</td>
      <td>${formatCurrency(position.avgCost)}</td>
      <td>${formatCurrency(position.last)}</td>
      <td class="${position.dayPnl >= 0 ? 'up' : 'down'}">${formatCurrency(position.dayPnl)}</td>
      <td class="${position.unrealized >= 0 ? 'up' : 'down'}">${formatCurrency(position.unrealized)}</td>
      <td>${formatPct(position.weight)}</td>
      <td>
        ${isEditable && position.id ? `<div class="row-actions"><button type="button" data-role="edit" data-id="${position.id}">Edit</button><button type="button" data-role="delete" data-id="${position.id}" class="danger">Delete</button></div>` : '-'}
      </td>
    </tr>
  `).join('');
}

function renderContributors(view) {
  const body = document.getElementById('contribBody');
  body.innerHTML = view.contributors.map((position) => `
    <tr>
      <td>${position.symbol}</td>
      <td class="${position.dayPnl >= 0 ? 'up' : 'down'}">${formatCurrency(position.dayPnl)}</td>
      <td class="${position.movePct >= 0 ? 'up' : 'down'}">${formatPct(position.movePct)}</td>
    </tr>
  `).join('');
}

function renderActivity(view, isEditable) {
  const body = document.getElementById('activityBody');
  body.innerHTML = view.transactions.map((tx) => `
    <tr>
      <td>${tx.date}</td>
      <td>${tx.accountName || '-'}</td>
      <td>${tx.type}</td>
      <td>${formatActivitySymbol(tx)}</td>
      <td class="${(tx.amount || 0) >= 0 ? 'up' : 'down'}">${formatCurrency(tx.amount || 0)}</td>
      <td>
        ${isEditable && tx.id ? `<div class="row-actions"><button type="button" data-role="edit" data-id="${tx.id}">Edit</button><button type="button" data-role="delete" data-id="${tx.id}" class="danger">Delete</button></div>` : '-'}
      </td>
    </tr>
  `).join('');
}

function renderTaxLots(view) {
  const body = document.getElementById('lotsBody');
  body.innerHTML = view.lots.map((lot) => {
    const proceeds = (lot.sellPrice * lot.qty) - lot.sellFees;
    const basis = (lot.buyPrice * lot.qty) + lot.buyFees;
    const realized = proceeds - basis + lot.washSaleAdj;

    return `
      <tr>
        <td>${lot.lotId}</td>
        <td>${lot.symbol}</td>
        <td>${lot.openDate}</td>
        <td>${lot.closeDate}</td>
        <td>${lot.qty}</td>
        <td>${lot.basisMethod}</td>
        <td class="${realized >= 0 ? 'up' : 'down'}">${formatCurrency(realized)}</td>
      </tr>
    `;
  }).join('');
}

function renderConcentration(view) {
  const topPositions = [...view.holdings]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map((position) => `<li><span>${position.symbol}</span><span>${formatPct(position.weight)}</span></li>`)
    .join('');

  const topSectors = Object.entries(view.sectorWeights)
    .sort((first, second) => second[1] - first[1])
    .map(([name, weight]) => `<li><span>${name}</span><span>${formatPct(weight)}</span></li>`)
    .join('');

  document.getElementById('topPositions').innerHTML = topPositions;
  document.getElementById('sectorExposure').innerHTML = topSectors;
}

function renderChart(view) {
  const canvas = document.getElementById('equityChart');
  const context = canvas.getContext('2d');
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = 300;

  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);

  context.clearRect(0, 0, width, height);

  const padding = { top: 24, right: 18, bottom: 28, left: 18 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const values = view.curve.map((point) => point.value).concat(view.benchmarkCurve.map((point) => point.value));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const scaleY = (value) => {
    if(maxValue === minValue) return padding.top + (plotHeight / 2);
    return padding.top + ((maxValue - value) / (maxValue - minValue)) * plotHeight;
  };

  context.strokeStyle = '#2b3d5c';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(padding.left, padding.top + plotHeight);
  context.lineTo(width - padding.right, padding.top + plotHeight);
  context.stroke();

  drawSeries(context, view.benchmarkCurve, scaleY, padding, plotWidth, '#7b8fb8', 1.4);
  drawSeries(context, view.curve, scaleY, padding, plotWidth, '#4c8dff', 2.3);

  const last = view.curve[view.curve.length - 1];
  context.fillStyle = '#d1ddf6';
  context.font = '12px Inter, Segoe UI, Arial, sans-serif';
  context.fillText(`Portfolio ${formatCurrency(view.equity)} | Curve ${formatCurrency(last.value)}`, padding.left, 16);
}

function drawSeries(context, points, scaleY, padding, plotWidth, color, width) {
  context.strokeStyle = color;
  context.lineWidth = width;
  context.beginPath();

  points.forEach((point, index) => {
    const x = padding.left + (index / (points.length - 1 || 1)) * plotWidth;
    const y = scaleY(point.value);
    if(index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });

  context.stroke();
}

function createReturnSeries(length, drift, sigma, seed) {
  const rng = createRng(seed);
  const series = [];
  for(let index = 0; index < length; index += 1) {
    const wave = Math.sin(index / 9) * 0.0012;
    series.push(drift + wave + randomNormal(rng) * sigma);
  }
  return series;
}

function createPortfolioReturns(baseSeries, alpha, noise, seed) {
  const rng = createRng(seed);
  return baseSeries.map((base, index) => {
    const regime = (index % 24 < 8) ? -0.0007 : 0;
    return (base * 0.72) + alpha + regime + (randomNormal(rng) * noise);
  });
}

function toCurve(returnSeries, startingValue) {
  const date = new Date('2025-10-22T00:00:00Z');
  let value = startingValue;

  return returnSeries.map((ret) => {
    value *= (1 + ret);
    const point = {
      date: date.toISOString().slice(0, 10),
      value
    };
    date.setDate(date.getDate() + 1);
    return point;
  });
}

function calculateMaxDrawdown(curveValues) {
  let peak = curveValues[0];
  let maxDrawdown = 0;

  curveValues.forEach((value) => {
    peak = Math.max(peak, value);
    const drawdown = (value - peak) / peak;
    maxDrawdown = Math.min(maxDrawdown, drawdown);
  });

  return maxDrawdown;
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function variance(values) {
  const avg = mean(values);
  return values.reduce((sum, value) => sum + ((value - avg) ** 2), 0) / (values.length - 1 || 1);
}

function stdDev(values) {
  return Math.sqrt(variance(values));
}

function covariance(first, second) {
  const firstMean = mean(first);
  const secondMean = mean(second);
  const terms = first.map((value, index) => (value - firstMean) * (second[index] - secondMean));
  return terms.reduce((sum, value) => sum + value, 0) / (first.length - 1 || 1);
}

function quantile(values, percentile) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * percentile;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if(lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(value);
}

function formatPct(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatInstrument(position) {
  if(position.assetType !== 'OPTION') return 'Stock';
  const expiry = position.expiry || 'No Exp';
  return `${position.optionType || ''} ${position.strike || ''} ${expiry}`.trim();
}

function formatActivitySymbol(activity) {
  if(activity.assetType !== 'OPTION') return activity.symbol;
  return `${activity.symbol} (${activity.optionType || ''} ${activity.strike || ''} ${activity.expiry || ''})`.trim();
}

function deriveRealizedFromActivity(transactions, holdings) {
  const bySymbol = new Map(holdings.map((position) => [`${position.symbol}:${position.assetType}`, position]));
  return transactions
    .filter((tx) => tx.type === 'SELL' || tx.type === 'ASSIGNMENT' || tx.type === 'EXPIRY')
    .reduce((sum, tx) => {
      const key = `${tx.symbol}:${tx.assetType || 'STOCK'}`;
      const holding = bySymbol.get(key);
      if(!holding || !tx.qty) return sum;
      const multiplier = tx.multiplier || holding.multiplier || 1;
      const saleProceeds = (tx.qty * (tx.price || 0) * multiplier) - (tx.fees || 0);
      const basis = tx.qty * (holding.avgCost || 0) * multiplier;
      return sum + (saleProceeds - basis);
    }, 0);
}

function persistUserData(model) {
  const payload = {
    holdings: model.holdings,
    transactions: model.transactions
  };
  localStorage.setItem('pulserisk-user-data-v1', JSON.stringify(payload));
}

function loadUserData() {
  try {
    const raw = localStorage.getItem('pulserisk-user-data-v1');
    if(!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function toNumber(value) {
  const num = Number(value);
  if(Number.isNaN(num)) return 0;
  return num;
}

function parseSchwabActivities(rows) {
  if(!rows.length) return [];
  const headers = rows[0].map((cell) => normalizeHeader(cell));
  const indexOf = (aliases) => headers.findIndex((header) => aliases.includes(header));

  const dateIndex = indexOf(['date', 'transactiondate', 'tradedate']);
  const actionIndex = indexOf(['action', 'transaction type', 'type']);
  const symbolIndex = indexOf(['symbol', 'security symbol']);
  const descriptionIndex = indexOf(['description', 'security description']);
  const quantityIndex = indexOf(['quantity', 'qty']);
  const priceIndex = indexOf(['price']);
  const feesIndex = indexOf(['fees&comm', 'fees and comm', 'fees', 'commission']);
  const amountIndex = indexOf(['amount', 'net amount', 'value']);

  const activities = [];

  for(let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if(!row || !row.length) continue;

    const rawAction = getCell(row, actionIndex).trim();
    const rawDate = getCell(row, dateIndex).trim();
    if(!rawAction || !rawDate) continue;

    const description = getCell(row, descriptionIndex).trim();
    const rawSymbol = getCell(row, symbolIndex).trim();
    const symbol = (rawSymbol || deriveSymbolFromDescription(description) || '-').toUpperCase();
    const action = mapSchwabAction(rawAction, description);
    const assetType = detectAssetType(symbol, description);

    const qty = parseNumeric(getCell(row, quantityIndex));
    const price = parseNumeric(getCell(row, priceIndex));
    const fees = Math.abs(parseNumeric(getCell(row, feesIndex)));
    let amount = parseNumeric(getCell(row, amountIndex));
    const multiplier = assetType === 'OPTION' ? 100 : 1;

    if(!amount) {
      const gross = qty * price * multiplier;
      if(action === 'BUY') amount = -(gross + fees);
      else if(action === 'SELL') amount = gross - fees;
      else if(action === 'FEE') amount = -Math.abs(fees || gross);
      else amount = 0;
    }

    const optionMeta = extractOptionMeta(symbol, description);

    const activity = {
      date: normalizeDate(rawDate),
      type: action,
      assetType,
      symbol,
      qty,
      price,
      fees,
      multiplier,
      amount
    };

    if(assetType === 'OPTION') {
      activity.underlying = optionMeta.underlying || '';
      activity.optionType = optionMeta.optionType || '';
      activity.strike = optionMeta.strike || 0;
      activity.expiry = optionMeta.expiry || '';
    }

    activities.push(activity);
  }

  return activities;
}

function parseCsv(input) {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  for(let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if(char === '"') {
      if(inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if(char === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if((char === '\n' || char === '\r') && !inQuotes) {
      if(char === '\r' && next === '\n') index += 1;
      row.push(current);
      if(row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  if(current.length || row.length) {
    row.push(current);
    if(row.some((cell) => cell.trim() !== '')) rows.push(row);
  }

  return rows;
}

function normalizeHeader(value) {
  return value.toLowerCase().replace(/\s+/g, '').replace(/[^a-z&]/g, '');
}

function getCell(row, index) {
  if(index < 0 || index >= row.length) return '';
  return row[index] || '';
}

function parseNumeric(value) {
  if(!value) return 0;
  const cleaned = value
    .replace(/\$/g, '')
    .replace(/,/g, '')
    .replace(/\s/g, '');

  if(!cleaned) return 0;

  const paren = cleaned.startsWith('(') && cleaned.endsWith(')');
  const normalized = paren ? `-${cleaned.slice(1, -1)}` : cleaned;
  const num = Number(normalized);
  return Number.isNaN(num) ? 0 : num;
}

function normalizeDate(raw) {
  const trimmed = raw.trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const parts = trimmed.split(/[\/\-]/);
  if(parts.length === 3) {
    const [first, second, third] = parts;
    if(first.length === 4) {
      return `${first}-${second.padStart(2, '0')}-${third.padStart(2, '0')}`;
    }
    const year = third.length === 2 ? `20${third}` : third;
    return `${year}-${first.padStart(2, '0')}-${second.padStart(2, '0')}`;
  }

  return trimmed;
}

function mapSchwabAction(rawAction, description) {
  const value = `${rawAction} ${description}`.toUpperCase();
  if(value.includes('BUY')) return 'BUY';
  if(value.includes('SELL')) return 'SELL';
  if(value.includes('DIVIDEND') || value.includes('QUAL DIV')) return 'DIVIDEND';
  if(value.includes('DEPOSIT')) return 'DEPOSIT';
  if(value.includes('WITHDRAWAL')) return 'WITHDRAWAL';
  if(value.includes('ASSIGN')) return 'ASSIGNMENT';
  if(value.includes('EXPIR')) return 'EXPIRY';
  if(value.includes('FEE') || value.includes('COMM')) return 'FEE';
  return 'FEE';
}

function detectAssetType(symbol, description) {
  const s = `${symbol} ${description}`.toUpperCase();
  if(s.includes('CALL') || s.includes('PUT') || /\d{6}[CP]\d{8}/.test(s)) return 'OPTION';
  if(symbol === '-' || !symbol) return 'CASH';
  return 'STOCK';
}

function deriveSymbolFromDescription(description) {
  if(!description) return '';
  const upper = description.toUpperCase();
  const firstWord = upper.split(/\s+/)[0] || '';
  if(/^[A-Z\.]{1,8}$/.test(firstWord)) return firstWord;
  return '';
}

function extractOptionMeta(symbol, description) {
  const source = `${symbol} ${description}`.toUpperCase();
  const match = source.match(/([A-Z]{1,6})\s*(\d{2})[\/\-](\d{2})[\/\-](\d{2,4})\s*(\d+(?:\.\d+)?)\s*([CP]|CALL|PUT)/);
  if(match) {
    const underlying = match[1];
    const mm = match[2].padStart(2, '0');
    const dd = match[3].padStart(2, '0');
    let yyyy = match[4];
    if(yyyy.length === 2) yyyy = `20${yyyy}`;
    const strike = Number(match[5]);
    const flag = match[6];
    return {
      underlying,
      expiry: `${yyyy}-${mm}-${dd}`,
      strike: Number.isNaN(strike) ? 0 : strike,
      optionType: flag.startsWith('C') ? 'CALL' : 'PUT'
    };
  }

  const occ = source.match(/([A-Z]{1,6})(\d{6})([CP])(\d{8})/);
  if(occ) {
    const yymmdd = occ[2];
    const expiry = `20${yymmdd.slice(0, 2)}-${yymmdd.slice(2, 4)}-${yymmdd.slice(4, 6)}`;
    const strike = Number(occ[4]) / 1000;
    return {
      underlying: occ[1],
      expiry,
      strike: Number.isNaN(strike) ? 0 : strike,
      optionType: occ[3] === 'C' ? 'CALL' : 'PUT'
    };
  }

  return { underlying: '', expiry: '', strike: 0, optionType: '' };
}

function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0xFFFFFFFF;
  };
}

function randomNormal(rng) {
  const first = Math.max(rng(), 1e-9);
  const second = rng();
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
}
