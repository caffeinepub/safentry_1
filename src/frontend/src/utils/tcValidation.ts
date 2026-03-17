/**
 * Official Turkish ID (TC Kimlik No) validation algorithm
 */
export function validateTcId(tc: string): boolean {
  if (!/^\d{11}$/.test(tc)) return false;
  if (tc[0] === "0") return false;
  const d = tc.split("").map(Number);
  // 10th digit: (sum of positions 1,3,5,7,9 * 7 - sum of positions 2,4,6,8) % 10
  const odds = d[0] + d[2] + d[4] + d[6] + d[8];
  const evens = d[1] + d[3] + d[5] + d[7];
  const tenth = (odds * 7 - evens) % 10;
  if (tenth < 0 ? tenth + 10 : tenth !== d[9]) return false;
  // 11th digit: sum of first 10 digits % 10
  const sumFirst10 = d.slice(0, 10).reduce((a, b) => a + b, 0);
  return sumFirst10 % 10 === d[10];
}
