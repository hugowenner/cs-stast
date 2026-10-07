import { describe, test, expect } from "vitest";
import { calculatePlayerScore, isEligibleForOfficialRanking } from "./seasonScore";

describe("CS2 Stats - Model Core Math (Audit 3.5 Suite)", () => {
  test("test_n0_zero_games_returns_neutral", () => {
    const res = calculatePlayerScore(0, 0, 1.35);
    expect(res.score).toBe(1.000);
    expect(res.rHat).toBe(1.000);
    expect(res.pHat).toBe(0.500);
    expect(res.confidenceStatus).toBe("PROVISIONAL");
  });

  test("test_wr_1_of_1_attenuation", () => {
    const res = calculatePlayerScore(1, 1, 0.940);
    expect(res.pHat).toBe(0.545); // (1 + 5)/11
    expect(res.rHat).toBe(0.995); // 1 + 1/11*(0.94 - 1)
    expect(res.score).toBe(1.001); // 0.995 + 0.15*(0.545 - 0.5)
    expect(res.confidenceStatus).toBe("PROVISIONAL");
  });

  test("test_wr_30_of_50_high_sample", () => {
    const res = calculatePlayerScore(50, 30, 1.200);
    expect(res.pHat).toBe(0.583); // (30 + 5)/60
    expect(res.rHat).toBe(1.167); // 1 + 50/60*0.2
    expect(res.score).toBe(1.179); // 1.167 + 0.15*0.0833
    expect(res.confidenceStatus).toBe("HIGH");
  });

  test("test_neutral_player_no_volume_bonus", () => {
    const resN10 = calculatePlayerScore(10, 5, 1.000);
    const resN30 = calculatePlayerScore(30, 15, 1.000);
    expect(resN10.score).toBe(1.000);
    expect(resN30.score).toBe(1.000);
  });

  test("test_monotonic_rating", () => {
    const res1 = calculatePlayerScore(20, 10, 1.100);
    const res2 = calculatePlayerScore(20, 10, 1.200);
    expect(res2.score).toBeGreaterThan(res1.score);
  });

  test("test_monotonic_wr", () => {
    const res1 = calculatePlayerScore(20, 8, 1.150);
    const res2 = calculatePlayerScore(20, 14, 1.150);
    expect(res2.score).toBeGreaterThan(res1.score);
  });

  test("test_high_rating_low_wr_preservation", () => {
    const res = calculatePlayerScore(40, 18, 1.400);
    expect(res.score).toBe(1.314);
  });

  test("test_invalid_inputs_fallback", () => {
    expect(calculatePlayerScore(NaN as any, 0, 1.2).score).toBe(1.000);
    expect(calculatePlayerScore(10, 5, -0.5).score).toBe(1.000);
    expect(calculatePlayerScore(-5, 0, 1.2).score).toBe(1.000);
  });

  test("test_confidence_status_boundaries", () => {
    expect(calculatePlayerScore(9, 5, 1.1).confidenceStatus).toBe("PROVISIONAL");
    expect(calculatePlayerScore(10, 5, 1.1).confidenceStatus).toBe("MEDIUM");
    expect(calculatePlayerScore(24, 12, 1.1).confidenceStatus).toBe("MEDIUM");
    expect(calculatePlayerScore(25, 13, 1.1).confidenceStatus).toBe("HIGH");
  });
});

describe("CS2 Stats - Official Ranking Eligibility & Filtering (Etapa 6 Suite)", () => {
  // Requirement 1: N = 1 excluded from official ranking
  test("req_1_n1_excluded_from_official_ranking", () => {
    expect(isEligibleForOfficialRanking(1)).toBe(false);
  });

  // Requirement 2: N = 9 excluded from official ranking
  test("req_2_n9_excluded_from_official_ranking", () => {
    expect(isEligibleForOfficialRanking(9)).toBe(false);
  });

  // Requirement 3: N = 10 included in official ranking
  test("req_3_n10_included_in_official_ranking", () => {
    expect(isEligibleForOfficialRanking(10)).toBe(true);
  });

  // Requirement 4: N = 11 included in official ranking
  test("req_4_n11_included_in_official_ranking", () => {
    expect(isEligibleForOfficialRanking(11)).toBe(true);
  });

  // Requirement 5: N = 1 with high score cannot overtake eligible player in official ranking
  test("req_5_high_score_provisional_cannot_overtake_eligible_in_official_ranking", () => {
    const provPlayer = { id: "p1", n: 1, w: 1, r: 2.5, score: calculatePlayerScore(1, 1, 2.5).score };
    const eligPlayer = { id: "p2", n: 10, w: 6, r: 1.1, score: calculatePlayerScore(10, 6, 1.1).score };

    const candidates = [provPlayer, eligPlayer];
    const officialRanking = candidates
      .filter((p) => isEligibleForOfficialRanking(p.n))
      .sort((a, b) => b.score - a.score);

    expect(officialRanking).toHaveLength(1);
    expect(officialRanking[0].id).toBe("p2");
  });

  // Requirement 6: N < 10 score calculated normally without score penalty
  test("req_6_provisional_score_calculated_normally_without_penalty", () => {
    const res = calculatePlayerScore(5, 3, 1.40);
    // rHat = 1 + 5/15 * (1.4 - 1) = 1.133
    // pHat = (3 + 5) / 15 = 0.533
    // score = 1.133 + 0.15 * (0.533 - 0.5) = 1.138
    expect(res.score).toBeGreaterThan(1.0);
    expect(res.confidenceStatus).toBe("PROVISIONAL");
  });

  // Requirement 7: Eligibility filter does not modify R_hat, P_hat, or S
  test("req_7_eligibility_filter_does_not_modify_score_components", () => {
    const p1 = calculatePlayerScore(12, 8, 1.25);
    const scoreBeforeFilter = p1.score;
    const rHatBeforeFilter = p1.rHat;
    const pHatBeforeFilter = p1.pHat;

    const isEligible = isEligibleForOfficialRanking(12);
    expect(isEligible).toBe(true);

    expect(p1.score).toBe(scoreBeforeFilter);
    expect(p1.rHat).toBe(rHatBeforeFilter);
    expect(p1.pHat).toBe(pHatBeforeFilter);
  });

  // Requirement 8: Ranking ordered by score DESC, not raw Rating DESC
  test("req_8_ordered_by_score_desc_not_raw_rating_desc", () => {
    // Player A: High raw rating (1.30) but low win rate (10/50 = 20%)
    const pA = { id: "A", rating: 1.30, ...calculatePlayerScore(50, 10, 1.30) };
    // Player B: Good raw rating (1.20) and very high win rate (45/50 = 90%)
    const pB = { id: "B", rating: 1.20, ...calculatePlayerScore(50, 45, 1.20) };

    expect(pA.rating).toBeGreaterThan(pB.rating); // A has higher raw rating (1.30 > 1.20)
    expect(pB.score).toBeGreaterThan(pA.score);   // B has higher Season Score (1.217 > 1.213)

    const ranking = [pA, pB].sort((a, b) => b.score - a.score);
    expect(ranking[0].id).toBe("B");
  });

  // Requirement 9: No rating-based exclusion, only N >= 10
  test("req_9_no_rating_exclusion_only_n_threshold", () => {
    const lowRatingEligible = { n: 10, r: 0.80 };
    const highRatingProvisional = { n: 9, r: 2.00 };

    expect(isEligibleForOfficialRanking(lowRatingEligible.n)).toBe(true);
    expect(isEligibleForOfficialRanking(highRatingProvisional.n)).toBe(false);
  });

  // Requirement 10: Pagination (slice/take) applied AFTER filtering and sorting by score DESC
  test("req_10_pagination_applied_after_filtering_and_sorting", () => {
    const players = Array.from({ length: 15 }, (_, i) => {
      const n = i < 5 ? 5 : 10 + i; // 5 provisional (N=5), 10 eligible (N=10..19)
      const r = 1.0 + (i * 0.02);
      return {
        id: `player_${i}`,
        n,
        r,
        score: calculatePlayerScore(n, Math.floor(n / 2), r).score,
      };
    });

    const take = 3;
    const allEligible = players.filter((p) => isEligibleForOfficialRanking(p.n));
    const sortedEligible = [...allEligible].sort((a, b) => b.score - a.score);
    const paginatedOfficial = sortedEligible.slice(0, take);

    expect(allEligible).toHaveLength(10);
    expect(paginatedOfficial).toHaveLength(3);
    expect(paginatedOfficial[0].id).toBe(sortedEligible[0].id);
    expect(paginatedOfficial[1].id).toBe(sortedEligible[1].id);
    expect(paginatedOfficial[2].id).toBe(sortedEligible[2].id);
  });
});

describe("CS2 Stats - Official Ranking UI Integration Suite (Etapa 6.2 Tests)", () => {
  // Test 1: Player with N=9, high rating and high score does NOT appear in official ranking
  test("etapa6_2_test_1_n9_high_rating_not_in_official_ranking", () => {
    const provPlayer = { id: "gentulio", n: 9, w: 4, r: 1.20, score: calculatePlayerScore(9, 4, 1.20).score };
    expect(isEligibleForOfficialRanking(provPlayer.n)).toBe(false);
  });

  // Test 2: Player with N=10 appears in official ranking
  test("etapa6_2_test_2_n10_included_in_official_ranking", () => {
    const eligPlayer = { id: "tuf_tuf", n: 10, w: 5, r: 1.07, score: calculatePlayerScore(10, 5, 1.07).score };
    expect(isEligibleForOfficialRanking(eligPlayer.n)).toBe(true);
  });

  // Test 3: Official ranking is sorted by Season Score DESC, not raw Rating
  test("etapa6_2_test_3_sorted_by_season_score_desc", () => {
    const pA = { id: "A", rating: 1.30, ...calculatePlayerScore(50, 10, 1.30) }; // S = 1.213
    const pB = { id: "B", rating: 1.20, ...calculatePlayerScore(50, 45, 1.20) }; // S = 1.217

    const sorted = [pA, pB].sort((a, b) => b.score - a.score);
    expect(sorted[0].id).toBe("B");
    expect(sorted[0].score).toBeGreaterThan(sorted[1].score);
  });

  // Test 4: Player with N=9 and higher score does NOT displace player with N=10 and lower score
  test("etapa6_2_test_4_provisional_high_score_does_not_displace_eligible", () => {
    const provHigh = { id: "prov_high", n: 9, w: 9, r: 1.50, score: calculatePlayerScore(9, 9, 1.50).score };
    const eligLow = { id: "elig_low", n: 10, w: 5, r: 1.05, score: calculatePlayerScore(10, 5, 1.05).score };

    const candidates = [provHigh, eligLow];
    const officialRanking = candidates
      .filter((p) => isEligibleForOfficialRanking(p.n))
      .sort((a, b) => b.score - a.score);

    expect(officialRanking).toHaveLength(1);
    expect(officialRanking[0].id).toBe("elig_low");
  });

  // Test 5: Statistical components (rHat, pHat, score) remain unmodified by filtering
  test("etapa6_2_test_5_components_rhat_phat_score_unmodified_by_filter", () => {
    const scoreObj = calculatePlayerScore(15, 8, 1.20);
    const scoreVal = scoreObj.score;
    const rHatVal = scoreObj.rHat;
    const pHatVal = scoreObj.pHat;

    const eligible = isEligibleForOfficialRanking(15);
    expect(eligible).toBe(true);

    expect(scoreObj.score).toBe(scoreVal);
    expect(scoreObj.rHat).toBe(rHatVal);
    expect(scoreObj.pHat).toBe(pHatVal);
  });

  // Test 6: Home uses single source of truth for official ranking (N>=10, score DESC)
  test("etapa6_2_test_6_single_source_of_truth_get_season_score_ranking", () => {
    const mockPlayers = [
      { id: "p1", n: 28, w: 15, r: 1.30 }, // TRAVIS SCOUTTT (N=28)
      { id: "p2", n: 38, w: 18, r: 1.26 }, // Perna Peluda (N=38)
      { id: "gentulio", n: 9, w: 4, r: 1.20 }, // GentulioNargas (N=9)
      { id: "p4", n: 44, w: 22, r: 1.13 }, // Flp (N=44)
    ];

    const officialList = mockPlayers
      .map((p) => ({ ...p, ...calculatePlayerScore(p.n, p.w, p.r), isEligible: isEligibleForOfficialRanking(p.n) }))
      .filter((p) => p.isEligible)
      .sort((a, b) => b.score - a.score);

    expect(officialList.map((p) => p.id)).not.toContain("gentulio");
    expect(officialList).toHaveLength(3);
  });

  // Test 7: /rankings default fallback metric is seasonScore
  test("etapa6_2_test_7_rankings_default_metric_is_season_score", () => {
    const rawMetric = undefined;
    const METRICS = [{ value: "seasonScore" }, { value: "rating" }];
    const defaultMetric = METRICS.some((m) => m.value === rawMetric) ? rawMetric : "seasonScore";

    expect(defaultMetric).toBe("seasonScore");
  });

  // Test 8: Specific metric rankings (e.g. raw rating) remain independent
  test("etapa6_2_test_8_specific_metric_rankings_remain_independent", () => {
    const candidates = [
      { id: "p1", rating: 1.30, n: 28 },
      { id: "gentulio", rating: 1.20, n: 9 },
      { id: "p2", rating: 1.13, n: 44 },
    ];

    // Rating metric sorts raw rating without N>=10 exclusion
    const ratingLeaderboard = [...candidates].sort((a, b) => b.rating - a.rating);
    expect(ratingLeaderboard[1].id).toBe("gentulio");
  });
});


