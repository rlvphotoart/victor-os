export function reconcileIds(requirements: string, covered: string) {
  const parse = (value: string) =>
    value
      .split(/[\n\r,;\t]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  const all = parse(requirements);
  const evidence = parse(covered);
  if (!all.length) throw new Error("Enter at least one requirement ID.");
  const key = (value: string) => value.toLocaleUpperCase("en-US");
  const unique = (values: string[]) => [
    ...new Map(values.map((value) => [key(value), value])).values(),
  ];
  const allUnique = unique(all);
  const evidenceUnique = unique(evidence);
  const allKeys = new Set(allUnique.map(key));
  const evidenceKeys = new Set(evidenceUnique.map(key));
  const missing = allUnique.filter((value) => !evidenceKeys.has(key(value)));
  const unmatched = evidenceUnique.filter((value) => !allKeys.has(key(value)));
  const duplicates = (values: string[]) => {
    const counts = new Map<string, number>();
    for (const value of values)
      counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
    return unique(values).filter((value) => (counts.get(key(value)) ?? 0) > 1);
  };
  const list = (values: string[]) =>
    values.length ? values.join("\n") : "None";
  const coveredCount = allUnique.length - missing.length;
  return [
    `Coverage: ${coveredCount}/${allUnique.length} requirements (${Math.round((coveredCount / allUnique.length) * 100)}%)`,
    "Matching is case-insensitive; original ID spelling is preserved.",
    "",
    `MISSING TEST EVIDENCE (${missing.length})`,
    list(missing),
    "",
    `EVIDENCE WITHOUT REQUIREMENT (${unmatched.length})`,
    list(unmatched),
    "",
    `DUPLICATE REQUIREMENT IDS (${duplicates(all).length})`,
    list(duplicates(all)),
    "",
    `DUPLICATE EVIDENCE IDS (${duplicates(evidence).length})`,
    list(duplicates(evidence)),
  ].join("\n");
}
