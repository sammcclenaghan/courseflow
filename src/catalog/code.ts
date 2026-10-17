/** "CSC110" → CSC + 110, "ED-D101" → ED-D + 101, "ENSH347P" → ENSH + 347P. */
export function parseCode(code: string) {
  const match = /^([A-Z]+(?:-[A-Z]+)?)(\d{3}[A-Z]?)$/.exec(code);
  if (!match) throw new Error(`Unexpected course code: ${code}`);
  return { subject: match[1], number: match[2] };
}

/** "CSC110" → "CSC 110" */
export function displayCode(code: string) {
  const { subject, number } = parseCode(code);
  return `${subject} ${number}`;
}
