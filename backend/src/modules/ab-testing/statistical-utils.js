/**
 * Statistical utilities for A/B testing analysis
 */

class StatisticalUtils {
  /**
   * Calculate confidence interval for mean
   */
  static confidenceInterval(mean, stdDev, sampleSize, confidenceLevel = 0.95) {
    const zScore = this.getZScore(confidenceLevel);
    const standardError = stdDev / Math.sqrt(sampleSize);
    const marginOfError = zScore * standardError;

    return {
      lower: mean - marginOfError,
      upper: mean + marginOfError,
      marginOfError
    };
  }

  /**
   * Get z-score for confidence level
   */
  static getZScore(confidenceLevel) {
    const zScores = {
      0.90: 1.645,
      0.95: 1.96,
      0.99: 2.576
    };

    return zScores[confidenceLevel] || 1.96;
  }

  /**
   * Perform two-sample t-test
   */
  static tTest(sample1, sample2) {
    const { mean: mean1, stdDev: stdDev1, size: n1 } = sample1;
    const { mean: mean2, stdDev: stdDev2, size: n2 } = sample2;

    // Pooled standard deviation
    const pooledStdDev = Math.sqrt(
      ((n1 - 1) * stdDev1 * stdDev1 + (n2 - 1) * stdDev2 * stdDev2) / (n1 + n2 - 2)
    );

    // t-statistic
    const tStat = (mean1 - mean2) / (pooledStdDev * Math.sqrt(1/n1 + 1/n2));

    // Degrees of freedom
    const df = n1 + n2 - 2;

    // p-value (approximation)
    const pValue = this.tDistributionPValue(Math.abs(tStat), df);

    return {
      tStatistic: tStat,
      degreesOfFreedom: df,
      pValue,
      isSignificant: pValue < 0.05
    };
  }

  /**
   * Approximate p-value from t-distribution
   */
  static tDistributionPValue(t, df) {
    // Simplified approximation
    if (df > 30) {
      // Use normal approximation for large df
      return 2 * (1 - this.normalCDF(t));
    }

    // Rough approximation for smaller df
    const criticalValues = {
      1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
      10: 2.228, 20: 2.086, 30: 2.042
    };

    let criticalValue = 1.96;
    for (const [degrees, value] of Object.entries(criticalValues)) {
      if (df <= parseInt(degrees)) {
        criticalValue = value;
        break;
      }
    }

    if (Math.abs(t) > criticalValue) {
      return 0.01; // Significant
    } else {
      return 0.10; // Not significant
    }
  }

  /**
   * Normal cumulative distribution function
   */
  static normalCDF(x) {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    
    return x > 0 ? 1 - prob : prob;
  }

  /**
   * Calculate effect size (Cohen's d)
   */
  static cohensD(sample1, sample2) {
    const { mean: mean1, stdDev: stdDev1, size: n1 } = sample1;
    const { mean: mean2, stdDev: stdDev2, size: n2 } = sample2;

    const pooledStdDev = Math.sqrt(
      ((n1 - 1) * stdDev1 * stdDev1 + (n2 - 1) * stdDev2 * stdDev2) / (n1 + n2 - 2)
    );

    return (mean1 - mean2) / pooledStdDev;
  }

  /**
   * Calculate minimum sample size needed
   */
  static minimumSampleSize(effectSize, power = 0.8, alpha = 0.05) {
    // Simplified calculation
    const zAlpha = this.getZScore(1 - alpha / 2);
    const zBeta = this.getZScore(power);

    const n = 2 * Math.pow((zAlpha + zBeta) / effectSize, 2);

    return Math.ceil(n);
  }

  /**
   * Calculate statistical power
   */
  static calculatePower(sample1, sample2, alpha = 0.05) {
    const effectSize = Math.abs(this.cohensD(sample1, sample2));
    const n = Math.min(sample1.size, sample2.size);

    const zAlpha = this.getZScore(1 - alpha / 2);
    const delta = effectSize * Math.sqrt(n / 2);
    const zBeta = delta - zAlpha;

    const power = this.normalCDF(zBeta);

    return power;
  }
}

module.exports = StatisticalUtils;