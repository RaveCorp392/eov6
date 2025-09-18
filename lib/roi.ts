export type RoiInput = {
  agents: number;
  callsPerAgentPerDay: number;
  minutesSavedPerCall: number;
  costPerHour: number;
  workDaysPerYear: number;
};

export function computeRoi(i: RoiInput){
  const minutesSavedPerDay = i.agents * i.callsPerAgentPerDay * i.minutesSavedPerCall;
  const hoursSavedPerDay = minutesSavedPerDay / 60;
  const dailyValue = hoursSavedPerDay * i.costPerHour;
  const annualSavings = dailyValue * i.workDaysPerYear;
  return { minutesSavedPerDay, hoursSavedPerDay, dailyValue, annualSavings };
}
