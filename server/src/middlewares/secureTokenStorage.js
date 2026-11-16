const setSecureTokens = (req, res, next) => {
  if (!res.locals.userData) {
    return next();
  }

  const { accessToken, refreshToken } = res.locals.userData;

  console.log('Setting HttpOnly cookies:', {
    accessToken: accessToken ? 'SET' : 'MISSING',
    refreshToken: refreshToken ? 'SET' : 'MISSING'
  });

  const devCookieOptions = {
    httpOnly: true,
    secure: false,        
    sameSite: "lax",
    maxAge: 6 * 60 * 60 * 1000,
    path : '/',
  };

  const devRefreshOptions = {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path : '/',
  };

  const prodCookieOptions = {
    httpOnly: true,
    secure: true,        
    sameSite: "none",    
    maxAge: 6 * 60 * 60 * 1000,
  };

  const prodRefreshOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  // Secure cookies require HTTPS. Over plain HTTP (LAN/intranet) they must be
  // non-secure or the browser drops them. Driven by COOKIE_SECURE, not NODE_ENV.
  const useSecure = process.env.COOKIE_SECURE === "true";

  const accessOptions = useSecure ? prodCookieOptions : devCookieOptions;
  const refreshOptions = useSecure ? prodRefreshOptions : devRefreshOptions;

  res.cookie("accessToken", accessToken, accessOptions);
  res.cookie("refreshToken", refreshToken, refreshOptions);

  const responseData = { ...res.locals.userData };
  delete responseData.accessToken;
  delete responseData.refreshToken;

  res.json(responseData);
};

const clearSecureTokens = (req, res, next) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  next();
};

module.exports = {
  setSecureTokens,
  clearSecureTokens,
};
