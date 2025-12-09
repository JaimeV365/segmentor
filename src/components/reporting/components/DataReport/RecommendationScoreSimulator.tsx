import React, { useState, useMemo } from 'react';
import { InfoRibbon } from '../InfoRibbon';
import './RecommendationScoreSimulator.css';

interface RecommendationScoreSimulatorProps {
  currentDetractors: number;
  currentPassives: number;
  currentPromoters: number;
  currentScore: number;
  totalEntries: number;
}

export const RecommendationScoreSimulator: React.FC<RecommendationScoreSimulatorProps> = ({
  currentDetractors,
  currentPassives,
  currentPromoters,
  currentScore,
  totalEntries
}) => {
  const [detractorsToPassives, setDetractorsToPassives] = useState(0);
  const [detractorsToPromoters, setDetractorsToPromoters] = useState(0);
  const [passivesToPromoters, setPassivesToPromoters] = useState(0);
  const [passivesToDetractors, setPassivesToDetractors] = useState(0);
  const [promotersToPassives, setPromotersToPassives] = useState(0);
  const [promotersToDetractors, setPromotersToDetractors] = useState(0);

  // Calculate max values for sliders (accounting for already moved customers)
  // For each slider, max is the current count minus what's already been moved to other destinations
  const maxDetractorsToPassives = useMemo(() => {
    // Available detractors = current + incoming - outgoing
    // Max = available + current value (to allow going back to 0)
    const available = currentDetractors + passivesToDetractors + promotersToDetractors - detractorsToPassives - detractorsToPromoters;
    return Math.max(0, available + detractorsToPassives);
  }, [currentDetractors, detractorsToPassives, detractorsToPromoters, passivesToDetractors, promotersToDetractors]);

  const maxDetractorsToPromoters = useMemo(() => {
    // Available detractors = current + incoming - outgoing
    // Max = available + current value (to allow going back to 0)
    const available = currentDetractors + passivesToDetractors + promotersToDetractors - detractorsToPassives - detractorsToPromoters;
    return Math.max(0, available + detractorsToPromoters);
  }, [currentDetractors, detractorsToPassives, detractorsToPromoters, passivesToDetractors, promotersToDetractors]);

  const maxPassivesToPromoters = useMemo(() => {
    // Available passives = current + incoming - outgoing
    // Max = available + current value (to allow going back to 0)
    const available = currentPassives + detractorsToPassives + promotersToPassives - passivesToDetractors - passivesToPromoters;
    return Math.max(0, available + passivesToPromoters);
  }, [currentPassives, detractorsToPassives, passivesToDetractors, passivesToPromoters, promotersToPassives]);

  const maxPassivesToDetractors = useMemo(() => {
    // Available passives = current + incoming - outgoing
    // Max = available + current value (to allow going back to 0)
    const available = currentPassives + detractorsToPassives + promotersToPassives - passivesToPromoters - passivesToDetractors;
    return Math.max(0, available + passivesToDetractors);
  }, [currentPassives, detractorsToPassives, passivesToPromoters, passivesToDetractors, promotersToPassives]);

  const maxPromotersToPassives = useMemo(() => {
    // Available promoters = current + incoming - outgoing
    // Max = available + current value (to allow going back to 0)
    const available = currentPromoters + detractorsToPromoters + passivesToPromoters - promotersToPassives - promotersToDetractors;
    return Math.max(0, available + promotersToPassives);
  }, [currentPromoters, detractorsToPromoters, passivesToPromoters, promotersToPassives, promotersToDetractors]);

  const maxPromotersToDetractors = useMemo(() => {
    // Available promoters = current + incoming - outgoing
    // Max = available + current value (to allow going back to 0)
    const available = currentPromoters + detractorsToPromoters + passivesToPromoters - promotersToPassives - promotersToDetractors;
    return Math.max(0, available + promotersToDetractors);
  }, [currentPromoters, detractorsToPromoters, passivesToPromoters, promotersToPassives, promotersToDetractors]);

  // Calculate simulated distribution
  const simulatedDistribution = useMemo(() => {
    const simulatedDetractors = Math.max(0, Math.min(
      currentDetractors - detractorsToPassives - detractorsToPromoters + passivesToDetractors + promotersToDetractors,
      totalEntries
    ));
    const simulatedPassives = Math.max(0, Math.min(
      currentPassives + detractorsToPassives - passivesToPromoters - passivesToDetractors + promotersToPassives,
      totalEntries
    ));
    const simulatedPromoters = Math.max(0, Math.min(
      currentPromoters + detractorsToPromoters + passivesToPromoters - promotersToPassives - promotersToDetractors,
      totalEntries
    ));

    // Ensure total doesn't exceed totalEntries
    const total = simulatedDetractors + simulatedPassives + simulatedPromoters;
    if (total > totalEntries) {
      const scale = totalEntries / total;
      return {
        detractors: Math.round(simulatedDetractors * scale),
        passives: Math.round(simulatedPassives * scale),
        promoters: Math.round(simulatedPromoters * scale)
      };
    }

    return {
      detractors: simulatedDetractors,
      passives: simulatedPassives,
      promoters: simulatedPromoters
    };
  }, [
    currentDetractors,
    currentPassives,
    currentPromoters,
    detractorsToPassives,
    detractorsToPromoters,
    passivesToPromoters,
    passivesToDetractors,
    promotersToPassives,
    promotersToDetractors,
    totalEntries
  ]);

  // Calculate simulated score
  const simulatedScore = useMemo(() => {
    const total = simulatedDistribution.detractors + simulatedDistribution.passives + simulatedDistribution.promoters;
    if (total === 0) return 0;
    
    const detractorsPercent = (simulatedDistribution.detractors / total) * 100;
    const promotersPercent = (simulatedDistribution.promoters / total) * 100;
    
    return promotersPercent - detractorsPercent;
  }, [simulatedDistribution]);

  const scoreChange = simulatedScore - currentScore;
  const hasChanges = detractorsToPassives !== 0 || detractorsToPromoters !== 0 || passivesToPromoters !== 0 ||
                     passivesToDetractors !== 0 || promotersToPassives !== 0 || promotersToDetractors !== 0;

  const resetSimulation = () => {
    setDetractorsToPassives(0);
    setDetractorsToPromoters(0);
    setPassivesToPromoters(0);
    setPassivesToDetractors(0);
    setPromotersToPassives(0);
    setPromotersToDetractors(0);
  };

  const currentTotal = currentDetractors + currentPassives + currentPromoters;
  const simulatedTotal = simulatedDistribution.detractors + simulatedDistribution.passives + simulatedDistribution.promoters;

  return (
    <div className="recommendation-score-simulator">
      <h5 className="simulator-title">Recommendation Score Simulator</h5>
      <InfoRibbon text="Use this simulator to explore hypothetical scenarios by converting customers between categories. Adjust the sliders to see how converting Detractors to Promoters, Passives to Promoters, or other combinations would affect your Recommendation Score. These are simulations only—your actual data remains unchanged." />

      <div className="simulator-content">
        {/* Left Column: Current and Simulated Scores */}
        <div className="simulator-left-column">
          {/* Current State */}
          <div className="simulator-section">
            <h6 className="simulator-section-title">Current State</h6>
            <div className={`score-display current ${currentScore < 0 ? 'negative' : currentScore === 0 ? 'neutral' : 'positive'}`}>
              <div className="score-value">{currentScore.toFixed(1)}</div>
              <div className="score-label">Current Score</div>
            </div>
            <div className="distribution-display">
              <div className="distribution-item">
                <span className="distribution-label">Detractors:</span>
                <span className="distribution-value">
                  {currentDetractors} ({currentTotal > 0 ? ((currentDetractors / currentTotal) * 100).toFixed(1) : 0}%)
                </span>
              </div>
              <div className="distribution-item">
                <span className="distribution-label">Passives:</span>
                <span className="distribution-value">
                  {currentPassives} ({currentTotal > 0 ? ((currentPassives / currentTotal) * 100).toFixed(1) : 0}%)
                </span>
              </div>
              <div className="distribution-item">
                <span className="distribution-label">Promoters:</span>
                <span className="distribution-value">
                  {currentPromoters} ({currentTotal > 0 ? ((currentPromoters / currentTotal) * 100).toFixed(1) : 0}%)
                </span>
              </div>
            </div>
          </div>

          {/* Simulated State */}
          <div className="simulator-section">
            <h6 className="simulator-section-title">Simulated State</h6>
            <div className={`score-display simulated ${simulatedScore < 0 ? 'negative' : simulatedScore === 0 ? 'neutral' : 'positive'}`}>
              <div className="score-value">{simulatedScore.toFixed(1)}</div>
              <div className="score-label">
                Simulated Score
                {hasChanges && (
                  <span className={`score-change ${scoreChange > 0 ? 'positive' : scoreChange < 0 ? 'negative' : ''}`}>
                    {scoreChange > 0 ? '+' : ''}{scoreChange.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
            <div className="distribution-display">
              <div className="distribution-item">
                <span className="distribution-label">Detractors:</span>
                <span className="distribution-value">
                  {simulatedDistribution.detractors} ({simulatedTotal > 0 ? ((simulatedDistribution.detractors / simulatedTotal) * 100).toFixed(1) : 0}%)
                </span>
              </div>
              <div className="distribution-item">
                <span className="distribution-label">Passives:</span>
                <span className="distribution-value">
                  {simulatedDistribution.passives} ({simulatedTotal > 0 ? ((simulatedDistribution.passives / simulatedTotal) * 100).toFixed(1) : 0}%)
                </span>
              </div>
              <div className="distribution-item">
                <span className="distribution-label">Promoters:</span>
                <span className="distribution-value">
                  {simulatedDistribution.promoters} ({simulatedTotal > 0 ? ((simulatedDistribution.promoters / simulatedTotal) * 100).toFixed(1) : 0}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Simulation Controls */}
        <div className="simulator-right-column">
          <h6 className="simulator-section-title">Simulate Changes</h6>
          <div className="simulation-controls">
            {/* Detractors Group */}
            <div className="control-category">
              <div className="control-category-title">Convert Detractors</div>
              <div className="control-group">
                <label className="control-label">
                  → Passives
                  <span className="control-value">{detractorsToPassives}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max={maxDetractorsToPassives}
                  value={detractorsToPassives}
                  onChange={(e) => setDetractorsToPassives(Number(e.target.value))}
                  className="control-slider"
                />
              </div>
              <div className="control-group">
                <label className="control-label">
                  → Promoters
                  <span className="control-value">{detractorsToPromoters}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max={maxDetractorsToPromoters}
                  value={detractorsToPromoters}
                  onChange={(e) => setDetractorsToPromoters(Number(e.target.value))}
                  className="control-slider"
                />
              </div>
            </div>

            {/* Passives Group */}
            <div className="control-category">
              <div className="control-category-title">Convert Passives</div>
              <div className="control-group">
                <label className="control-label">
                  → Promoters
                  <span className="control-value">{passivesToPromoters}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max={maxPassivesToPromoters}
                  value={passivesToPromoters}
                  onChange={(e) => setPassivesToPromoters(Number(e.target.value))}
                  className="control-slider"
                />
              </div>
              <div className="control-group">
                <label className="control-label">
                  → Detractors
                  <span className="control-value">{passivesToDetractors}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max={maxPassivesToDetractors}
                  value={passivesToDetractors}
                  onChange={(e) => setPassivesToDetractors(Number(e.target.value))}
                  className="control-slider"
                />
              </div>
            </div>

            {/* Promoters Group */}
            <div className="control-category">
              <div className="control-category-title">Convert Promoters</div>
              <div className="control-group">
                <label className="control-label">
                  → Passives
                  <span className="control-value">{promotersToPassives}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max={maxPromotersToPassives}
                  value={promotersToPassives}
                  onChange={(e) => setPromotersToPassives(Number(e.target.value))}
                  className="control-slider"
                />
              </div>
              <div className="control-group">
                <label className="control-label">
                  → Detractors
                  <span className="control-value">{promotersToDetractors}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max={maxPromotersToDetractors}
                  value={promotersToDetractors}
                  onChange={(e) => setPromotersToDetractors(Number(e.target.value))}
                  className="control-slider"
                />
              </div>
            </div>
          </div>

          {hasChanges && (
            <button className="reset-button" onClick={resetSimulation}>
              Reset Simulation
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

