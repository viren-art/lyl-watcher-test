const CustomerDataRepository = require('../../database/customer-data/customer-data.repository');
const UsageAnalyticsRepository = require('../../database/customer-data/usage-analytics.repository');
const { ApiError } = require('../../utils/errors');

class CustomerIntelligenceService {
  constructor() {
    this.customerDataRepository = new CustomerDataRepository();
    this.usageAnalyticsRepository = new UsageAnalyticsRepository();
  }

  /**
   * Create detailed customer profile with market segmentation
   */
  async createCustomerProfile(data) {
    const {
      customerId,
      companyName,
      industry,
      companySize,
      annualRevenue,
      gridRegions,
      primaryUseCase,
      technicalMaturity,
      decisionMakers
    } = data;

    // Calculate lead score based on profile attributes
    const leadScore = this._calculateLeadScore({
      companySize,
      annualRevenue,
      industry,
      technicalMaturity,
      gridRegions: gridRegions.length
    });

    // Determine market segment
    const marketSegment = this._determineMarketSegment({
      companySize,
      annualRevenue,
      industry,
      primaryUseCase
    });

    const profile = await this.customerDataRepository.createProfile({
      customerId,
      companyName,
      industry,
      companySize,
      annualRevenue,
      primaryUseCase,
      technicalMaturity,
      leadScore,
      marketSegment,
      decisionMakers: JSON.stringify(decisionMakers)
    });

    // Store grid region interests
    for (const regionId of gridRegions) {
      await this.customerDataRepository.addRegionInterest(customerId, regionId);
    }

    return {
      ...profile,
      gridRegions,
      decisionMakers
    };
  }

  /**
   * Update customer profile and recalculate scores
   */
  async updateCustomerProfile(customerId, updates) {
    const currentProfile = await this.customerDataRepository.getProfile(customerId);
    if (!currentProfile) {
      throw new ApiError(404, 'PROFILE_NOT_FOUND', 'Customer profile not found');
    }

    // Recalculate lead score if relevant fields changed
    let leadScore = currentProfile.lead_score;
    if (updates.companySize || updates.annualRevenue || updates.technicalMaturity) {
      leadScore = this._calculateLeadScore({
        companySize: updates.companySize || currentProfile.company_size,
        annualRevenue: updates.annualRevenue || currentProfile.annual_revenue,
        industry: updates.industry || currentProfile.industry,
        technicalMaturity: updates.technicalMaturity || currentProfile.technical_maturity,
        gridRegions: currentProfile.grid_regions_count
      });
    }

    // Recalculate market segment if relevant fields changed
    let marketSegment = currentProfile.market_segment;
    if (updates.companySize || updates.annualRevenue || updates.industry || updates.primaryUseCase) {
      marketSegment = this._determineMarketSegment({
        companySize: updates.companySize || currentProfile.company_size,
        annualRevenue: updates.annualRevenue || currentProfile.annual_revenue,
        industry: updates.industry || currentProfile.industry,
        primaryUseCase: updates.primaryUseCase || currentProfile.primary_use_case
      });
    }

    const updatedProfile = await this.customerDataRepository.updateProfile(customerId, {
      ...updates,
      leadScore,
      marketSegment
    });

    return updatedProfile;
  }

  /**
   * Get customer profile with enriched data
   */
  async getCustomerProfile(customerId) {
    const profile = await this.customerDataRepository.getProfile(customerId);
    if (!profile) {
      throw new ApiError(404, 'PROFILE_NOT_FOUND', 'Customer profile not found');
    }

    // Get usage statistics
    const usageStats = await this.usageAnalyticsRepository.getCustomerUsageStats(customerId);

    // Get subscription details
    const subscription = await this.customerDataRepository.getSubscription(customerId);

    // Get region interests
    const regionInterests = await this.customerDataRepository.getRegionInterests(customerId);

    return {
      ...profile,
      decisionMakers: JSON.parse(profile.decision_makers || '[]'),
      usageStats,
      subscription,
      regionInterests
    };
  }

  /**
   * Get all qualified B2B customers (lead score >= 70)
   */
  async getQualifiedCustomers(filters = {}) {
    const {
      minLeadScore = 70,
      marketSegment,
      industry,
      subscriptionTier,
      limit = 100,
      offset = 0
    } = filters;

    const customers = await this.customerDataRepository.getQualifiedCustomers({
      minLeadScore,
      marketSegment,
      industry,
      subscriptionTier,
      limit,
      offset
    });

    // Enrich with usage data
    const enrichedCustomers = await Promise.all(
      customers.map(async (customer) => {
        const usageStats = await this.usageAnalyticsRepository.getCustomerUsageStats(customer.customer_id);
        return {
          ...customer,
          usageStats
        };
      })
    );

    return enrichedCustomers;
  }

  /**
   * Identify upsell opportunities based on usage patterns
   */
  async identifyUpsellOpportunities(customerId) {
    const profile = await this.customerDataRepository.getProfile(customerId);
    const subscription = await this.customerDataRepository.getSubscription(customerId);
    const usageStats = await this.usageAnalyticsRepository.getCustomerUsageStats(customerId);

    const opportunities = [];

    // Check if approaching rate limit (>80% usage)
    if (usageStats.apiCallsThisMonth > subscription.rate_limit_per_hour * 0.8 * 730) {
      opportunities.push({
        type: 'RATE_LIMIT_UPGRADE',
        priority: 'HIGH',
        currentTier: subscription.subscription_tier,
        recommendedTier: this._getNextTier(subscription.subscription_tier),
        reason: `Using ${Math.round((usageStats.apiCallsThisMonth / (subscription.rate_limit_per_hour * 730)) * 100)}% of monthly API quota`,
        estimatedValue: this._calculateTierUpgradeValue(subscription.subscription_tier)
      });
    }

    // Check if using features beyond current tier
    if (subscription.subscription_tier === 'BASIC' && usageStats.bessAnalysisRuns > 0) {
      opportunities.push({
        type: 'FEATURE_ACCESS',
        priority: 'MEDIUM',
        currentTier: subscription.subscription_tier,
        recommendedTier: 'PROFESSIONAL',
        reason: 'Using BESS optimization features available in Professional tier',
        estimatedValue: 5000
      });
    }

    // Check if high engagement but low tier
    if (subscription.subscription_tier === 'BASIC' && usageStats.dashboardViewsThisMonth > 100) {
      opportunities.push({
        type: 'ENGAGEMENT_UPGRADE',
        priority: 'MEDIUM',
        currentTier: subscription.subscription_tier,
        recommendedTier: 'PROFESSIONAL',
        reason: `High engagement with ${usageStats.dashboardViewsThisMonth} dashboard views this month`,
        estimatedValue: 5000
      });
    }

    // Check if requesting multiple regions but only subscribed to few
    const regionInterests = await this.customerDataRepository.getRegionInterests(customerId);
    if (regionInterests.length < 3 && usageStats.uniqueRegionsQueried > regionInterests.length) {
      opportunities.push({
        type: 'REGION_EXPANSION',
        priority: 'MEDIUM',
        currentRegions: regionInterests.length,
        queriedRegions: usageStats.uniqueRegionsQueried,
        reason: `Querying ${usageStats.uniqueRegionsQueried} regions but only subscribed to ${regionInterests.length}`,
        estimatedValue: 2000 * (usageStats.uniqueRegionsQueried - regionInterests.length)
      });
    }

    // Check if high prediction accuracy value but low tier
    if (usageStats.predictionRequestsThisMonth > 500 && subscription.subscription_tier !== 'ENTERPRISE') {
      opportunities.push({
        type: 'VOLUME_UPGRADE',
        priority: 'HIGH',
        currentTier: subscription.subscription_tier,
        recommendedTier: 'ENTERPRISE',
        reason: `High volume usage with ${usageStats.predictionRequestsThisMonth} predictions this month`,
        estimatedValue: 15000
      });
    }

    return {
      customerId,
      companyName: profile.company_name,
      currentTier: subscription.subscription_tier,
      opportunities: opportunities.sort((a, b) => {
        const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }),
      totalEstimatedValue: opportunities.reduce((sum, opp) => sum + opp.estimatedValue, 0)
    };
  }

  /**
   * Generate ROI report for customer
   */
  async generateRoiReport(customerId, periodMonths = 12) {
    const profile = await this.customerDataRepository.getProfile(customerId);
    const subscription = await this.customerDataRepository.getSubscription(customerId);
    const usageStats = await this.usageAnalyticsRepository.getCustomerUsageStats(customerId);

    // Calculate subscription cost
    const tierCosts = {
      BASIC: 1000,
      PROFESSIONAL: 5000,
      ENTERPRISE: 15000
    };
    const subscriptionCost = tierCosts[subscription.subscription_tier] * periodMonths;

    // Calculate value delivered
    const weatherPredictionValue = usageStats.predictionRequestsThisMonth * 12 * 50; // $50 per prediction
    const gridImpactValue = usageStats.gridImpactAnalysisRuns * 12 * 200; // $200 per analysis
    const bessOptimizationValue = usageStats.bessAnalysisRuns * 12 * 5000; // $5000 per BESS analysis

    // Calculate accuracy-based value multiplier
    const accuracyMultiplier = usageStats.averagePredictionAccuracy / 100;

    const totalValueDelivered = (
      weatherPredictionValue +
      gridImpactValue +
      bessOptimizationValue
    ) * accuracyMultiplier;

    const roi = ((totalValueDelivered - subscriptionCost) / subscriptionCost) * 100;

    return {
      customerId,
      companyName: profile.company_name,
      periodMonths,
      subscriptionTier: subscription.subscription_tier,
      costs: {
        subscriptionCost,
        breakdown: {
          monthlyFee: tierCosts[subscription.subscription_tier],
          totalMonths: periodMonths
        }
      },
      valueDelivered: {
        total: Math.round(totalValueDelivered),
        breakdown: {
          weatherPredictions: Math.round(weatherPredictionValue * accuracyMultiplier),
          gridImpactAnalysis: Math.round(gridImpactValue * accuracyMultiplier),
          bessOptimization: Math.round(bessOptimizationValue * accuracyMultiplier)
        },
        accuracyMultiplier: Math.round(accuracyMultiplier * 100) / 100
      },
      roi: Math.round(roi * 100) / 100,
      usageMetrics: {
        predictionRequests: usageStats.predictionRequestsThisMonth * 12,
        gridImpactAnalyses: usageStats.gridImpactAnalysisRuns * 12,
        bessAnalyses: usageStats.bessAnalysisRuns * 12,
        averageAccuracy: usageStats.averagePredictionAccuracy
      }
    };
  }

  /**
   * Get market segmentation analysis
   */
  async getMarketSegmentation() {
    const segments = await this.customerDataRepository.getMarketSegments();

    const segmentAnalysis = await Promise.all(
      segments.map(async (segment) => {
        const customers = await this.customerDataRepository.getCustomersBySegment(segment.market_segment);
        const totalRevenue = customers.reduce((sum, c) => sum + (c.annual_revenue || 0), 0);
        const avgLeadScore = customers.reduce((sum, c) => sum + c.lead_score, 0) / customers.length;

        return {
          segment: segment.market_segment,
          customerCount: segment.customer_count,
          averageLeadScore: Math.round(avgLeadScore),
          totalAnnualRevenue: totalRevenue,
          averageRevenuePerCustomer: Math.round(totalRevenue / segment.customer_count),
          topIndustries: await this._getTopIndustriesForSegment(segment.market_segment)
        };
      })
    );

    return segmentAnalysis;
  }

  // Private helper methods

  _calculateLeadScore({ companySize, annualRevenue, industry, technicalMaturity, gridRegions }) {
    let score = 0;

    // Company size scoring (0-25 points)
    const sizeScores = {
      'SMALL': 10,
      'MEDIUM': 15,
      'LARGE': 20,
      'ENTERPRISE': 25
    };
    score += sizeScores[companySize] || 0;

    // Annual revenue scoring (0-30 points)
    if (annualRevenue >= 100000000) score += 30; // $100M+
    else if (annualRevenue >= 50000000) score += 25; // $50M+
    else if (annualRevenue >= 10000000) score += 20; // $10M+
    else if (annualRevenue >= 1000000) score += 10; // $1M+

    // Industry scoring (0-20 points)
    const industryScores = {
      'UTILITY': 20,
      'ENERGY': 18,
      'MANUFACTURING': 15,
      'TECHNOLOGY': 12,
      'GOVERNMENT': 10
    };
    score += industryScores[industry] || 5;

    // Technical maturity scoring (0-15 points)
    const maturityScores = {
      'ADVANCED': 15,
      'INTERMEDIATE': 10,
      'BASIC': 5,
      'NONE': 0
    };
    score += maturityScores[technicalMaturity] || 0;

    // Grid regions scoring (0-10 points)
    score += Math.min(gridRegions * 2, 10);

    return Math.min(score, 100);
  }

  _determineMarketSegment({ companySize, annualRevenue, industry, primaryUseCase }) {
    // Enterprise segment: Large companies with high revenue
    if (companySize === 'ENTERPRISE' || annualRevenue >= 100000000) {
      return 'ENTERPRISE';
    }

    // Strategic segment: Utilities and energy companies
    if (industry === 'UTILITY' || industry === 'ENERGY') {
      return 'STRATEGIC';
    }

    // Growth segment: Medium-sized companies with BESS focus
    if (companySize === 'MEDIUM' && primaryUseCase === 'BESS_OPTIMIZATION') {
      return 'GROWTH';
    }

    // SMB segment: Small to medium businesses
    if (companySize === 'SMALL' || companySize === 'MEDIUM') {
      return 'SMB';
    }

    return 'GENERAL';
  }

  _getNextTier(currentTier) {
    const tierProgression = {
      'BASIC': 'PROFESSIONAL',
      'PROFESSIONAL': 'ENTERPRISE',
      'ENTERPRISE': 'ENTERPRISE'
    };
    return tierProgression[currentTier] || 'PROFESSIONAL';
  }

  _calculateTierUpgradeValue(currentTier) {
    const upgradeCosts = {
      'BASIC': 4000, // Upgrade to Professional
      'PROFESSIONAL': 10000, // Upgrade to Enterprise
      'ENTERPRISE': 0
    };
    return upgradeCosts[currentTier] || 0;
  }

  async _getTopIndustriesForSegment(segment) {
    const industries = await this.customerDataRepository.getIndustriesBySegment(segment);
    return industries.slice(0, 3);
  }
}

module.exports = CustomerIntelligenceService;