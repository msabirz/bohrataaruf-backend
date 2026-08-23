// Web port of the mobile app's height helper (BohraTaaruf/src/lib/height.ts)
// — same picker range and default, kept in sync intentionally. Picker's
// primary unit is feet/inches (product decision), backend contract stores/
// reads integer centimeters (heightCm, 100–250, nullable).

export interface FeetInches {
  feet: number;
  inches: number;
}

const CM_PER_INCH = 2.54;

export function feetInchesToCm(feet: number, inches: number): number {
  return Math.round((feet * 12 + inches) * CM_PER_INCH);
}

export function cmToFeetInches(cm: number): FeetInches {
  const totalInches = Math.round(cm / CM_PER_INCH);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

export function formatFeetInches({ feet, inches }: FeetInches): string {
  return `${feet}'${inches}"`;
}

// Realistic adult height range, one chip per whole inch: 4'6" (137cm) to
// 7'0" (213cm) — comfortably inside the backend's 100-250 validated range.
export const HEIGHT_PICKER_OPTIONS: { feet: number; inches: number; cm: number; label: string }[] = (() => {
  const options = [];
  for (let totalInches = 4 * 12 + 6; totalInches <= 7 * 12; totalInches++) {
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    options.push({ feet, inches, cm: feetInchesToCm(feet, inches), label: formatFeetInches({ feet, inches }) });
  }
  return options;
})();

export const DEFAULT_HEIGHT_CM = feetInchesToCm(5, 6); // 5'6" -> 168cm

/** Snaps an arbitrary stored cm value to the nearest picker option's cm. */
export function nearestHeightOptionCm(cm: number): number {
  let closest = HEIGHT_PICKER_OPTIONS[0];
  let closestDiff = Math.abs(HEIGHT_PICKER_OPTIONS[0].cm - cm);
  for (const opt of HEIGHT_PICKER_OPTIONS) {
    const diff = Math.abs(opt.cm - cm);
    if (diff < closestDiff) {
      closest = opt;
      closestDiff = diff;
    }
  }
  return closest.cm;
}
