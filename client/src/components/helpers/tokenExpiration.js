export const isTokenExpired = (expUnix) => {
  // if (!expUnix) return true;
  // return Date.now() >= expUnix * 1000;
  if (!expUnix) return true;
  const expMs = expUnix < 1e12 ? expUnix * 1000 : expUnix;
  return Date.now() >= expMs;
};
