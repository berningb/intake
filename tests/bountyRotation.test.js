import { describe, it, expect } from 'vitest';
import { getDailyMissions, ALL_MISSIONS, CORE_MISSION_IDS } from '../src/utils/missionUtils';

describe('Bounty Rotation Logic', () => {
  const mockUserData = {
    preferences: { waterTarget: 2500 },
    dailyMetrics: { calories: 2000, protein: 150, carbs: 250, fat: 80 }
  };
  const mockLedger = { foods: [], water: 0, activities: [], completedMissions: [] };
  const mockTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

  it('should always include core missions', () => {
    const missions = getDailyMissions('2025-12-30', 'user-1', mockUserData, mockLedger, mockTotals);
    const missionIds = missions.map(m => m.id);
    
    CORE_MISSION_IDS.forEach(id => {
      expect(missionIds).toContain(id);
    });
  });

  it('should return 8 missions total (3 core + 5 rotation)', () => {
    const missions = getDailyMissions('2025-12-30', 'user-1', mockUserData, mockLedger, mockTotals);
    expect(missions.length).toBe(8);
  });

  it('should give different rotation missions for different days', () => {
    const missionsDay1 = getDailyMissions('2025-12-30', 'user-1', mockUserData, mockLedger, mockTotals);
    const missionsDay2 = getDailyMissions('2025-12-31', 'user-1', mockUserData, mockLedger, mockTotals);
    
    const rotationIds1 = missionsDay1.filter(m => !CORE_MISSION_IDS.includes(m.id)).map(m => m.id);
    const rotationIds2 = missionsDay2.filter(m => !CORE_MISSION_IDS.includes(m.id)).map(m => m.id);
    
    expect(rotationIds1).not.toEqual(rotationIds2);
  });

  it('should give different rotation missions for different users on the same day', () => {
    const missionsUser1 = getDailyMissions('2025-12-30', 'user-1', mockUserData, mockLedger, mockTotals);
    const missionsUser2 = getDailyMissions('2025-12-30', 'user-2', mockUserData, mockLedger, mockTotals);
    
    const rotationIds1 = missionsUser1.filter(m => !CORE_MISSION_IDS.includes(m.id)).map(m => m.id);
    const rotationIds2 = missionsUser2.filter(m => !CORE_MISSION_IDS.includes(m.id)).map(m => m.id);
    
    expect(rotationIds1).not.toEqual(rotationIds2);
  });

  it('should be deterministic for the same day and user', () => {
    const missions1 = getDailyMissions('2025-12-30', 'user-1', mockUserData, mockLedger, mockTotals);
    const missions2 = getDailyMissions('2025-12-30', 'user-1', mockUserData, mockLedger, mockTotals);
    
    expect(missions1).toEqual(missions2);
  });
});

