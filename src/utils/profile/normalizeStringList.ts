const normalizeStringList = (values: string[]): string[] => {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))];
};

export default normalizeStringList;
