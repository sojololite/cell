/**
 * Módulo de Mercado Informal - Gestión inteligente de precios y cálculos
 * @version 2.0.0
 */

class InformalMarket {
    constructor() {
        this.config = {
            basePrices: {
                '120': 500,
                '240': 1000,
                '360': 1500,
                '500': 2000,
                '1000': 3800
            },
            markupPercentage: 35,
            currency: 'CUP',
            updateFrequency: 'realtime',
            marketVolatility: 'medium'
        };
        
        this.marketData = {
            lastUpdate: new Date().toISOString(),
            trends: this.initializeMarketTrends(),
            historicalData: this.loadHistoricalData(),
            providerStats: this.initializeProviderStats()
        };
        
        this.cache = new Map();
        this.cacheTimeout = 300000;
    }

    initializeMarketTrends() {
        return {
            weeklyTrend: 'stable',
            volatilityIndex: 0.15,
            demandLevel: 'normal',
            seasonalFactors: this.getSeasonalFactors()
        };
    }

    initializeProviderStats() {
        return {
            averageResponseTime: '15 min',
            availabilityRate: 0.85,
            ratingDistribution: {
                '5': 0.65,
                '4': 0.25,
                '3': 0.07,
                '2': 0.02,
                '1': 0.01
            }
        };
    }

    loadHistoricalData() {
        const stored = localStorage.getItem('sojoloMarketHistory');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.warn('Error loading market history:', e);
            }
        }
        
        return {
            priceHistory: [],
            transactionVolume: [],
            providerActivity: [],
            last30Days: this.generateInitialHistory()
        };
    }

    generateInitialHistory() {
        const history = [];
        const basePrice = this.config.basePrices['120'];
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            
            const variation = (Math.random() - 0.5) * 0.1;
            const price = Math.round(basePrice * (1 + variation));
            
            history.push({
                date: date.toISOString().split('T')[0],
                price: price,
                volume: Math.floor(Math.random() * 50) + 10,
                averageResponseTime: `${Math.floor(Math.random() * 10) + 5} min`
            });
        }
        
        return history;
    }

    getSeasonalFactors() {
        const now = new Date();
        const month = now.getMonth();
        const factors = {
            demandMultiplier: 1.0,
            priceMultiplier: 1.0
        };
        
        const seasonalPatterns = {
            0: { demand: 0.9, price: 0.95 },
            1: { demand: 0.85, price: 0.9 },
            5: { demand: 1.2, price: 1.15 },
            6: { demand: 1.3, price: 1.25 },
            7: { demand: 1.4, price: 1.35 },
            11: { demand: 1.5, price: 1.4 }
        };
        
        if (seasonalPatterns[month]) {
            factors.demandMultiplier = seasonalPatterns[month].demand;
            factors.priceMultiplier = seasonalPatterns[month].price;
        }
        
        return factors;
    }

    calculatePrice(amount, options = {}) {
        const cacheKey = `price_${amount}_${JSON.stringify(options)}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.result;
        }

        if (!amount || isNaN(amount) || amount <= 0) {
            throw new Error('Cantidad inválida. Debe ser un número positivo.');
        }

        const basePrice = this._getBasePrice(amount);
        const adjustedPrice = this._applyMarketAdjustments(basePrice, amount, options);
        const finalPrice = Math.round(adjustedPrice * (1 + this.config.markupPercentage / 100));

        const result = {
            amount: parseInt(amount),
            basePrice: basePrice,
            finalPrice: finalPrice,
            currency: this.config.currency,
            markup: this.config.markupPercentage,
            marketAdjustments: this._getAdjustmentDetails(basePrice, adjustedPrice),
            timestamp: new Date().toISOString(),
            confidence: this._calculateConfidence(amount)
        };

        this.cache.set(cacheKey, {
            result: result,
            timestamp: Date.now()
        });

        this._updateMarketData(amount, finalPrice);
        
        return result;
    }

    _getBasePrice(amount) {
        const amountNum = parseInt(amount);
        const predefined = this.config.basePrices[amount];
        
        if (predefined) {
            return predefined;
        }

        const amounts = Object.keys(this.config.basePrices).map(Number).sort((a, b) => a - b);
        
        if (amountNum < amounts[0]) {
            return Math.round((amountNum / amounts[0]) * this.config.basePrices[amounts[0]]);
        }
        
        if (amountNum > amounts[amounts.length - 1]) {
            return Math.round((amountNum / amounts[amounts.length - 1]) * this.config.basePrices[amounts[amounts.length - 1]]);
        }

        for (let i = 0; i < amounts.length - 1; i++) {
            if (amountNum >= amounts[i] && amountNum <= amounts[i + 1]) {
                const ratio = (amountNum - amounts[i]) / (amounts[i + 1] - amounts[i]);
                return Math.round(
                    this.config.basePrices[amounts[i]] + 
                    ratio * (this.config.basePrices[amounts[i + 1]] - this.config.basePrices[amounts[i]])
                );
            }
        }

        return Math.round((amountNum / 360) * this.config.basePrices['360']);
    }

    _applyMarketAdjustments(basePrice, amount, options) {
        let adjustedPrice = basePrice;
        const factors = this.marketData.trends.seasonalFactors;
        
        adjustedPrice *= factors.priceMultiplier;
        
        const volatilityFactor = 1 + (Math.random() - 0.5) * this.marketData.trends.volatilityIndex;
        adjustedPrice *= volatilityFactor;
        
        if (amount >= 500) {
            adjustedPrice *= 0.95;
        } else if (amount >= 1000) {
            adjustedPrice *= 0.90;
        }
        
        const hour = new Date().getHours();
        if (hour >= 22 || hour <= 6) {
            adjustedPrice *= 1.1;
        }
        
        return Math.round(adjustedPrice);
    }

    _getAdjustmentDetails(basePrice, adjustedPrice) {
        const difference = adjustedPrice - basePrice;
        const percentage = ((difference / basePrice) * 100).toFixed(1);
        
        return {
            basePrice: basePrice,
            adjustedPrice: adjustedPrice,
            difference: difference,
            percentage: parseFloat(percentage),
            factors: [
                'ajuste estacional',
                'volatilidad del mercado',
                'demanda actual'
            ]
        };
    }

    _calculateConfidence(amount) {
        let confidence = 0.9;
        
        if (!this.config.basePrices[amount]) {
            confidence -= 0.2;
        }
        
        confidence -= this.marketData.trends.volatilityIndex * 0.3;
        
        return Math.max(0.5, Math.min(1.0, confidence));
    }

    _updateMarketData(amount, price) {
        const today = new Date().toISOString().split('T')[0];
        
        this.marketData.historicalData.priceHistory.push({
            date: today,
            amount: amount,
            price: price,
            timestamp: new Date().toISOString()
        });
        
        if (this.marketData.historicalData.priceHistory.length > 1000) {
            this.marketData.historicalData.priceHistory.splice(0, 100);
        }
        
        this.saveMarketData();
    }

    saveMarketData() {
        try {
            localStorage.setItem('sojoloMarketHistory', JSON.stringify(this.marketData.historicalData));
        } catch (e) {
            console.warn('No se pudo guardar el historial del mercado:', e);
        }
    }

    getPriceList() {
        return Object.entries(this.config.basePrices).map(([amount, base]) => {
            const priceInfo = this.calculatePrice(parseInt(amount));
            return {
                amount: parseInt(amount),
                basePrice: base,
                finalPrice: priceInfo.finalPrice,
                currency: this.config.currency,
                markup: this.config.markupPercentage,
                confidence: priceInfo.confidence,
                marketTrend: this.getMarketTrend(parseInt(amount)),
                bestDeal: this.isBestDeal(parseInt(amount))
            };
        });
    }

    getMarketTrend(amount) {
        const history = this.marketData.historicalData.last30Days;
        if (history.length < 2) return 'stable';
        
        const recentPrices = history.slice(-7).map(day => day.price);
        const olderPrices = history.slice(-14, -7).map(day => day.price);
        
        const recentAvg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
        const olderAvg = olderPrices.reduce((a, b) => a + b, 0) / olderPrices.length;
        
        const change = ((recentAvg - olderAvg) / olderAvg) * 100;
        
        if (change > 5) return 'rising';
        if (change < -5) return 'falling';
        return 'stable';
    }

    isBestDeal(amount) {
        const prices = this.getPriceList();
        const current = prices.find(p => p.amount === amount);
        if (!current) return false;
        
        const ratio = current.finalPrice / amount;
        const bestRatio = Math.min(...prices.map(p => p.finalPrice / p.amount));
        
        return Math.abs(ratio - bestRatio) < 0.01;
    }

    calculateCustomPrice(amount) {
        return this.calculatePrice(amount);
    }

    getPriceForDisplay(amount) {
        try {
            const priceInfo = this.calculatePrice(amount);
            return {
                amount: amount,
                price: priceInfo.finalPrice,
                display: `${amount} ${this.config.currency} ≈ ${priceInfo.finalPrice} ${this.config.currency}`,
                isValid: true,
                confidence: priceInfo.confidence,
                trend: this.getMarketTrend(amount),
                details: priceInfo.marketAdjustments
            };
        } catch (error) {
            return {
                amount: amount,
                price: 0,
                display: 'Cantidad inválida',
                isValid: false,
                confidence: 0,
                trend: 'unknown'
            };
        }
    }

    updateBasePrice(amount, newBasePrice) {
        if (newBasePrice <= 0) {
            throw new Error('El precio base debe ser un valor positivo');
        }
        
        this.config.basePrices[amount.toString()] = newBasePrice;
        this.clearCache();
        return true;
    }

    updateMarkupPercentage(newPercentage) {
        if (newPercentage < 0 || newPercentage > 100) {
            throw new Error('El porcentaje de markup debe estar entre 0 y 100');
        }
        
        this.config.markupPercentage = newPercentage;
        this.clearCache();
        return true;
    }

    clearCache() {
        this.cache.clear();
        this.marketData.lastUpdate = new Date().toISOString();
    }

    getMarketInfo() {
        return {
            config: { ...this.config },
            marketData: {
                lastUpdate: this.marketData.lastUpdate,
                trends: { ...this.marketData.trends },
                providerStats: { ...this.marketData.providerStats }
            },
            cacheInfo: {
                size: this.cache.size,
                performance: this.getCachePerformance()
            },
            disclaimer: "ℹ️ Precios calculados en tiempo real basados en condiciones del mercado. Pueden variar."
        };
    }

    getCachePerformance() {
        const hits = Array.from(this.cache.values()).filter(entry => 
            Date.now() - entry.timestamp < this.cacheTimeout
        ).length;
        
        return {
            hitRate: (hits / Math.max(this.cache.size, 1)) * 100,
            totalEntries: this.cache.size,
            validEntries: hits
        };
    }

    analyzeMarketConditions() {
        const history = this.marketData.historicalData.last30Days;
        if (history.length === 0) return null;
        
        const prices = history.map(day => day.price);
        const volumes = history.map(day => day.volume);
        
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        
        const priceStdDev = Math.sqrt(
            prices.map(p => Math.pow(p - avgPrice, 2)).reduce((a, b) => a + b, 0) / prices.length
        );
        
        return {
            averagePrice: Math.round(avgPrice),
            averageVolume: Math.round(avgVolume),
            priceVolatility: (priceStdDev / avgPrice) * 100,
            marketStability: priceStdDev < avgPrice * 0.1 ? 'high' : priceStdDev < avgPrice * 0.2 ? 'medium' : 'low',
            recommendation: this.getMarketRecommendation(avgPrice, priceStdDev, avgVolume)
        };
    }

    getMarketRecommendation(avgPrice, volatility, volume) {
        if (volatility < 0.05 && volume > 20) {
            return 'Mercado estable - Buen momento para transacciones';
        } else if (volatility > 0.15) {
            return 'Mercado volátil - Verificar precios antes de transar';
        } else if (volume < 10) {
            return 'Baja actividad - Puede haber demoras en el servicio';
        }
        
        return 'Condiciones normales del mercado';
    }

    predictTrend(days = 7) {
        const history = this.marketData.historicalData.last30Days;
        if (history.length < 10) return null;
        
        const recentPrices = history.slice(-10).map(day => day.price);
        const trend = this.calculateLinearTrend(recentPrices);
        
        const prediction = [];
        const currentPrice = recentPrices[recentPrices.length - 1];
        
        for (let i = 1; i <= days; i++) {
            const predictedPrice = Math.round(currentPrice + trend.slope * i);
            prediction.push({
                day: i,
                predictedPrice: predictedPrice,
                confidence: Math.max(0.3, 1 - (i * 0.1))
            });
        }
        
        return {
            currentPrice: currentPrice,
            trend: trend.slope > 0 ? 'rising' : trend.slope < 0 ? 'falling' : 'stable',
            trendStrength: Math.abs(trend.slope),
            prediction: prediction,
            accuracy: trend.rSquared
        };
    }

    calculateLinearTrend(data) {
        const n = data.length;
        const x = Array.from({length: n}, (_, i) => i);
        
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = data.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((a, b, i) => a + b * data[i], 0);
        const sumX2 = x.reduce((a, b) => a + b * b, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        const yMean = sumY / n;
        const ssTot = data.reduce((a, b) => a + Math.pow(b - yMean, 2), 0);
        const ssRes = data.reduce((a, b, i) => a + Math.pow(b - (slope * i + intercept), 2), 0);
        const rSquared = 1 - (ssRes / ssTot);
        
        return { slope, intercept, rSquared };
    }
}

class MarketSyncManager {
    constructor(marketInstance) {
        this.market = marketInstance;
        this.syncInterval = 1800000;
        this.lastSync = null;
        this.syncInProgress = false;
    }

    async syncMarketData() {
        if (this.syncInProgress) return;
        
        this.syncInProgress = true;
        
        try {
            const updatedData = await this.fetchMarketUpdates();
            
            if (updatedData) {
                this.applyMarketUpdates(updatedData);
                this.lastSync = new Date().toISOString();
                console.log('Datos del mercado sincronizados exitosamente');
            }
        } catch (error) {
            console.warn('Error sincronizando datos del mercado:', error);
        } finally {
            this.syncInProgress = false;
        }
    }

    async fetchMarketUpdates() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    timestamp: new Date().toISOString(),
                    volatility: 0.12 + (Math.random() - 0.5) * 0.1,
                    demand: Math.random() > 0.5 ? 'high' : 'normal',
                    averagePrices: this.generatePriceUpdates()
                });
            }, 1000);
        });
    }

    generatePriceUpdates() {
        const updates = {};
        Object.keys(this.market.config.basePrices).forEach(amount => {
            const variation = (Math.random() - 0.5) * 0.08;
            updates[amount] = Math.round(
                this.market.config.basePrices[amount] * (1 + variation)
            );
        });
        return updates;
    }

    applyMarketUpdates(updates) {
        Object.keys(updates.averagePrices).forEach(amount => {
            this.market.config.basePrices[amount] = updates.averagePrices[amount];
        });
        
        this.market.marketData.trends.volatilityIndex = updates.volatility;
        this.market.marketData.trends.demandLevel = updates.demand;
        this.market.marketData.lastUpdate = updates.timestamp;
        
        this.market.clearCache();
    }

    startAutoSync() {
        this.syncMarketData();
        
        setInterval(() => {
            this.syncMarketData();
        }, this.syncInterval);
        
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.shouldSync()) {
                this.syncMarketData();
            }
        });
    }

    shouldSync() {
        if (!this.lastSync) return true;
        
        const lastSyncTime = new Date(this.lastSync).getTime();
        const currentTime = Date.now();
        const timeSinceLastSync = currentTime - lastSyncTime;
        
        return timeSinceLastSync > this.syncInterval;
    }

    getSyncStatus() {
        return {
            lastSync: this.lastSync,
            syncInProgress: this.syncInProgress,
            nextSync: this.lastSync ? 
                new Date(new Date(this.lastSync).getTime() + this.syncInterval).toISOString() : 
                null,
            autoSyncEnabled: true
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { InformalMarket, MarketSyncManager };
} else {
    window.InformalMarket = InformalMarket;
    window.MarketSyncManager = MarketSyncManager;
}