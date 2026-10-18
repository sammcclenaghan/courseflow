export function parseCode(code: string) {
  const match = /^([A-Z]+(?:-[A-Z]+)?)(\d{3}[A-Z]?)$/.exec(code);
  if (!match) throw new Error(`Unexpected course code: ${code}`);
  return { subject: match[1], number: match[2] };
}

export function displayCode(code: string) {
  const { subject, number } = parseCode(code);
  return `${subject} ${number}`;
}
