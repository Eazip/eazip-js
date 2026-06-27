const specifiers = [
  '@eazip/client',
  '@eazip/client/local',
  '@eazip/client/cloud',
  '@eazip/client/shared',
];

for (const specifier of specifiers) {
  try {
    await import(specifier);
  } catch (error) {
    console.error(`Failed to import ${specifier}`);
    throw error;
  }
}

console.log(`Validated ${specifiers.length} package imports.`);
