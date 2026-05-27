export const getSparklinePath = (growth: string): string => {
  const cleanGrowth = growth.replace(/[^0-9.-]/g, '');
  const value = parseFloat(cleanGrowth);
  if (isNaN(value) || value === 0) return "M0 12.5 L 50 12.5"; // Neutral
  
  // Positive: Upward curve
  if (value > 0) return "M0 20 C 10 20, 20 5, 50 2"; 
  
  // Negative: Downward curve
  return "M0 2 C 10 2, 20 15, 50 23";
};