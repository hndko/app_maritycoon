export function getDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL ??
    'postgresql://maritycoon:maritycoon@localhost:5432/maritycoon'
  );
}
