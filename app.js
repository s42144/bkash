// Configuration
const TELEGRAM_BOT_TOKEN = '8237387201:AAFI98932KS3M5uJDLaTbu27FCFOJ40wwxI';
const DEPOSIT_ADDRESS = 'UQBWOgFgB4B8qBCo8CNjDUNAtvUSosw4v7v9gkt0GVOaNLSz';

// Markets Data
const markets = [
    { symbol: 'BTC/USDT', name: 'Bitcoin', icon: '₿', price: 67234.50, change: 2.34 },
    { symbol: 'ETH/USDT', name: 'Ethereum', icon: 'Ξ', price: 3456.78, change: 1.89 },
    { symbol: 'BNB/USDT', name: 'Binance Coin', icon: 'BNB', price: 567.89, change: -0.45 },
    { symbol: 'SOL/USDT', name: 'Solana', icon: 'SOL', price: 145.67, change: 3.21 },
    { symbol: 'XRP/USDT', name: 'Ripple', icon: 'XRP', price: 0.5234, change: -1.23 },
    { symbol: 'ADA/USDT', name: 'Cardano', icon: 'ADA', price: 0.4567, change: 0.89 },
    { symbol: 'DOGE/USDT', name: 'Dogecoin', icon: 'DOGE', price: 0.0789, change: 5.67 },
    { symbol: 'DOT/USDT', name: 'Polkadot', icon: 'DOT', price: 6.78, change: -2.34 },
    { symbol: 'MATIC/USDT', name: 'Polygon', icon: 'MATIC', price: 0.8901, change: 1.45 },
    { symbol: 'AVAX/USDT', name: 'Avalanche', icon: 'AVAX', price: 34.56, change: 2.78 }
];

// User Data
let userData = {
    id: null,
    username: 'Guest',
    firstName: 'Guest',
    lastName: 'User',
    photoUrl: 'https://via.placeholder.com/80',
    balance: 100.00,
    memo: null,
    tradeHistory: [],
    walletHistory: [],
    activeTrades: [],
    stats: {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        todayPL: 0,
        winRate: 0
    }
};

// Trading State
let selectedMarket = markets[0];
let selectedTradeType = 'higher';
let selectedDuration = 60;
let selectedDurationLabel = '1m';
let chartTimeframe = '5m';
let chartType = 'candle';

// Chart Variables
let chart = null;
let candleSeries = null;
let lineSeries = null;
let areaSeries = null;
let volumeSeries = null;
let chartData = [];
let priceUpdateInterval = null;
let activeIndicators = {};

// Initialize App
function initApp() {
    loadUserData();
    initializeTelegram();
    initChart();
    renderMarkets();
    updateUI();
    startPriceUpdates();
    renderHistory();
    renderLeaderboard();
    updateTradeButton();
}

// Telegram Integration
function initializeTelegram() {
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        
        const user = tg.initDataUnsafe.user;
        if (user) {
            userData.id = user.id;
            userData.username = user.username || 'User';
            userData.firstName = user.first_name || 'User';
            userData.lastName = user.last_name || '';
            userData.memo = `USER${user.id}${Date.now().toString().slice(-6)}`;
            
            getUserPhoto(user.id);
            updateUI();
            saveUserData();
        }
    } else {
        userData.id = Math.floor(Math.random() * 1000000);
        userData.memo = `USER${userData.id}${Date.now().toString().slice(-6)}`;
        updateUI();
        saveUserData();
    }
}

async function getUserPhoto(userId) {
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUserProfilePhotos?user_id=${userId}&limit=1`);
        const data = await response.json();
        
        if (data.ok && data.result.photos.length > 0) {
            const fileId = data.result.photos[0][0].file_id;
            const fileResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
            const fileData = await fileResponse.json();
            
            if (fileData.ok) {
                userData.photoUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`;
                updateUI();
                saveUserData();
            }
        }
    } catch (error) {
        console.log('Could not fetch user photo:', error);
    }
}

// Local Storage
function saveUserData() {
    localStorage.setItem('protradeUserData', JSON.stringify(userData));
}

function loadUserData() {
    const saved = localStorage.getItem('protradeUserData');
    if (saved) {
        const loaded = JSON.parse(saved);
        userData = { ...userData, ...loaded };
    }
}

// UI Updates
function updateUI() {
    document.getElementById('headerBalance').textContent = userData.balance.toFixed(2);
    document.getElementById('tradeBalance').textContent = userData.balance.toFixed(2);
    document.getElementById('profileAvatar').src = userData.photoUrl;
    document.getElementById('profileName').textContent = userData.firstName + ' ' + userData.lastName;
    document.getElementById('profileUsername').textContent = '@' + userData.username;
    document.getElementById('depositMemo').textContent = userData.memo;
    
    // Update stats
    document.getElementById('quickPL').textContent = (userData.stats.todayPL >= 0 ? '+' : '') + userData.stats.todayPL.toFixed(2);
    document.getElementById('quickPL').className = 'stat-value ' + (userData.stats.todayPL >= 0 ? 'success' : 'danger');
    document.getElementById('quickWinRate').textContent = userData.stats.winRate.toFixed(0) + '%';
    document.getElementById('quickTrades').textContent = userData.stats.totalTrades;
    
    // Profile stats
    document.getElementById('profileTrades').textContent = userData.stats.totalTrades;
    document.getElementById('profileWins').textContent = userData.stats.wins;
    document.getElementById('profileWinRate').textContent = userData.stats.winRate.toFixed(0) + '%';
    
    // Wallet
    document.getElementById('walletBalance').textContent = userData.balance.toFixed(2) + ' TON';
    document.getElementById('walletBalanceUSD').textContent = '≈ $' + (userData.balance * 2.5).toFixed(2);
    
    // Referral
    document.getElementById('referralLink').textContent = `https://protrade.app/ref/USER${userData.id}`;
    
    updatePotentialProfit();
}

// Navigation
function showSection(section) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    document.getElementById(section + 'Section').classList.add('active');
    
    const navItems = document.querySelectorAll('.nav-item');
    const sectionMap = {
        'trading': 0,
        'history': 1,
        'wallet': 2,
        'leaderboard': 3,
        'profile': 4
    };
    
    if (sectionMap[section] !== undefined) {
        navItems[sectionMap[section]].classList.add('active');
    }
}

function showDeposit() {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById('depositSection').classList.add('active');
}

function showWithdraw() {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById('withdrawSection').classList.add('active');
}

function showWalletHistory() {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById('walletHistorySection').classList.add('active');
    renderWalletHistory();
}

function showReferral() {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById('referralSection').classList.add('active');
}

function showAchievements() {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById('achievementsSection').classList.add('active');
}

function showSettings() {
    showNotification('Settings coming soon!', 'info');
}

function showSupport() {
    showNotification('Support: support@protrade.app', 'info');
}

// Chart Initialization
function initChart() {
    const container = document.getElementById('tradingViewChart');
    
    chart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: container.clientHeight,
        layout: {
            background: { color: '#0a0e27' },
            textColor: '#8b93b0',
        },
        grid: {
            vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
            horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
        },
        rightPriceScale: {
            borderColor: 'rgba(255, 255, 255, 0.1)',
        },
        timeScale: {
            borderColor: 'rgba(255, 255, 255, 0.1)',
            timeVisible: true,
            secondsVisible: false,
        },
    });

    // Create candlestick series
    candleSeries = chart.addCandlestickSeries({
        upColor: '#00ff88',
        downColor: '#ff4757',
        borderUpColor: '#00ff88',
        borderDownColor: '#ff4757',
        wickUpColor: '#00ff88',
        wickDownColor: '#ff4757',
    });

    // Generate initial data
    generateChartData();
    candleSeries.setData(chartData);

    // Handle resize
    window.addEventListener('resize', () => {
        chart.applyOptions({
            width: container.clientWidth,
            height: container.clientHeight,
        });
    });

    // Subscribe to crosshair move
    chart.subscribeCrosshairMove((param) => {
        if (param.time) {
            const data = param.seriesData.get(candleSeries);
            if (data) {
                updateOHLC(data);
            }
        }
    });
}

function generateChartData() {
    chartData = [];
    let basePrice = selectedMarket.price;
    let time = Math.floor(Date.now() / 1000) - (100 * 300); // 100 candles back, 5 min each

    for (let i = 0; i < 100; i++) {
        const open = basePrice;
        const volatility = basePrice * 0.002;
        const close = open + (Math.random() - 0.5) * volatility * 2;
        const high = Math.max(open, close) + Math.random() * volatility;
        const low = Math.min(open, close) - Math.random() * volatility;

        chartData.push({
            time: time,
            open: open,
            high: high,
            low: low,
            close: close,
        });

        basePrice = close;
        time += 300; // 5 minutes
    }
}

function updateOHLC(data) {
    const ohlcInfo = document.getElementById('ohlcInfo');
    ohlcInfo.innerHTML = `
        <span class="ohlc-item">O: <strong>${data.open.toFixed(2)}</strong></span>
        <span class="ohlc-item">H: <strong>${data.high.toFixed(2)}</strong></span>
        <span class="ohlc-item">L: <strong>${data.low.toFixed(2)}</strong></span>
        <span class="ohlc-item">C: <strong>${data.close.toFixed(2)}</strong></span>
    `;
}

function changeChartType(type) {
    chartType = type;
    
    // Update button states
    document.querySelectorAll('.chart-type-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.type === type) {
            btn.classList.add('active');
        }
    });

    // Remove existing series
    if (candleSeries) chart.removeSeries(candleSeries);
    if (lineSeries) chart.removeSeries(lineSeries);
    if (areaSeries) chart.removeSeries(areaSeries);

    // Add new series based on type
    if (type === 'candle') {
        candleSeries = chart.addCandlestickSeries({
            upColor: '#00ff88',
            downColor: '#ff4757',
            borderUpColor: '#00ff88',
            borderDownColor: '#ff4757',
            wickUpColor: '#00ff88',
            wickDownColor: '#ff4757',
        });
        candleSeries.setData(chartData);
    } else if (type === 'line') {
        lineSeries = chart.addLineSeries({
            color: '#667eea',
            lineWidth: 2,
        });
        const lineData = chartData.map(d => ({ time: d.time, value: d.close }));
        lineSeries.setData(lineData);
    } else if (type === 'area') {
        areaSeries = chart.addAreaSeries({
            topColor: 'rgba(102, 126, 234, 0.4)',
            bottomColor: 'rgba(102, 126, 234, 0.0)',
            lineColor: '#667eea',
            lineWidth: 2,
        });
        const areaData = chartData.map(d => ({ time: d.time, value: d.close }));
        areaSeries.setData(areaData);
    }
}

function changeTimeframe(tf) {
    chartTimeframe = tf;
    
    // Update button states
    document.querySelectorAll('.tf-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === tf) {
            btn.classList.add('active');
        }
    });

    // Regenerate chart data with new timeframe
    generateChartData();
    if (candleSeries) candleSeries.setData(chartData);
    if (lineSeries) {
        const lineData = chartData.map(d => ({ time: d.time, value: d.close }));
        lineSeries.setData(lineData);
    }
    if (areaSeries) {
        const areaData = chartData.map(d => ({ time: d.time, value: d.close }));
        areaSeries.setData(areaData);
    }
}

function toggleIndicatorsPanel() {
    const panel = document.getElementById('indicatorsPanel');
    panel.classList.toggle('active');
}

function toggleIndicator(indicator) {
    const checkbox = document.getElementById(`ind_${indicator}`);
    
    if (checkbox.checked) {
        // Add indicator
        activeIndicators[indicator] = true;
        showNotification(`${indicator.toUpperCase()} indicator added`, 'success');
    } else {
        // Remove indicator
        delete activeIndicators[indicator];
        showNotification(`${indicator.toUpperCase()} indicator removed`, 'info');
    }
}

function toggleFullscreen() {
    const chartPanel = document.querySelector('.chart-panel');
    
    if (!document.fullscreenElement) {
        chartPanel.requestFullscreen().catch(err => {
            console.log('Fullscreen error:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

// Price Updates
function startPriceUpdates() {
    stopPriceUpdates();
    priceUpdateInterval = setInterval(() => {
        // Update selected market
        selectedMarket.price += (Math.random() - 0.5) * selectedMarket.price * 0.001;
        selectedMarket.change = (Math.random() - 0.5) * 5;
        updateMarketPrice();
        
        // Update all markets
        markets.forEach(market => {
            market.price += (Math.random() - 0.5) * market.price * 0.001;
            market.change = (Math.random() - 0.5) * 5;
        });
        
        // Update chart
        updateChart();
        
        // Update active trades
        updateActiveTrades();
    }, 1000);
}

function stopPriceUpdates() {
    if (priceUpdateInterval) {
        clearInterval(priceUpdateInterval);
        priceUpdateInterval = null;
    }
}

function updateChart() {
    if (!chartData.length) return;

    const lastCandle = chartData[chartData.length - 1];
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Check if we need a new candle (every 5 minutes)
    if (currentTime - lastCandle.time >= 300) {
        const newPrice = selectedMarket.price;
        const volatility = newPrice * 0.002;
        
        chartData.push({
            time: currentTime,
            open: lastCandle.close,
            high: newPrice + Math.random() * volatility,
            low: newPrice - Math.random() * volatility,
            close: newPrice,
        });

        // Keep only last 100 candles
        if (chartData.length > 100) {
            chartData.shift();
        }

        if (candleSeries) candleSeries.setData(chartData);
        if (lineSeries) {
            const lineData = chartData.map(d => ({ time: d.time, value: d.close }));
            lineSeries.setData(lineData);
        }
        if (areaSeries) {
            const areaData = chartData.map(d => ({ time: d.time, value: d.close }));
            areaSeries.setData(areaData);
        }
    } else {
        // Update current candle
        const newPrice = selectedMarket.price;
        lastCandle.close = newPrice;
        lastCandle.high = Math.max(lastCandle.high, newPrice);
        lastCandle.low = Math.min(lastCandle.low, newPrice);

        if (candleSeries) candleSeries.update(lastCandle);
        if (lineSeries) lineSeries.update({ time: lastCandle.time, value: lastCandle.close });
        if (areaSeries) areaSeries.update({ time: lastCandle.time, value: lastCandle.close });
    }
}

function updateMarketPrice() {
    document.getElementById('headerPrice').textContent = '$' + selectedMarket.price.toFixed(2);
    
    const changeClass = selectedMarket.change >= 0 ? 'positive' : 'negative';
    const changeSymbol = selectedMarket.change >= 0 ? '+' : '';
    const changeBadge = document.getElementById('headerChange');
    changeBadge.textContent = changeSymbol + selectedMarket.change.toFixed(2) + '%';
    changeBadge.className = 'price-change-badge ' + changeClass;
}

// Market Modal
function openMarketModal() {
    document.getElementById('marketModal').classList.add('active');
}

function closeMarketModal() {
    document.getElementById('marketModal').classList.remove('active');
}

function renderMarkets() {
    const marketList = document.getElementById('marketList');
    marketList.innerHTML = markets.map(market => {
        const changeClass = market.change >= 0 ? 'positive' : 'negative';
        const changeSymbol = market.change >= 0 ? '+' : '';
        
        return `
            <div class="market-item" onclick="selectMarket('${market.symbol}')">
                <div class="market-item-info">
                    <div class="market-icon">${market.icon}</div>
                    <div class="market-item-details">
                        <div class="market-item-name">${market.name}</div>
                        <div class="market-item-symbol">${market.symbol}</div>
                    </div>
                </div>
                <div class="market-item-price">
                    <div class="market-item-value">$${market.price.toLocaleString()}</div>
                    <div class="market-item-change ${changeClass}">${changeSymbol}${market.change.toFixed(2)}%</div>
                </div>
            </div>
        `;
    }).join('');
}

function filterMarkets() {
    const search = document.getElementById('marketSearch').value.toLowerCase();
    const filteredMarkets = markets.filter(m => 
        m.name.toLowerCase().includes(search) || 
        m.symbol.toLowerCase().includes(search)
    );
    
    const marketList = document.getElementById('marketList');
    marketList.innerHTML = filteredMarkets.map(market => {
        const changeClass = market.change >= 0 ? 'positive' : 'negative';
        const changeSymbol = market.change >= 0 ? '+' : '';
        
        return `
            <div class="market-item" onclick="selectMarket('${market.symbol}')">
                <div class="market-item-info">
                    <div class="market-icon">${market.icon}</div>
                    <div class="market-item-details">
                        <div class="market-item-name">${market.name}</div>
                        <div class="market-item-symbol">${market.symbol}</div>
                    </div>
                </div>
                <div class="market-item-price">
                    <div class="market-item-value">$${market.price.toLocaleString()}</div>
                    <div class="market-item-change ${changeClass}">${changeSymbol}${market.change.toFixed(2)}%</div>
                </div>
            </div>
        `;
    }).join('');
}

function selectMarket(symbol) {
    selectedMarket = markets.find(m => m.symbol === symbol);
    document.getElementById('miniMarketIcon').textContent = selectedMarket.icon;
    document.getElementById('miniMarketName').textContent = selectedMarket.symbol;
    updateMarketPrice();
    generateChartData();
    if (candleSeries) candleSeries.setData(chartData);
    closeMarketModal();
}

// Trade Type Selection
function selectTradeType(type) {
    selectedTradeType = type;
    
    document.querySelectorAll('.trade-type-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.type === type) {
            btn.classList.add('active');
        }
    });
    
    updateTradeButton();
}

// Amount Controls
function adjustAmount(delta) {
    const input = document.getElementById('tradeAmountInput');
    let value = parseFloat(input.value) || 0;
    value = Math.max(1, value + delta);
    input.value = value;
    updatePotentialProfit();
    updateTradeButton();
}

function setAmount(amount) {
    document.getElementById('tradeAmountInput').value = amount;
    updatePotentialProfit();
    updateTradeButton();
}

function setAmountPercent(percent) {
    const amount = (userData.balance * percent / 100).toFixed(2);
    document.getElementById('tradeAmountInput').value = amount;
    updatePotentialProfit();
    updateTradeButton();
}

// Duration Controls
function showDurationCategory(category) {
    document.querySelectorAll('.duration-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.textContent.toLowerCase() === category) {
            tab.classList.add('active');
        }
    });
    
    document.querySelectorAll('.duration-category').forEach(cat => {
        cat.classList.remove('active');
        if (cat.dataset.category === category) {
            cat.classList.add('active');
        }
    });
}

function selectDuration(seconds, label) {
    selectedDuration = seconds;
    selectedDurationLabel = label;
    
    document.querySelectorAll('.duration-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    document.getElementById('selectedDuration').textContent = label;
}

// Potential Profit
function updatePotentialProfit() {
    const amount = parseFloat(document.getElementById('tradeAmountInput').value) || 0;
    const profit = amount * 0.95;
    document.getElementById('potentialProfit').textContent = '+' + profit.toFixed(2) + ' TON';
}

// Trade Button
function updateTradeButton() {
    const btn = document.getElementById('tradeExecuteBtn');
    const amount = parseFloat(document.getElementById('tradeAmountInput').value) || 0;
    
    btn.dataset.type = selectedTradeType;
    
    const icon = selectedTradeType === 'higher' ? 'fa-arrow-up' : 'fa-arrow-down';
    const text = selectedTradeType === 'higher' ? 'BUY HIGHER' : 'BUY LOWER';
    
    btn.innerHTML = `
        <div class="trade-btn-content">
            <i class="fas ${icon}"></i>
            <span>${text}</span>
        </div>
        <div class="trade-btn-amount">${amount.toFixed(2)} TON</div>
    `;
}

// Execute Trade
function executeTrade() {
    const amount = parseFloat(document.getElementById('tradeAmountInput').value);
    
    if (!amount || amount <= 0) {
        showNotification('Please enter a valid amount', 'error');
        return;
    }
    
    if (amount > userData.balance) {
        showNotification('Insufficient balance', 'error');
        return;
    }
    
    // Show confirmation modal
    document.getElementById('confirmMarket').textContent = selectedMarket.symbol;
    document.getElementById('confirmDirection').textContent = selectedTradeType.toUpperCase();
    document.getElementById('confirmAmount').textContent = amount.toFixed(2) + ' TON';
    document.getElementById('confirmDuration').textContent = selectedDurationLabel;
    document.getElementById('confirmPrice').textContent = '$' + selectedMarket.price.toFixed(2);
    document.getElementById('confirmProfit').textContent = '+' + (amount * 0.95).toFixed(2) + ' TON';
    
    document.getElementById('tradeConfirmModal').classList.add('active');
}

function closeTradeConfirm() {
    document.getElementById('tradeConfirmModal').classList.remove('active');
}

function confirmTrade() {
    const amount = parseFloat(document.getElementById('tradeAmountInput').value);
    
    // Deduct amount
    userData.balance -= amount;
    updateUI();
    
    // Create trade
    const trade = {
        id: Date.now(),
        market: selectedMarket.symbol,
        type: selectedTradeType,
        amount: amount,
        entryPrice: selectedMarket.price,
        duration: selectedDuration,
        durationLabel: selectedDurationLabel,
        startTime: Date.now(),
        endTime: Date.now() + (selectedDuration * 1000)
    };
    
    userData.activeTrades.push(trade);
    
    closeTradeConfirm();
    showNotification(`Trade opened: ${selectedTradeType.toUpperCase()} ${amount.toFixed(2)} TON`, 'success');
    saveUserData();
    
    renderActiveTrades();
}

// Active Trades
function renderActiveTrades() {
    const container = document.getElementById('activeTradesDisplay');
    
    if (userData.activeTrades.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = userData.activeTrades.map(trade => {
        const remaining = Math.max(0, trade.endTime - Date.now());
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        
        const currentPrice = selectedMarket.price;
        let pl = 0;
        if (trade.type === 'higher') {
            pl = ((currentPrice - trade.entryPrice) / trade.entryPrice) * trade.amount;
        } else {
            pl = ((trade.entryPrice - currentPrice) / trade.entryPrice) * trade.amount;
        }
        
        const plClass = pl >= 0 ? 'positive' : 'negative';
        const typeClass = trade.type === 'higher' ? 'higher' : 'lower';
        
        return `
            <div class="active-trade-card">
                <div class="active-trade-info">
                    <div class="active-trade-type ${typeClass}">${trade.type.toUpperCase()} ${trade.market}</div>
                    <div class="active-trade-details">${trade.amount.toFixed(2)} TON @ $${trade.entryPrice.toFixed(2)}</div>
                </div>
                <div class="active-trade-timer">
                    <div class="trade-countdown-mini">${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}</div>
                    <div class="trade-pl-mini ${plClass}">${pl >= 0 ? '+' : ''}${pl.toFixed(2)}</div>
                </div>
            </div>
        `;
    }).join('');
}

function updateActiveTrades() {
    const now = Date.now();
    const completedTrades = [];
    
    userData.activeTrades = userData.activeTrades.filter(trade => {
        if (now >= trade.endTime) {
            completedTrades.push(trade);
            return false;
        }
        return true;
    });
    
    // Process completed trades
    completedTrades.forEach(trade => {
        completeTrade(trade);
    });
    
    renderActiveTrades();
}

function completeTrade(trade) {
    const exitPrice = selectedMarket.price;
    
    // Determine win/loss
    let isWin = false;
    if (trade.type === 'higher') {
        isWin = exitPrice > trade.entryPrice;
    } else {
        isWin = exitPrice < trade.entryPrice;
    }
    
    // Calculate payout
    const payout = isWin ? trade.amount * 1.95 : 0;
    const profit = payout - trade.amount;
    userData.balance += payout;
    
    // Update stats
    userData.stats.totalTrades++;
    if (isWin) {
        userData.stats.wins++;
    } else {
        userData.stats.losses++;
    }
    userData.stats.todayPL += profit;
    userData.stats.winRate = (userData.stats.wins / userData.stats.totalTrades) * 100;
    
    // Add to history
    userData.tradeHistory.unshift({
        id: trade.id,
        market: trade.market,
        type: trade.type,
        amount: trade.amount,
        entryPrice: trade.entryPrice,
        exitPrice: exitPrice,
        duration: trade.durationLabel,
        result: isWin ? 'win' : 'loss',
        payout: payout,
        profit: profit,
        timestamp: new Date().toISOString()
    });
    
    updateUI();
    saveUserData();
    renderHistory();
    
    showNotification(
        isWin ? `🎉 Trade Won! +${profit.toFixed(2)} TON` : `😔 Trade Lost! -${trade.amount.toFixed(2)} TON`,
        isWin ? 'success' : 'error'
    );
}

// History
function renderHistory() {
    const list = document.getElementById('historyList');
    
    if (userData.tradeHistory.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-chart-line"></i></div>
                <div class="empty-title">No Trade History</div>
                <div class="empty-subtitle">Your completed trades will appear here</div>
            </div>
        `;
        return;
    }
    
    list.innerHTML = userData.tradeHistory.map(trade => {
        const date = new Date(trade.timestamp);
        
        return `
            <div class="history-item">
                <div class="history-icon ${trade.result}">
                    <i class="fas fa-${trade.result === 'win' ? 'check' : 'times'}"></i>
                </div>
                <div class="history-details">
                    <div class="history-title">${trade.market} - ${trade.type.toUpperCase()}</div>
                    <div class="history-subtitle">
                        Entry: $${trade.entryPrice.toFixed(2)} | Exit: $${trade.exitPrice.toFixed(2)} | ${trade.duration}
                    </div>
                    <div class="history-meta">
                        <span><i class="far fa-clock"></i> ${date.toLocaleTimeString()}</span>
                        <span><i class="far fa-calendar"></i> ${date.toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="history-amount">
                    <div class="history-value ${trade.result}">${trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}</div>
                    <div class="history-profit">${trade.amount.toFixed(2)} TON</div>
                </div>
            </div>
        `;
    }).join('');
}

function filterHistory(filter) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Filter logic would go here
    renderHistory();
}

// Wallet History
function renderWalletHistory() {
    const list = document.getElementById('walletHistoryList');
    
    if (userData.walletHistory.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-wallet"></i></div>
                <div class="empty-title">No Transactions</div>
                <div class="empty-subtitle">Your deposits and withdrawals will appear here</div>
            </div>
        `;
        return;
    }
    
    list.innerHTML = userData.walletHistory.map(tx => {
        const date = new Date(tx.timestamp);
        
        return `
            <div class="history-item">
                <div class="history-icon ${tx.type === 'deposit' ? 'win' : 'loss'}">
                    <i class="fas fa-arrow-${tx.type === 'deposit' ? 'down' : 'up'}"></i>
                </div>
                <div class="history-details">
                    <div class="history-title">${tx.type.toUpperCase()}</div>
                    <div class="history-subtitle">Status: ${tx.status}</div>
                    <div class="history-meta">
                        <span><i class="far fa-clock"></i> ${date.toLocaleTimeString()}</span>
                        <span><i class="far fa-calendar"></i> ${date.toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="history-amount">
                    <div class="history-value ${tx.type === 'deposit' ? 'win' : 'loss'}">
                        ${tx.type === 'deposit' ? '+' : '-'}${tx.amount.toFixed(2)}
                    </div>
                    <div class="history-profit">TON</div>
                </div>
            </div>
        `;
    }).join('');
}

// Withdraw
function processWithdraw(event) {
    event.preventDefault();
    
    const address = document.getElementById('withdrawAddress').value;
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    
    if (amount < 5) {
        showNotification('Minimum withdrawal is 5 TON', 'error');
        return;
    }
    
    if (amount > userData.balance) {
        showNotification('Insufficient balance', 'error');
        return;
    }
    
    userData.balance -= amount;
    
    const transaction = {
        id: Date.now(),
        type: 'withdraw',
        amount: amount,
        address: address,
        status: 'Processing',
        timestamp: new Date().toISOString()
    };
    
    userData.walletHistory.unshift(transaction);
    
    updateUI();
    saveUserData();
    
    showNotification('Withdrawal request submitted', 'success');
    
    document.getElementById('withdrawAddress').value = '';
    document.getElementById('withdrawAmount').value = '';
    
    setTimeout(() => {
        transaction.status = 'Completed';
        saveUserData();
        renderWalletHistory();
    }, 5000);
}

// Leaderboard
function renderLeaderboard() {
    const leaderboardData = [
        { rank: 1, name: 'CryptoKing', trades: 1250, profit: 5420.50 },
        { rank: 2, name: 'TradeQueen', trades: 980, profit: 4890.25 },
        { rank: 3, name: 'BullRunner', trades: 875, profit: 4320.75 },
        { rank: 4, name: 'MoonShot', trades: 750, profit: 3850.00 },
        { rank: 5, name: 'DiamondHands', trades: 680, profit: 3420.50 }
    ];
    
    const list = document.getElementById('leaderboardList');
    list.innerHTML = leaderboardData.map(user => {
        let rankClass = '';
        if (user.rank === 1) rankClass = 'gold';
        else if (user.rank === 2) rankClass = 'silver';
        else if (user.rank === 3) rankClass = 'bronze';
        
        return `
            <div class="leaderboard-item">
                <div class="leaderboard-rank ${rankClass}">${user.rank}</div>
                <div class="leaderboard-info">
                    <div class="leaderboard-name">${user.name}</div>
                    <div class="leaderboard-trades">${user.trades} trades</div>
                </div>
                <div class="leaderboard-profit">+${user.profit.toFixed(2)}</div>
            </div>
        `;
    }).join('');
}

// Utilities
function copyText(elementId) {
    const text = document.getElementById(elementId).textContent;
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied to clipboard!', 'success');
    });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    else if (type === 'error') icon = 'fa-exclamation-circle';
    
    notification.innerHTML = `
        <div class="notification-icon"><i class="fas ${icon}"></i></div>
        <div>${message}</div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize
window.addEventListener('load', initApp);

// Cleanup
window.addEventListener('beforeunload', () => {
    stopPriceUpdates();
});

// Close modals on outside click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// Update trade amount input
document.getElementById('tradeAmountInput').addEventListener('input', () => {
    updatePotentialProfit();
    updateTradeButton();
});
</script>
